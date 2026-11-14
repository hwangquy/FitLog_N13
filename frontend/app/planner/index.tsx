import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { AppButton, AppText, Card, Chip, EmptyState, ErrorState, LoadingState, Screen, ScreenHeader, SectionTitle } from '../../src/components/ui';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { completePlan, deletePlan, fetchPlans, skipPlan } from '../../src/store/plannerSlice';
import { fetchAllWorkouts } from '../../src/store/workoutsSlice';
import { addDays, startOfWeek, toLocalISODate } from '../../src/utils/date';
import { showConfirmDialog } from '../../src/utils/alert';
import { showError } from '../../src/components/ui/dialogs';
import { errorMessage } from '../../src/utils/format';

export default function PlannerScreen() {
 const dispatch=useAppDispatch();
 const today=toLocalISODate(new Date());
 const [week,setWeek]=useState(startOfWeek(today));
 const [busy,setBusy]=useState<string|null>(null);
 const {items,status,error}=useAppSelector(s=>s.planner);
 const end=addDays(week,6);
 const days=useMemo(()=>Array.from({length:7},(_,i)=>addDays(week,i)),[week]);
 const reload=useCallback(()=>{void dispatch(fetchPlans({from:week,to:end}));},[dispatch,week,end]);
 useEffect(()=>{reload();},[reload]);
 const onComplete=async(id:string)=>{
  setBusy(id);
  try { await dispatch(completePlan(id)).unwrap(); await dispatch(fetchAllWorkouts()); }
  catch(e){showError('Không hoàn thành được buổi tập',errorMessage(e));}
  finally{setBusy(null);}
 };
 const remove=(id:string)=>showConfirmDialog('Xóa lịch tập','Chỉ xóa kế hoạch, không xóa nhật ký buổi tập đã hoàn thành.',()=>{
  void dispatch(deletePlan(id)).unwrap().catch(e=>showError('Lỗi xóa lịch',errorMessage(e)));
 },'Xóa','Hủy');
 return <Screen onRefresh={reload} refreshing={status==='loading'&&items.length>0}>
  <ScreenHeader eyebrow="Kế hoạch" title="Lịch tập tuần" back subtitle="Buổi dự kiến không được cộng vào thống kê cho tới khi hoàn thành" />
  <Card>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
    <AppButton label="Tuần trước" size="sm" variant="ghost" icon="chevron-back" onPress={()=>setWeek(addDays(week,-7))}/>
    <AppText weight="bold" size="sm">{week} – {end}</AppText>
    <AppButton label="Tuần sau" size="sm" variant="ghost" icon="chevron-forward" onPress={()=>setWeek(addDays(week,7))}/>
   </View>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
    {days.map((d,i)=><Chip key={d} label={`${['T2','T3','T4','T5','T6','T7','CN'][i]} ${d.slice(8)}`} selected={d===today} onPress={()=>router.push({pathname:'/planner/form',params:{date:d}})}/>)}
   </View>
   <AppButton label="Lên lịch buổi mới" icon="add-circle" fullWidth onPress={()=>router.push({pathname:'/planner/form',params:{date:today>=week&&today<=end?today:week}})}/>
  </Card>
  <SectionTitle title="Các buổi tập dự kiến" subtitle={`${items.length} lịch trong tuần`}/>
  {status==='loading' && items.length===0?<LoadingState message="Đang tải lịch tập..."/>:null}
  {status==='failed'?<ErrorState message={error??'Lỗi kết nối'} onRetry={reload}/>:null}
  {status==='succeeded'&&items.length===0?<EmptyState icon="calendar-outline" title="Chưa có lịch" message="Tạo thủ công hoặc áp dụng lịch AI Coach."/>:null}
  {items.map(p=><Card key={p.id}>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}>
      <View style={{flex:1,gap:4}}>
        <AppText weight="bold">{p.title}</AppText>
        <AppText tone="muted" size="xs">{p.date} · {p.type} · {p.minutes} phút · {p.intensity}</AppText>
      </View>
      <AppText tone={p.status==='COMPLETED'?'success':p.status==='SKIPPED'?'warning':'brand'} size="xs" weight="bold">{p.status==='COMPLETED'?'Đã tập':p.status==='SKIPPED'?'Đã bỏ':'Chưa tập'}</AppText>
    </View>
    {p.note?<AppText tone="muted" size="sm">{p.note}</AppText>:null}
    {p.status==='PLANNED'?<View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
      <AppButton label="Hoàn thành" icon="checkmark-circle" variant="secondary" size="sm" loading={busy===p.id} onPress={()=>void onComplete(p.id)}/>
      <AppButton label="Sửa" icon="create-outline" variant="ghost" size="sm" onPress={()=>router.push({pathname:'/planner/form',params:{id:p.id}})}/>
      <AppButton label="Bỏ qua" icon="close-circle-outline" variant="ghost" size="sm" onPress={()=>void dispatch(skipPlan(p.id)).unwrap().catch(e=>showError('Lỗi',errorMessage(e)))}/>
    </View>:null}
    <AppButton label="Xóa lịch" icon="trash-outline" variant="ghost" size="sm" onPress={()=>remove(p.id)}/>
  </Card>)}
 </Screen>;
}
