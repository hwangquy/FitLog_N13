export const workoutTypes = ['Chạy bộ', 'Gym', 'Đạp xe', 'Đi bộ', 'Yoga', 'Khác'] as const;
export type WorkoutType = (typeof workoutTypes)[number];

export type Coords = { latitude: number; longitude: number };

export type Workout = {
  id: string;
  title: string;
  type: WorkoutType;
  /** Ngày tập theo giờ địa phương, định dạng YYYY-MM-DD. */
  date: string;
  /** Phút. */
  duration: number;
  /** Km. 0 nếu không áp dụng. */
  distance: number;
  /** Chỉ có khi người dùng tự nhập. Không tự ước tính. */
  calories?: number;
  note?: string;
  location?: string;
  coords?: Coords;
  /** Các điểm GPS thu được khi người dùng chủ động theo dõi ở foreground. */
  route?: Coords[];
  /** Đường dẫn ảnh riêng tư /media/<id> (lấy qua token của chủ sở hữu). */
  image?: string | null;
  createdAt?: string;
};
export type WorkoutInput = Omit<Workout, 'id'>;

export const goalMetrics = ['sessions', 'minutes', 'distance', 'calories'] as const;
export type GoalMetric = (typeof goalMetrics)[number];
export const goalPeriods = ['week', 'month'] as const;
export type GoalPeriod = (typeof goalPeriods)[number];

export type Goal = {
  id: string;
  title: string;
  metric: GoalMetric;
  target: number;
  period: GoalPeriod;
  workoutType: WorkoutType | 'all';
  createdAt?: string;
};
export type GoalInput = Omit<Goal, 'id'>;

export type Reminder = {
  id: string;
  title: string;
  /** HH:mm, 24 giờ. */
  time: string;
  /** Ngày trong tuần theo Date.getDay(): 0 = Chủ nhật ... 6 = Thứ bảy. Luôn có ít nhất 1 phần tử. */
  days: number[];
  enabled: boolean;
  createdAt?: string;
};
export type ReminderInput = Omit<Reminder, 'id'>;

export type WorkoutPlan = {
  id: string;
  date: string;
  title: string;
  type: WorkoutType;
  minutes: number;
  intensity: 'nhẹ' | 'vừa';
  note?: string;
  status: 'PLANNED' | 'COMPLETED' | 'SKIPPED';
  completedWorkoutId?: string | null;
  createdAt?: string;
};
export type WorkoutPlanInput = Pick<WorkoutPlan, 'date' | 'title' | 'type' | 'minutes' | 'intensity' | 'note'>;
