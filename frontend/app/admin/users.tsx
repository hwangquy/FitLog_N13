import React,{useCallback,useEffect,useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {ConfirmUserStatus} from '../../src/components/admin/ConfirmUserStatus';
import {Action,AdminScreen,C,Panel,State} from '../../src/components/admin/AdminUI';
import {adminApi,AdminUser,Paged} from '../../src/services/admin';
export default function AdminUsers(){
 const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0);
 const [data,setData]=useState<Paged<AdminUser>|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{setBusy(true);setError(null);try{setData(await adminApi.users(page,search));}catch(e){setError(e instanceof Error?e.message:'Lỗi tải người dùng');}finally{setBusy(false);}},[page,search]);
 useEffect(()=>{void load();},[load]);
 return <AdminScreen title="Quản lý tài khoản" subtitle="Tìm kiếm, kiểm tra trạng thái và tạm khóa/mở khóa người dùng. Không xem dữ liệu riêng tư của họ.">
 <View style={{flexDirection:'row',gap:8}}><TextInput value={query} onChangeText={setQuery} placeholder="Tên hoặc email..." placeholderTextColor={C.muted} style={{flex:1,color:C.text,backgroundColor:C.panel,borderColor:C.stroke,borderWidth:1,borderRadius:10,padding:10}} onSubmitEditing={()=>{setPage(0);setSearch(query.trim());}}/>
 <Action label="Tìm" onPress={()=>{setPage(0);setSearch(query.trim());}}/></View>
 <State loading={busy&&!data} error={error} onRetry={()=>void load()}/>
 {data?.items.map(u=><Panel key={u.id}>
   <Text style={{color:C.text,fontWeight:'700',fontSize:16}}>{u.name} <Text style={{color:u.enabled?C.green:C.red,fontSize:12}}>{u.enabled?'· Đang hoạt động':'· Đã khóa'}</Text></Text>
   <Text selectable style={{color:C.muted}}>{u.email}</Text>
   <Text style={{color:C.muted,fontSize:12}}>Vai trò: {u.role} · Buổi tập: {u.workouts} · Tracking: {u.analyticsEnabled?'Đồng ý':'Không'}</Text>
   <Text style={{color:C.muted,fontSize:11}}>Ngày tạo: {new Date(u.createdAt).toLocaleDateString('vi-VN')}</Text>
   <ConfirmUserStatus user={u} onSaved={load}/>
 </Panel>)}
 {data&&data.items.length===0?<Panel><Text style={{color:C.muted}}>Không tìm thấy tài khoản</Text></Panel>:null}
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
  <Action label="← Trang trước" disabled={page===0||busy} onPress={()=>setPage(v=>Math.max(0,v-1))}/>
  <Text style={{color:C.muted}}>{page+1} / {Math.max(1,Math.ceil((data?.total??0)/15))}</Text>
  <Action label="Trang sau →" disabled={busy||!data||((page+1)*15>=data.total)} onPress={()=>setPage(v=>v+1)}/>
 </View>
 </AdminScreen>;
}
