import { track } from '../../src/services/tracking';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { routeDistanceKm } from '../../src/features/location/route';
import { RoutePreview } from '../../src/components/workouts/RoutePreview';
import { PrivateWorkoutImage } from '../../src/components/workouts/PrivateWorkoutImage';
import { uploadWorkoutImage } from '../../src/services/media';
import { AppButton, AppInput, AppText, Card, Chip, ErrorState, LoadingState, Screen, ScreenHeader } from '../../src/components/ui';
import { offerOpenSettings, showError } from '../../src/components/ui/dialogs';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { workoutsApi } from '../../src/services/api';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { createWorkout, updateWorkout } from '../../src/store/workoutsSlice';
import { workoutTypes } from '../../src/types';
import type { Coords, Workout, WorkoutType } from '../../src/types';
import { addDays, toLocalISODate } from '../../src/utils/date';
import { errorMessage } from '../../src/utils/format';
import { parseWorkoutForm } from '../../src/utils/validation';
import type { Errors, WorkoutField } from '../../src/utils/validation';
import { AppButton, AppInput, AppText, Card, Chip, DatePickerField, ErrorState, LoadingState, Screen, ScreenHeader } from '../../src/components/ui';

export default function WorkoutFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const dispatch = useAppDispatch();
  const { colors } = useAppTheme();
  const stored = useAppSelector(s => (id ? s.workouts.all.find(w => w.id === id) : undefined));
  const [fetched, setFetched] = useState<Workout | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const source = stored ?? fetched;
  const populated = useRef(false);

  const today = toLocalISODate(new Date());
  const [title, setTitle] = useState('');
  const [type, setType] = useState<WorkoutType>('Chạy bộ');
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<Coords | undefined>();
  const [route, setRoute] = useState<Coords[]>([]);
  const [tracking, setTracking] = useState(false);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors<WorkoutField>>({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!id || stored) return;
    let cancelled = false;
    workoutsApi.get(id).then(w => !cancelled && setFetched(w)).catch(e => !cancelled && setLoadError(errorMessage(e)));
    return () => {
      cancelled = true;
    };
  }, [id, stored, attempt]);

  // Điền sẵn dữ liệu khi sửa (một lần duy nhất để không ghi đè nội dung người dùng đang gõ).
  useEffect(() => {
    if (!source || populated.current) return;
    populated.current = true;
    setTitle(source.title);
    setType(source.type);
    setDate(source.date);
    setDuration(String(source.duration));
    setDistance(source.distance > 0 ? String(source.distance) : '');
    setCalories(source.calories !== undefined ? String(source.calories) : '');
    setNote(source.note ?? '');
    setLocation(source.location ?? '');
    setCoords(source.coords);
    setRoute(source.route ?? []);
    setImage(source.image ?? null);
  }, [source]);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        offerOpenSettings('Cần quyền truy cập ảnh', 'Hãy cho phép FitLog truy cập thư viện ảnh để đính kèm ảnh buổi tập.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (!res.canceled && res.assets[0]) setImage(res.assets[0].uri);
    } catch (e) {
      showError('Không chọn được ảnh', errorMessage(e));
    }
  };

  const takePhoto = async () => {
  try {
    // Trên Web: sử dụng trình chọn ảnh.
    if (Platform.OS === 'web') {
      await pickImage();
      return;
    }

    // Trên Android/iOS: mở camera thật.
    const perm = await ImagePicker.requestCameraPermissionsAsync();

    if (!perm.granted) {
      offerOpenSettings(
        'Cần quyền Camera',
        'Hãy cho phép FitLog sử dụng Camera.'
      );
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6
    });

    if (!res.canceled && res.assets[0]) {
      setImage(res.assets[0].uri);
    }
  } catch (e) {
    showError('Không chụp được ảnh', errorMessage(e));
  }
};

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        offerOpenSettings('Cần quyền vị trí', 'Hãy cho phép FitLog dùng vị trí để ghi địa điểm tập.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(c);
      let label = '';
      try {
        const [place] = await Location.reverseGeocodeAsync(c);
        label = [place?.name ?? place?.street, place?.district ?? place?.subregion, place?.city ?? place?.region].filter(Boolean).join(', ');
      } catch {
        /* không có dịch vụ geocode: dùng toạ độ */
      }
      setLocation(label || `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`);
    } catch (e) {
      showError('Không lấy được vị trí', errorMessage(e));
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => () => { subscription.current?.remove(); subscription.current = null; }, []);
  const startRoute = async () => {
    try {
      const perm=await Location.requestForegroundPermissionsAsync();
      if(!perm.granted){offerOpenSettings('Cần quyền vị trí','FitLog cần quyền vị trí khi ứng dụng mở để ghi tuyến đường.');return;}
      setRoute([]);
      const watch=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,distanceInterval:10,timeInterval:5000},loc=>{
        if(loc.coords.accuracy !== null && loc.coords.accuracy > 60) return;
        const p={latitude:loc.coords.latitude,longitude:loc.coords.longitude};
        setCoords(p);
        setRoute(prev=>{
          if(prev.length>=1000)return prev;
          if(prev.length && routeDistanceKm([prev[prev.length-1],p])<0.005)return prev;
          return [...prev,p];
        });
      });
      subscription.current=watch;
      setTracking(true);
    }catch(e){showError('Không theo dõi được GPS',errorMessage(e));}
  };
  const stopRoute = () => {
    subscription.current?.remove();subscription.current=null;setTracking(false);
    if(route.length>1)setDistance(routeDistanceKm(route).toFixed(2));
  };

  const onSave = async () => {
    if (saving) return;
    const parsed = parseWorkoutForm({ title, type, date, duration, distance, calories, note, location }, toLocalISODate(new Date()));
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    if (tracking) { showError('Đang ghi tuyến GPS', 'Vui lòng dừng theo dõi rồi lưu buổi tập.'); return; }
    setErrors({});
    setSaving(true);
    try {
      const savedImage = image && !image.startsWith('/media/') ? await uploadWorkoutImage(image) : image;
      const input = { ...parsed.value, image: savedImage, coords: location.trim() ? coords : undefined, route, createdAt: source?.createdAt };
      if (editing && id) await dispatch(updateWorkout({ id, input })).unwrap();
      else { await dispatch(createWorkout(input)).unwrap(); void track('workout_created','workouts'); }
      router.back();
    } catch (e) {
      // Giữ nguyên dữ liệu đã nhập để người dùng thử lưu lại.
      showError('Không lưu được buổi tập', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const waiting = editing && !source && !loadError;

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <ScreenHeader back title={editing ? 'Sửa buổi tập' : 'Ghi buổi tập'} />
      {waiting ? <LoadingState /> : null}
      {loadError ? <ErrorState message={loadError} onRetry={() => { setLoadError(null); setAttempt(a => a + 1); }} /> : null}
      {!waiting && !loadError ? (
        <>
          <AppInput label="Tên buổi tập" required value={title} onChangeText={setTitle} placeholder="Ví dụ: Chạy bộ buổi sáng" error={errors.title} maxLength={80} />

          <View style={{ gap: 8 }}>
            <AppText weight="bold" size="sm">Loại hoạt động</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
              {workoutTypes.map(t => <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />)}
            </ScrollView>
          </View>

          <View style={{ gap: 8 }}>
            <DatePickerField label="Ngày tập" required value={date} onChange={setDate} maxDate={today} error={errors.date} />            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label="Hôm nay" selected={date === today} onPress={() => setDate(today)} />
              <Chip label="Hôm qua" selected={date === addDays(today, -1)} onPress={() => setDate(addDays(today, -1))} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppInput label="Thời lượng (phút)" required value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="30" error={errors.duration} maxLength={4} />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput label="Quãng đường (km)" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="Để trống nếu không có" error={errors.distance} maxLength={7} />
            </View>
          </View>
          <AppInput label="Calories (kcal)" value={calories} onChangeText={setCalories} keyboardType="number-pad" placeholder="Tuỳ chọn" hint="Chỉ nhập khi bạn biết con số. FitLog không tự ước tính." error={errors.calories} maxLength={5} />
          <AppInput label="Ghi chú" value={note} onChangeText={setNote} multiline placeholder="Cảm nhận, bài tập, ..." maxLength={500} />

          <Card>
            <AppInput label="Địa điểm" value={location} onChangeText={t => { setLocation(t); if (!t.trim()) setCoords(undefined); }} placeholder="Nhập hoặc lấy vị trí hiện tại" maxLength={120} />
            <AppButton label="Lấy vị trí hiện tại" icon="locate" variant="secondary" size="sm" loading={locating} onPress={useCurrentLocation} />
          </Card>

          <Card>
            <AppText weight="bold">Theo dõi tuyến GPS (chỉ khi mở ứng dụng)</AppText>
            <AppText tone="muted" size="xs">Chỉ bắt đầu khi bạn bấm nút. Không thu thập GPS khi chạy nền. Có thể tiêu hao pin.</AppText>
            <AppButton label={tracking ? 'Dừng theo dõi tuyến' : 'Bắt đầu theo dõi GPS'} icon={tracking ? 'stop-circle-outline' : 'navigate-outline'}
              variant="secondary" onPress={tracking ? stopRoute : () => void startRoute()} />
            {coords || route.length > 0 ? <RoutePreview route={route} currentLocation={coords} tracking={tracking} /> : null}
            {route.length > 0 && !tracking ? <AppButton label="Xóa tuyến đã ghi" variant="ghost" icon="trash-outline" onPress={() => setRoute([])} /> : null}
          </Card>

          <Card>
            <AppText weight="bold">Ảnh buổi tập</AppText>
            {image ? <PrivateWorkoutImage image={image} label="Ảnh đã chọn" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: colors.borderColor }} /> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AppButton label={image ? 'Đổi ảnh' : 'Chọn ảnh'} icon="image-outline" variant="secondary" size="sm" onPress={pickImage} />
              <AppButton label={Platform.OS === 'web' ? 'Chọn ảnh từ máy' : 'Chụp ảnh'} icon="camera-outline" variant="secondary" size="sm" onPress={takePhoto} />
              {image ? <AppButton label="Bỏ ảnh" icon="close" variant="ghost" size="sm" onPress={() => setImage(null)} /> : null}
            </View>
            <AppText tone="muted" size="xs">Ảnh được upload riêng tư lên máy chủ và chỉ tài khoản của bạn xem được. Ảnh tối đa 5MB, JPG/PNG.</AppText>
          </Card>

          <AppButton label={editing ? 'Lưu thay đổi' : 'Lưu buổi tập'} icon="checkmark" fullWidth loading={saving} onPress={onSave} />
        </>
      ) : null}
    </Screen>
  );
}
