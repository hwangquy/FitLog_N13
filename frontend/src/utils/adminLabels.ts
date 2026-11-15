/** Chỉ đổi nhãn hiển thị; không làm thay đổi mã sự kiện lưu trong DB. */
const labels: Record<string,string> = {
 home:'Trang chủ',coach:'AI Coach',workouts:'Buổi tập',profile:'Hồ sơ',
 progress:'Tiến độ',planner:'Lịch tập',goals:'Mục tiêu',reminders:'Nhắc lịch',
 workout_detail:'Chi tiết buổi tập',other:'Khác',
 screen_view:'Xem màn hình',coach_opened:'Mở AI Coach',
 planner_opened:'Mở lịch tập',workout_created:'Tạo buổi tập',
 goal_created:'Tạo mục tiêu',running:'Chạy bộ','hạy bộ':'Chạy bộ',
};
export function displayAdminMetric(code:string):string {
 const key=code.trim().toLowerCase();
 return labels[key] || code.replace(/_/g,' ');
}
export function formatAdminDay(raw:string):string {
 // MariaDB DATE và Java LocalDate thường trả YYYY-MM-DD hoặc ISO timestamp.
 const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
 return match ? `${match[3]}/${match[2]}` : raw;
}
export function formatAdminDateTime(raw:string):string {
 const date=new Date(raw);
 if(Number.isNaN(date.getTime()))return raw;
 return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}
