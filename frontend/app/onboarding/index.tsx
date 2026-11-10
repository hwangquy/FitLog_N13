import { router } from 'expo-router';
import { View } from 'react-native';
import { AppButton, AppText, Card, Screen, ScreenHeader } from '../../src/components/ui';
import { setJson } from '../../src/services/storage';
export default function OnboardingScreen(){
 const finish=async(path:'/goals/form'|'/(tabs)')=>{
  await setJson('@fitlog/onboarded-v2',true);
  router.replace(path);
 };
 return <Screen>
  <ScreenHeader eyebrow="Chào mừng" title="Bắt đầu với FitLog" subtitle="Nhật ký vận động cá nhân – không phải ứng dụng chẩn đoán"/>
  <Card><AppText weight="bold">1. Đặt mục tiêu vừa sức</AppText><AppText tone="muted">Chọn số buổi, phút vận động hoặc quãng đường theo tuần/tháng.</AppText></Card>
  <Card><AppText weight="bold">2. Lên lịch và nhận nhắc nhở</AppText><AppText tone="muted">Lập lịch thủ công hoặc dùng AI Coach. Bạn được quyền xem trước, sửa và quyết định áp dụng.</AppText></Card>
  <Card><AppText weight="bold">3. Ghi nhật ký thực tế</AppText><AppText tone="muted">Tùy chọn ảnh, vị trí và tuyến GPS. FitLog chỉ xin quyền khi bạn dùng tính năng.</AppText></Card>
  <Card><AppText weight="bold">4. Theo dõi tiến độ</AppText><AppText tone="muted">Biểu đồ, mục tiêu và chuỗi ngày tập. Dữ liệu riêng cho từng tài khoản.</AppText></Card>
  <AppButton label="Thiết lập mục tiêu ngay" icon="flag-outline" fullWidth onPress={()=>void finish('/goals/form')}/>
  <AppButton label="Để sau, vào trang chủ" variant="secondary" onPress={()=>void finish('/(tabs)')}/>
 </Screen>;
}
