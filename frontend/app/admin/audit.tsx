import React,{useCallback,useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {Action,AdminScreen,C,Panel,State} from '../../src/components/admin/AdminUI';
import {adminApi,AuditLog,Paged} from '../../src/services/admin';
export default function AdminAudit(){
 const [page,setPage]=useState(0),[data,setData]=useState<Paged<AuditLog>|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(true);
 const load=useCallback(async()=>{setBusy(true);setError(null);try{setData(await adminApi.audit(page));}catch(e){setError(e instanceof Error?e.message:'Lỗi tải nhật ký');}finally{setBusy(false);}},[page]);
 useEffect(()=>{void load();},[load]);
 return <AdminScreen title="Nhật ký quản trị" subtitle="Lưu dấu vết các thay đổi trạng thái tài khoản nhằm hỗ trợ kiểm tra và truy trách nhiệm.">
 <State loading={busy&&!data} error={error} onRetry={()=>void load()}/>
 {data?.items.map((a,i)=><Panel key={`${a.createdAt}-${i}`}><Text style={{color:C.text,fontWeight:'700'}}>{a.action==='DISABLE_USER'?'Tạm khóa tài khoản':a.action==='ENABLE_USER'?'Mở khóa tài khoản':a.action}</Text><Text style={{color:C.muted,fontSize:12}}>ID người dùng: {a.targetId??'—'}</Text><Text style={{color:C.muted,fontSize:12}}>{new Date(a.createdAt).toLocaleString('vi-VN')}</Text></Panel>)}
 {data?.items.length===0?<Panel><Text style={{color:C.muted}}>Chưa có thay đổi nào.</Text></Panel>:null}
 <View style={{flexDirection:'row',justifyContent:'space-between'}}><Action label="← Trước" disabled={page===0||busy} onPress={()=>setPage(x=>x-1)}/><Action label="Sau →" disabled={busy||!data||((page+1)*20>=data.total)} onPress={()=>setPage(x=>x+1)}/></View>
 </AdminScreen>;
}
