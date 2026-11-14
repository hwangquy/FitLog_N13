import {useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {router} from 'expo-router';
import {AdminScreen,Panel,Action,C} from '../../src/components/admin/AdminUI';
import {adminAiApi} from '../../src/services/adminAi';
import {errorMessage} from '../../src/utils/format';
export default function AdminKnowledge(){
 const [title,setTitle]=useState(''),[category,setCategory]=useState('Gym');
 const [content,setContent]=useState(''),[source,setSource]=useState('FitLog - hướng dẫn nội bộ');
 const [busy,setBusy]=useState(false),[result,setResult]=useState('');
 const input=(name:string,value:string,set:(x:string)=>void,multiline=false)=><View style={{gap:4}}>
  <Text style={{color:C.text,fontWeight:'600'}}>{name}</Text>
  <TextInput multiline={multiline} numberOfLines={multiline?6:1} value={value} onChangeText={set}
   placeholder={name} placeholderTextColor={C.muted} style={{backgroundColor:C.bg,color:C.text,
    borderColor:C.stroke,borderWidth:1,borderRadius:10,padding:10,minHeight:multiline?120:46}}/>
 </View>;
 const add=async()=>{setBusy(true);try{
  const res=await adminAiApi.add({title,category,content,source});
  setResult(`Đã lưu kiến thức và vector vào MariaDB. ID: ${res.id}`);setTitle('');setContent('');
 }catch(e){setResult(errorMessage(e));}finally{setBusy(false);}};
 const reindex=async()=>{setBusy(true);try{const r=await adminAiApi.reindex();
  setResult(`Đã đồng bộ ${r.indexedCount} tài liệu trong MariaDB Vector.`);
 }catch(e){setResult(errorMessage(e));}finally{setBusy(false);}};
 return <AdminScreen title="Kho kiến thức AI" subtitle="Admin lưu tài liệu và embedding BGE-M3 trực tiếp trong MariaDB.">
  <Action label="Quay lại tổng quan" onPress={()=>router.replace('/admin')}/>
  <Panel title="Thêm kiến thức bài tập">
   {input('Tên tài liệu',title,setTitle)}
   {input('Danh mục',category,setCategory)}
   {input('Hướng dẫn chi tiết',content,setContent,true)}
   {input('Nguồn tài liệu',source,setSource)}
   <Action label={busy?'Đang xử lý...':'Lưu và tạo embedding'} disabled={busy||!title.trim()||!content.trim()} onPress={()=>void add()}/>
  </Panel>
  <Panel title="Khôi phục chỉ mục vector">
   <Text style={{color:C.muted}}>Dùng sau khi chuyển database, nhập thêm dữ liệu hoặc đổi mô hình embedding.</Text>
   <Action label={busy?'Đang đồng bộ...':'Reindex toàn bộ'} disabled={busy} onPress={()=>void reindex()}/>
  </Panel>
  {result?<Panel><Text style={{color:C.text}}>{result}</Text></Panel>:null}
 </AdminScreen>;
}
