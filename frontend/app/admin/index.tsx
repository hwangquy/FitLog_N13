import React,{useCallback,useEffect,useState} from 'react';
import {router} from 'expo-router';
import {View} from 'react-native';
import {AdminScreen,Bars,C,Kpi,Panel,State,Action} from '../../src/components/admin/AdminUI';
import {adminApi,AdminSummary,TrackingSummary} from '../../src/services/admin';
export default function AdminHome(){
 const [data,setData]=useState<AdminSummary|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(true);
 const [tracking,setTracking]=useState<TrackingSummary|null>(null);
 const load=useCallback(async()=>{setBusy(true);setError(null);try{
  const [summary,activity]=await Promise.all([adminApi.summary(),adminApi.tracking(7)]);
  setData(summary);setTracking(activity);
 }catch(e){setError(e instanceof Error?e.message:'Không tải được thống kê');}finally{setBusy(false);}},[]);
 useEffect(()=>{void load();},[load]);
 return <AdminScreen title="Tổng quan hệ thống" subtitle="Chỉ số tổng hợp của FitLog · Không hiển thị nhật ký tập luyện cá nhân">
 <State loading={busy&&!data} error={error} onRetry={()=>void load()}/>
 {data?<>
 <Panel title="Người dùng">
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
   <Kpi label="Tài khoản" value={data.totalUsers} sub={`Đang hoạt động: ${data.activeUsers}`}/>
   <Kpi label="Đăng ký mới (7 ngày)" value={data.newUsers7d} sub="Tài khoản mới"/>
   <Kpi label="Đồng ý tracking" value={data.trackingOptIn} sub="Không tự động bật"/>
  </View>
 </Panel>
 <Panel title="Luyện tập">
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
   <Kpi label="Buổi tập" value={data.totalWorkouts} sub={`7 ngày gần đây: ${data.workouts7d}`}/>
   <Kpi label="Mục tiêu đạt kỳ này" value={`${data.completedGoals}/${data.totalGoals}`} sub={`Chưa đạt kỳ này: ${Math.max(0,data.totalGoals-data.completedGoals)}`}/>
   <Kpi label="Lịch tập sắp tới (7 ngày)" value={data.upcomingPlans7d}
    sub={data.scheduledPlans7d>0?`Hoàn thành 7 ngày qua: ${data.completedPlans7d}/${data.scheduledPlans7d}`:'Chưa có lịch trong 7 ngày qua'}/>
  </View>
 </Panel>
 <Panel title="AI Coach">
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
   <Kpi label="Tài liệu AI" value={data.aiKnowledgeCount??'—'} sub="Trong kho kiến thức"/>
   <Kpi label="Tin nhắn AI Coach" value={data.aiChatMessageCount??'—'} sub="Tổng tin nhắn đã lưu"/>
  </View>
  <Action label="Quản lý kiến thức AI" onPress={()=>router.push("/admin/knowledge")}/>
 </Panel>
 <Bars data={data.dailyWorkouts} labelKey="day" title="Buổi tập theo ngày · 7 ngày"/>
 <Bars data={data.workoutTypes} title="Loại hình luyện tập"/>
 <Bars data={data.registrations} labelKey="day" title="Người dùng mới theo ngày"/>
 {tracking?<Panel title="Hoạt động ứng dụng · 7 ngày">
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
   <Kpi label="Sự kiện ghi nhận" value={tracking.totalEvents} sub="Cùng số liệu ở trang Tracking"/>
   <Kpi label="Người dùng đồng ý có hoạt động" value={tracking.uniqueUsers} sub="Cùng số liệu ở trang Tracking"/>
  </View>
 </Panel>:null}
 </>:null}
 </AdminScreen>;
}
