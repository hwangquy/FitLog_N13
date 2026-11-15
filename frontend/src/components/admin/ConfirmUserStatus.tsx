import React,{useState} from 'react';
import {Modal,View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {adminApi,type AdminUser} from '../../services/admin';
import {C,Action} from './AdminUI';
/** Dùng trong màn hình quản lý người dùng: <ConfirmUserStatus user={user} onSaved={reload} /> */
export function ConfirmUserStatus({user,onSaved}:{user:AdminUser;onSaved:()=>void|Promise<void>}){
 const [open,setOpen]=useState(false);
 const [reason,setReason]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const targetEnabled=!user.enabled;
 const commit=async()=>{
  if(reason.trim().length<5){setError('Vui lòng nhập lý do ít nhất 5 ký tự.');return;}
  try{setBusy(true);setError('');await adminApi.setEnabled(user.id,targetEnabled,reason.trim());setOpen(false);setReason('');await onSaved();}
  catch(e){setError(e instanceof Error?e.message:'Không lưu được thay đổi.');}
  finally{setBusy(false);}
 };
 if(user.role==='ADMIN')return <Text style={{color:C.muted,fontSize:12}}>Không thể khóa tài khoản quản trị.</Text>;
 return <>
  <Action label={user.enabled?'Tạm khóa':'Mở khóa'} danger={user.enabled} onPress={()=>{setError('');setOpen(true);}} />
  <Modal visible={open} transparent animationType="fade" onRequestClose={()=>{if(!busy)setOpen(false);}}>
   <View style={{flex:1,justifyContent:'center',padding:20,backgroundColor:'rgba(0,0,0,0.75)'}}>
    <View style={{backgroundColor:C.panel,borderRadius:18,padding:20,gap:12,borderWidth:1,borderColor:C.stroke}}>
     <Text style={{fontSize:19,fontWeight:'800',color:C.text}}>Xác nhận {targetEnabled?'mở khóa':'tạm khóa'} tài khoản</Text>
     <Text style={{fontSize:14,color:C.muted}}>{user.name} · {user.email}</Text>
     <Text style={{color:C.text}}>Lý do (bắt buộc)</Text>
     <TextInput value={reason} onChangeText={setReason} editable={!busy} multiline maxLength={500} placeholder="Nhập lý do thực hiện..." placeholderTextColor={C.muted} style={{color:C.text,borderWidth:1,borderColor:C.stroke,borderRadius:9,padding:12,minHeight:75,textAlignVertical:'top'}} />
     {!!error&&<Text style={{color:C.red}}>{error}</Text>}
     {busy?<ActivityIndicator color={C.green}/>:<View style={{flexDirection:'row',gap:12,flexWrap:'wrap'}}><Action label="Hủy" onPress={()=>setOpen(false)}/><Action label="Xác nhận" danger={!targetEnabled} onPress={commit}/></View>}
    </View>
   </View>
  </Modal>
 </>;
}
