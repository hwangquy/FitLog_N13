import React,{useCallback,useEffect,useState} from 'react';
import {RefreshControl,View} from 'react-native';
import {AdminScreen,Bars,C,Kpi,Panel,State} from '../../src/components/admin/AdminUI';
import {adminApi,AdminSummary} from '../../src/services/admin';
export default function AdminHome(){
 const [data,setData]=useState<AdminSummary|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(true);
 const load=useCallback(async()=>{setBusy(true);setError(null);try{setData(await adminApi.summary());}catch(e){setError(e instanceof Error?e.message:'Không tải được thống kê');}finally{setBusy(false);}},[]);
 useEffect(()=>{void load();},[load]);
 return <AdminScreen title="Tổng quan hệ thống" subtitle="Chỉ số tổng hợp của FitLog · Không hiển thị nhật ký tập luyện cá nhân">
 <State loading={busy&&!data} error={error} onRetry={()=>void load()}/>
 {data?<>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
  <Kpi label="Tài khoản" value={data.totalUsers} sub={`Đang hoạt động: ${data.activeUsers}`}/>
  <Kpi label="Buổi tập" value={data.totalWorkouts} sub={`7 ngày gần đây: ${data.workouts7d}`}/>
  <Kpi label="Mục tiêu" value={data.totalGoals}/>
  <Kpi label="Lịch tập dự kiến" value={data.totalPlans}/>
  <Kpi label="Người đăng ký mới (7 ngày)" value={data.newUsers7d}/>
  <Kpi label="Đồng ý tracking" value={data.trackingOptIn} sub="Không tự động bật"/>
 </View>
 <Bars data={data.dailyWorkouts} labelKey="day" title="Buổi tập theo ngày · 7 ngày"/>
 <Bars data={data.workoutTypes} title="Loại hình luyện tập"/>
 <Bars data={data.registrations} labelKey="day" title="Người dùng mới theo ngày"/>
 <Panel title="Hoạt động ứng dụng · 7 ngày">
  <View style={{flexDirection:'row',justifyContent:'space-between'}}><Kpi label="Lượt xem màn hình" value={data.pageViews7d}/><Kpi label="Người dùng có hoạt động" value={data.activeTrackedUsers7d}/></View>
 </Panel>
 </>:null}
 </AdminScreen>;
}
