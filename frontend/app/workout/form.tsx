import { track } from "../../src/services/tracking";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { routeDistanceKm } from "../../src/features/location/route";
import { RoutePreview } from "../../src/components/workouts/RoutePreview";
import { PrivateWorkoutImage } from "../../src/components/workouts/PrivateWorkoutImage";
import { uploadWorkoutImage } from "../../src/services/media";
import {
  AppButton,
  AppInput,
  AppText,
  Card,
  Chip,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
} from "../../src/components/ui";
import { offerOpenSettings, showError } from "../../src/components/ui/dialogs";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { workoutsApi } from "../../src/services/api";
import { useAppDispatch, useAppSelector } from "../../src/store/hooks";
import { createWorkout, updateWorkout } from "../../src/store/workoutsSlice";
import { workoutTypes } from "../../src/types";
import type { Coords, Workout, WorkoutType } from "../../src/types";
import { addDays, toLocalISODate } from "../../src/utils/date";
import { errorMessage } from "../../src/utils/format";
import { parseWorkoutForm } from "../../src/utils/validation";
import type { Errors, WorkoutField } from "../../src/utils/validation";

// 1. Định mức Calo cơ bản mỗi phút (kcal/phút)
const BASE_CALORIES_PER_MINUTE: Record<string, number> = {
  "Chạy bộ": 8.0,
  "Đạp xe": 6.0,
  Gym: 7.0,
  Khác: 5.0,
  "Đi bộ": 3.5,
  Yoga: 3.5,
};

// 2. Các mức vận tốc gợi ý (Chậm / Vừa / Nhanh) cho từng môn di chuyển
const SPEED_PRESETS: Record<string, { label: string; value: string }[]> = {
  "Chạy bộ": [
    { label: "Nhẹ (7 km/h)", value: "7" },
    { label: "Vừa (9 km/h)", value: "9" },
    { label: "Nhanh (12 km/h)", value: "12" },
  ],
  "Đạp xe": [
    { label: "Chậm (12 km/h)", value: "12" },
    { label: "Vừa (18 km/h)", value: "18" },
    { label: "Nhanh (25 km/h)", value: "25" },
  ],
  "Đi bộ": [
    { label: "Dạo (4 km/h)", value: "4" },
    { label: "Vừa (5 km/h)", value: "5" },
    { label: "Nhanh (6.5 km/h)", value: "6.5" },
  ],
};

// Vận tốc mặc định ban đầu (mức Vừa)
const DEFAULT_SPEED_KMH: Record<string, string> = {
  "Chạy bộ": "9",
  "Đạp xe": "18",
  "Đi bộ": "5",
};

// 3. Hệ số điều chỉnh theo mục tiêu người dùng
const GOAL_MULTIPLIER: Record<string, number> = {
  LOSE_WEIGHT: 1.1, // Giảm cân / Đốt mỡ
  GAIN_MUSCLE: 1.05, // Tăng cơ
  MAINTAIN: 1.0, // Giữ dáng
};

// 4. Các hoạt động có vận tốc & quãng đường
const SPEED_ACTIVITIES: WorkoutType[] = ["Chạy bộ", "Đạp xe", "Đi bộ"];

export default function WorkoutFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const stored = useAppSelector((s) =>
    id ? s.workouts.all.find((w) => w.id === id) : undefined,
  );

  // Lấy thông tin Mục tiêu hiện tại từ Redux Store
  const activeGoal = useAppSelector(
    (s) => (s as any).goals?.current || (s as any).goals?.items?.[0],
  );
  const goalType = activeGoal?.goalType || activeGoal?.type || "MAINTAIN";

  const [fetched, setFetched] = useState<Workout | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const source = stored ?? fetched;
  const populated = useRef(false);

  const today = toLocalISODate(new Date());
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WorkoutType>("Chạy bộ");
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState("30");
  const [speed, setSpeed] = useState(DEFAULT_SPEED_KMH["Chạy bộ"]);
  const [distance, setDistance] = useState("");
  const [calories, setCalories] = useState("");
  const [isManualCalories, setIsManualCalories] = useState(false);
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<Coords | undefined>();
  const [route, setRoute] = useState<Coords[]>([]);
  const [tracking, setTracking] = useState(false);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors<WorkoutField>>({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Kiểm tra loại hoạt động hiện tại có hiển thị Vận tốc, Quãng đường & GPS hay không
  const hasSpeedAndDistance = SPEED_ACTIVITIES.includes(type);
  const currentPresets = SPEED_PRESETS[type] || [];

  useEffect(() => {
    if (!id || stored) return;
    let cancelled = false;
    workoutsApi
      .get(id)
      .then((w) => !cancelled && setFetched(w))
      .catch((e) => !cancelled && setLoadError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [id, stored, attempt]);

  // Điền sẵn dữ liệu khi sửa (tự suy ngược vận tốc từ quãng đường & thời lượng cũ)
  useEffect(() => {
    if (!source || populated.current) return;
    populated.current = true;
    setTitle(source.title);
    setType(source.type);
    setDate(source.date);
    setDuration(String(source.duration));

    if (
      SPEED_ACTIVITIES.includes(source.type) &&
      source.distance > 0 &&
      source.duration > 0
    ) {
      setDistance(String(source.distance));
      const calcSpeed = source.distance / (source.duration / 60);
      setSpeed(
        Number.isInteger(calcSpeed) ? String(calcSpeed) : calcSpeed.toFixed(1),
      );
    } else {
      setDistance("");
      setSpeed(DEFAULT_SPEED_KMH[source.type] || "");
    }

    if (source.calories !== undefined) {
      setCalories(String(source.calories));
      setIsManualCalories(true);
    }
    setNote(source.note ?? "");
    setLocation(source.location ?? "");
    setCoords(source.coords);
    setRoute(source.route ?? []);
    setImage(source.image ?? null);
  }, [source]);

  // Đổi loại hoạt động:
  // - Nếu chọn Chạy bộ/Đạp xe/Đi bộ -> gợi ý vận tốc mức Vừa tương ứng
  // - Nếu chọn Gym/Yoga/Khác -> ẩn và xóa sạch vận tốc, quãng đường, GPS
  const handleSelectType = (newType: WorkoutType) => {
    setType(newType);
    if (SPEED_ACTIVITIES.includes(newType)) {
      setSpeed(DEFAULT_SPEED_KMH[newType] || "8");
    } else {
      setSpeed("");
      setDistance("");
      if (tracking) {
        subscription.current?.remove();
        subscription.current = null;
        setTracking(false);
      }
      setRoute([]);
    }
  };

  // Tự động tính Quãng đường (km) và Calories (kcal) từ Thời lượng + Vận tốc + Mục tiêu
  useEffect(() => {
    const mins = parseFloat(duration) || 0;
    const spd = hasSpeedAndDistance ? parseFloat(speed) || 0 : 0;

    // 1. Tự tính Quãng đường = Vận tốc (km/h) * (Phút / 60)
    if (hasSpeedAndDistance && mins > 0 && spd > 0) {
      const calcDist = spd * (mins / 60);
      setDistance(calcDist.toFixed(2));
    } else {
      setDistance("");
    }

    // 2. Tự tính Calories (nếu user không tự sửa tay)
    if (isManualCalories) return;

    if (mins <= 0) {
      setCalories("");
      return;
    }

    const baseRate = BASE_CALORIES_PER_MINUTE[type] || 5.0;
    const speedFactor = hasSpeedAndDistance && spd > 0 ? 1 + spd / 15 : 1.0;
    const goalFactor = GOAL_MULTIPLIER[goalType] || 1.0;

    const estimatedKcal = mins * baseRate * speedFactor * goalFactor;
    setCalories(String(Math.round(estimatedKcal)));
  }, [type, duration, speed, goalType, hasSpeedAndDistance, isManualCalories]);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        offerOpenSettings(
          "Cần quyền truy cập ảnh",
          "Hãy cho phép FitLog truy cập thư viện ảnh để đính kèm ảnh buổi tập.",
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.6,
      });
      if (!res.canceled && res.assets[0]) setImage(res.assets[0].uri);
    } catch (e) {
      showError("Không chọn được ảnh", errorMessage(e));
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS === "web") {
        await pickImage();
        return;
      }
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        offerOpenSettings(
          "Cần quyền Camera",
          "Hãy cho phép FitLog sử dụng Camera.",
        );
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.6,
      });
      if (!res.canceled && res.assets[0]) {
        setImage(res.assets[0].uri);
      }
    } catch (e) {
      showError("Không chụp được ảnh", errorMessage(e));
    }
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        offerOpenSettings(
          "Cần quyền vị trí",
          "Hãy cho phép FitLog dùng vị trí để ghi địa điểm tập.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const c = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setCoords(c);
      let label = "";
      try {
        const [place] = await Location.reverseGeocodeAsync(c);
        label = [
          place?.name ?? place?.street,
          place?.district ?? place?.subregion,
          place?.city ?? place?.region,
        ]
          .filter(Boolean)
          .join(", ");
      } catch {
        /* không có dịch vụ geocode: dùng toạ độ */
      }
      setLocation(
        label || `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`,
      );
    } catch (e) {
      showError("Không lấy được vị trí", errorMessage(e));
    } finally {
      setLocating(false);
    }
  };

  useEffect(
    () => () => {
      subscription.current?.remove();
      subscription.current = null;
    },
    [],
  );
  const startRoute = async () => {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        offerOpenSettings(
          "Cần quyền vị trí",
          "FitLog cần quyền vị trí khi ứng dụng mở để ghi tuyến đường.",
        );
        return;
      }
      setRoute([]);
      const watch = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (loc) => {
          if (loc.coords.accuracy !== null && loc.coords.accuracy > 60) return;
          const p = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setRoute((prev) => {
            if (prev.length >= 1000) return prev;
            if (
              prev.length &&
              routeDistanceKm([prev[prev.length - 1], p]) < 0.005
            )
              return prev;
            return [...prev, p];
          });
        },
      );
      subscription.current = watch;
      setTracking(true);
    } catch (e) {
      showError("Không theo dõi được GPS", errorMessage(e));
    }
  };

  // Khi dừng GPS: tính quãng đường thực tế và suy ngược lại vận tốc trung bình
  const stopRoute = () => {
    subscription.current?.remove();
    subscription.current = null;
    setTracking(false);
    if (route.length > 1) {
      const gpsKm = routeDistanceKm(route);
      setDistance(gpsKm.toFixed(2));
      const mins = parseFloat(duration) || 0;
      if (mins > 0) {
        setSpeed((gpsKm / (mins / 60)).toFixed(1));
      }
    }
  };

  const onSave = async () => {
    if (saving) return;
    const effectiveDistance = hasSpeedAndDistance ? distance : "";
    const parsed = parseWorkoutForm(
      {
        title,
        type,
        date,
        duration,
        distance: effectiveDistance,
        calories,
        note,
        location,
      },
      toLocalISODate(new Date()),
    );
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    if (tracking) {
      showError(
        "Đang ghi tuyến GPS",
        "Vui lòng dừng theo dõi rồi lưu buổi tập.",
      );
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const savedImage =
        image && !image.startsWith("/media/")
          ? await uploadWorkoutImage(image)
          : image;
      const input = {
        ...parsed.value,
        image: savedImage,
        coords: location.trim() ? coords : undefined,
        route: hasSpeedAndDistance ? route : [],
        createdAt: source?.createdAt,
      };
      if (editing && id) await dispatch(updateWorkout({ id, input })).unwrap();
      else {
        await dispatch(createWorkout(input)).unwrap();
        void track("workout_created", "workouts");
      }
      router.back();
    } catch (e) {
      showError("Không lưu được buổi tập", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const waiting = editing && !source && !loadError;

  return (
    <Screen keyboard edges={["top", "bottom"]}>
      <ScreenHeader back title={editing ? "Sửa buổi tập" : "Ghi buổi tập"} />
      {waiting ? <LoadingState /> : null}
      {loadError ? (
        <ErrorState
          message={loadError}
          onRetry={() => {
            setLoadError(null);
            setAttempt((a) => a + 1);
          }}
        />
      ) : null}
      {!waiting && !loadError ? (
        <>
          <AppInput
            label="Tên buổi tập"
            required
            value={title}
            onChangeText={setTitle}
            placeholder="Ví dụ: Chạy bộ buổi sáng"
            error={errors.title}
            maxLength={80}
          />

          <View style={{ gap: 8 }}>
            <AppText weight="bold" size="sm">
              Loại hoạt động
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {workoutTypes.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={type === t}
                  onPress={() => handleSelectType(t)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: 8 }}>
            <AppInput
              label="Ngày tập (YYYY-MM-DD)"
              required
              value={date}
              onChangeText={setDate}
              placeholder="2026-10-28"
              keyboardType="numbers-and-punctuation"
              error={errors.date}
              maxLength={10}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Chip
                label="Hôm nay"
                selected={date === today}
                onPress={() => setDate(today)}
              />
              <Chip
                label="Hôm qua"
                selected={date === addDays(today, -1)}
                onPress={() => setDate(addDays(today, -1))}
              />
            </View>
          </View>

          {/* Hàng 1: Thời lượng & Vận tốc (ẩn Vận tốc nếu là Gym/Yoga/Khác) */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="Thời lượng (phút)"
                  required
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  placeholder="30"
                  error={errors.duration}
                  maxLength={4}
                />
              </View>
              {hasSpeedAndDistance ? (
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Vận tốc TB (km/h)"
                    value={speed}
                    onChangeText={setSpeed}
                    keyboardType="decimal-pad"
                    placeholder="9"
                    maxLength={5}
                  />
                </View>
              ) : null}
            </View>

            {/* Các nút chọn nhanh mức độ Chậm / Vừa / Nhanh */}
            {hasSpeedAndDistance && currentPresets.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                {currentPresets.map((preset) => (
                  <Chip
                    key={preset.label}
                    label={preset.label}
                    selected={speed === preset.value}
                    onPress={() => setSpeed(preset.value)}
                  />
                ))}
              </ScrollView>
            ) : null}
          </View>

          {/* Hàng 2: Quãng đường tự động tính (chỉ hiện với Chạy bộ, Đạp xe, Đi bộ) */}
          {hasSpeedAndDistance ? (
            <AppInput
              label="Quãng đường ước tính (km)"
              value={distance}
              onChangeText={setDistance}
              keyboardType="decimal-pad"
              placeholder="Tự tính từ thời lượng × vận tốc"
              hint="Tự động tính = Vận tốc × (Thời lượng / 60)."
              error={errors.distance}
              maxLength={7}
            />
          ) : null}

          <AppInput
            label="Calories (kcal)"
            value={calories}
            onChangeText={(val) => {
              setIsManualCalories(val.trim().length > 0);
              setCalories(val);
            }}
            keyboardType="number-pad"
            placeholder="Tự động tính theo thời lượng & mục tiêu"
            hint="Tự động ước tính theo cường độ & mục tiêu của bạn (có thể tự sửa lại)."
            error={errors.calories}
            maxLength={5}
          />

          <AppInput
            label="Ghi chú"
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Cảm nhận, bài tập, ..."
            maxLength={500}
          />

          <Card>
            <AppInput
              label="Địa điểm"
              value={location}
              onChangeText={(t) => {
                setLocation(t);
                if (!t.trim()) setCoords(undefined);
              }}
              placeholder="Nhập hoặc lấy vị trí hiện tại"
              maxLength={120}
            />
            <AppButton
              label="Lấy vị trí hiện tại"
              icon="locate"
              variant="secondary"
              size="sm"
              loading={locating}
              onPress={useCurrentLocation}
            />
          </Card>

          {hasSpeedAndDistance ? (
            <Card>
              <AppText weight="bold">
                Theo dõi tuyến GPS (chỉ khi mở ứng dụng)
              </AppText>
              <AppText tone="muted" size="xs">
                Chỉ bắt đầu khi bạn bấm nút. Không thu thập GPS khi chạy nền. Có
                thể tiêu hao pin.
              </AppText>
              <AppButton
                label={
                  tracking ? "Dừng theo dõi tuyến" : "Bắt đầu theo dõi GPS"
                }
                icon={tracking ? "stop-circle-outline" : "navigate-outline"}
                variant="secondary"
                onPress={tracking ? stopRoute : () => void startRoute()}
              />
              {route.length > 0 ? <RoutePreview route={route} /> : null}
              {route.length > 0 && !tracking ? (
                <AppButton
                  label="Xóa tuyến đã ghi"
                  variant="ghost"
                  icon="trash-outline"
                  onPress={() => setRoute([])}
                />
              ) : null}
            </Card>
          ) : null}

          <Card>
            <AppText weight="bold">Ảnh buổi tập</AppText>
            {image ? (
              <PrivateWorkoutImage
                image={image}
                label="Ảnh đã chọn"
                style={{
                  width: "100%",
                  aspectRatio: 4 / 3,
                  borderRadius: 14,
                  backgroundColor: colors.borderColor,
                }}
              />
            ) : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <AppButton
                label={image ? "Đổi ảnh" : "Chọn ảnh"}
                icon="image-outline"
                variant="secondary"
                size="sm"
                onPress={pickImage}
              />
              <AppButton
                label={Platform.OS === "web" ? "Chọn ảnh từ máy" : "Chụp ảnh"}
                icon="camera-outline"
                variant="secondary"
                size="sm"
                onPress={takePhoto}
              />
              {image ? (
                <AppButton
                  label="Bỏ ảnh"
                  icon="close"
                  variant="ghost"
                  size="sm"
                  onPress={() => setImage(null)}
                />
              ) : null}
            </View>
            <AppText tone="muted" size="xs">
              Ảnh được upload riêng tư lên máy chủ và chỉ tài khoản của bạn xem
              được. Ảnh tối đa 5MB, JPG/PNG.
            </AppText>
          </Card>

          <AppButton
            label={editing ? "Lưu thay đổi" : "Lưu buổi tập"}
            icon="checkmark"
            fullWidth
            loading={saving}
            onPress={onSave}
          />
        </>
      ) : null}
    </Screen>
  );
}
