import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppButton, AppInput, AppText, Chip, Screen, ScreenHeader } from '../../src/components/ui';
import { showError } from '../../src/components/ui/dialogs';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { createPlan, updatePlan } from '../../src/store/plannerSlice';
import { workoutTypes } from '../../src/types';
import type { WorkoutType } from '../../src/types';
import { toLocalISODate } from '../../src/utils/date';
import { parseISODate } from '../../src/utils/date';
import { errorMessage } from '../../src/utils/format';

export default function PlanForm() {
 const {id,date:defaultDate}=useLocalSearchParams<{id?:string;date?:string}>();
 const dispatch=useAppDispatch();
 const old=useAppSelector(s=>s.planner.items.find(p=>p.id===id));
 const [title,setTitle]=useState('');const [date,setDate]=useState(defaultDate??toLocalISODate(new Date()));
 const [type,setType]=useState<WorkoutType>('Đi bộ');const [minutes,setMinutes]=useState('30');
 const [intensity,setIntensity]=useState<'nhẹ'|'vừa'>('nhẹ');const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(old){setTitle(old.title);setDate(old.date);setType(old.type);setMinutes(String(old.minutes));setIntensity(old.intensity);setNote(old.note??'');}},[old?.id]);
 const save=async()=>{
  const duration=Number(minutes);
  if(!title.trim()||title.trim().length>100||!parseISODate(date)||!Number.isInteger(duration)||duration<5||duration>180){showError('Dữ liệu chưa hợp lệ','Tên, ngày YYYY-MM-DD và thời lượng 5–180 phút là bắt buộc.');return;}
  setBusy(true);
  try {
   const input={title:title.trim(),date,type,minutes:duration,intensity,note:note.trim()};
   if(id) await dispatch(updatePlan({id,input})).unwrap(); else await dispatch(createPlan(input)).unwrap();
   router.back();
  }catch(e){showError('Không lưu được lịch',errorMessage(e));}finally{setBusy(false);}
 };
 return <Screen keyboard>
   <ScreenHeader title={id?'Sửa lịch tập':'Lên lịch buổi tập'} back />
   <AppInput label="Tên buổi tập" value={title} onChangeText={setTitle} required placeholder="Chạy bộ nhẹ" maxLength={100}/>
   <AppInput label="Ngày dự kiến YYYY-MM-DD" value={date} onChangeText={setDate} required maxLength={10}/>
   <AppText weight="bold">Loại tập</AppText>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{workoutTypes.map(t=><Chip key={t} label={t} selected={t===type} onPress={()=>setType(t)}/>)}</View>
   <AppInput label="Thời lượng (phút)" value={minutes} onChangeText={setMinutes} required keyboardType="number-pad"/>
   <AppText weight="bold">Cường độ</AppText>
   <View style={{flexDirection:'row',gap:8}}><Chip label="Nhẹ" selected={intensity==='nhẹ'} onPress={()=>setIntensity('nhẹ')}/><Chip label="Vừa" selected={intensity==='vừa'} onPress={()=>setIntensity('vừa')}/></View>
   <AppInput label="Ghi chú" value={note} onChangeText={setNote} multiline maxLength={500}/>
   <AppButton label="Lưu lịch tập" icon="checkmark" fullWidth loading={busy} onPress={()=>void save()}/>
 </Screen>;
}
