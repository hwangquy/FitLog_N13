import React,{useCallback,useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {Action,AdminScreen,Bars,C,Kpi,Panel,State} from '../../src/components/admin/AdminUI';
import {adminApi,TrackingSummary} from '../../src/services/admin';
export default function AdminAnalytics(){
 const [days,setDays]=useState(7),[data,setData]=useState<TrackingSummary|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 const load=useCallback(async()=>{setLoading(true);setError(null);try{setData(await adminApi.tracking(days));}catch(e){setError(e instanceof Error?e.message:'Lỗi tải tracking');}finally{setLoading(false);}},[days]);
 useEffect(()=>{void load();},[load]);
 return <AdminScreen title="User Tracking" subtitle="Analytics có sự đồng ý. Không theo dõi vị trí, ảnh, ghi chú, IP hoặc nội dung AI.">
 <View style={{flexDirection:'row',gap:8}}>{[7,30,90].map(n=><Action key={n} label={`${n} ngày${n===days?' ✓':''}`} onPress={()=>setDays(n)}/>)}</View>
 <State loading={loading&&!data} error={error} onRetry={()=>void load()}/>
 {data?<>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}><Kpi label="Sự kiện ghi nhận" value={data.totalEvents}/><Kpi label="Người dùng đồng ý có hoạt động" value={data.uniqueUsers}/></View>
 <Bars title="Lượt hoạt động theo ngày" data={data.daily} labelKey="day"/>
 <Bars title="Màn hình được mở nhiều nhất" data={data.screens}/>
 <Bars title="Nhóm sự kiện" data={data.events}/>
 <Panel title="Cách thu thập"><Text style={{color:C.muted,lineHeight:21}}>Chỉ tài khoản bật đồng ý tracking mới gửi sự kiện. Người dùng tắt đồng ý sẽ xóa sự kiện của họ. Dữ liệu dashboard là số liệu tổng hợp, không bao gồm lịch sử hành vi định danh từng người.</Text></Panel>
 </>:null}
 </AdminScreen>;
}
