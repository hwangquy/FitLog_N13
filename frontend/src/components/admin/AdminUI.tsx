import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import type { DayMetric,Metric } from '../../services/admin';
import { displayAdminMetric, formatAdminDay } from '../../utils/adminLabels';
import { buildAdminChartAxis } from '../../utils/adminChart';
const C={bg:'#0B1220',panel:'#172235',text:'#F3F6FA',muted:'#A9BACB',green:'#43D9A3',stroke:'#2A4058',red:'#F68080'};
export {C};
export function AdminScreen({children,title,subtitle}: {children:React.ReactNode;title:string;subtitle?:string}){
 return <ScrollView style={{flex:1,width:'100%',backgroundColor:C.bg}} contentContainerStyle={{flexGrow:1,paddingBottom:36}}>
  <View style={{width:'100%',maxWidth:1160,alignSelf:'center',padding:18,gap:14}}>
   <Text style={{color:C.green,fontSize:12,fontWeight:'700',letterSpacing:1.8}}>FITLOG · TRUNG TÂM QUẢN TRỊ</Text>
   <Text style={{color:C.text,fontSize:28,fontWeight:'800'}}>{title}</Text>
   {subtitle?<Text style={{color:C.muted,marginBottom:5,lineHeight:20}}>{subtitle}</Text>:null}
   {children}
  </View>
 </ScrollView>;
}
export function Panel({title,children}:{title?:string;children:React.ReactNode}){
 return <View style={styles.panel}>{title?<Text style={styles.title}>{title}</Text>:null}{children}</View>;
}
export function Kpi({label,value,sub}:{label:string;value:string|number;sub?:string}){
 return <View style={[styles.panel,{flexGrow:1,minWidth:0,flexBasis:'44%',minHeight:112,justifyContent:'space-between'}]}>
  <Text style={{color:C.muted,fontSize:12}}>{label}</Text>
  <Text style={{color:C.text,fontSize:28,fontWeight:'800',marginTop:7}}>{value}</Text>
  <Text style={{color:C.green,fontSize:12,marginTop:4}}>{sub || ' '}</Text>
 </View>;
}
export function State({loading,error,onRetry}:{loading?:boolean;error?:string|null;onRetry?:()=>void}){
 if(loading)return <ActivityIndicator color={C.green} size="large" style={{margin:25}}/>;
 if(error)return <Panel><Text style={{color:C.red}}>{error}</Text><Pressable onPress={onRetry}><Text style={{color:C.green,marginTop:10}}>Thử lại</Text></Pressable></Panel>;
 return null;
}
/** Nhãn đầy đủ, trục 0 và ngày DD/MM. Không cắt nhãn bằng slice(). */
export function Bars({data,labelKey='label',title}:{data:Metric[]|DayMetric[];labelKey?:'label'|'day';title:string}){
 const safe=data.slice(-10);
 const max=Math.max(1,...safe.map(v=>Math.max(0,Number(v.count)||0)));
 const {max:axisMax,ticks}=buildAdminChartAxis(max);
 return <Panel title={title}>
  {safe.length===0?<Text style={{color:C.muted,fontSize:13}}>◯ Chưa có dữ liệu để hiển thị.</Text>:
  <View style={{marginTop:10,minWidth:0}}>
   <View style={{height:150,position:'relative',paddingLeft:26}}>
    {ticks.map((tick)=><View key={tick} pointerEvents="none" style={{position:'absolute',left:0,right:0,bottom:Math.round(tick/axisMax*115)+18,flexDirection:'row',alignItems:'center'}}>
     <Text style={{width:25,fontSize:11,color:C.muted,textAlign:'right',paddingRight:4}}>{tick}</Text>
     <View style={{height:1,backgroundColor:C.stroke,flex:1}} />
    </View>)}
    <View style={{flexDirection:'row',alignItems:'flex-end',height:150,gap:5}}>
     {safe.map((d,i)=>{
      const value=Math.max(0,Number(d.count)||0);
      const barHeight=value>0?Math.max(5,Math.round(value/axisMax*115)):0;
      return <View key={`${labelKey==='day'?(d as DayMetric).day:(d as Metric).label}-${i}`} style={{flex:1,minWidth:0,height:150,justifyContent:'flex-end',alignItems:'center'}}>
       <Text style={{fontSize:11,color:C.text}}>{value}</Text>
       <View style={{height:barHeight,width:'72%',minWidth:3,maxWidth:56,backgroundColor:C.green,borderTopLeftRadius:4,borderTopRightRadius:4,marginBottom:18}} />
      </View>;
     })}
    </View>
   </View>
   <View style={{flexDirection:'row',paddingLeft:26,gap:5,marginTop:4}}>
    {safe.map((d,i)=>{
     const raw=String(labelKey==='day'?(d as DayMetric).day:(d as Metric).label||'');
     const label=labelKey==='day'?formatAdminDay(raw):displayAdminMetric(raw);
     return <View key={`${raw}-${i}`} style={{flex:1,minWidth:0,alignItems:'center'}}>
      <Text numberOfLines={3} style={{fontSize:12,color:C.muted,lineHeight:16,textAlign:'center',flexShrink:1}}>{label}</Text>
     </View>;
    })}
   </View>
  </View>}
 </Panel>;
}
export function Action({label,onPress,danger=false,disabled=false}:{label:string;onPress:()=>void;danger?:boolean;disabled?:boolean}){
 return <Pressable disabled={disabled} accessibilityRole="button" onPress={onPress} style={{paddingVertical:10,paddingHorizontal:14,borderRadius:10,backgroundColor:danger?'#5E2838':'#164D45',opacity:disabled?.5:1,alignSelf:'flex-start'}}><Text style={{color:danger?'#FFB5B5':'#C9FBEA',fontWeight:'700',fontSize:12}}>{label}</Text></Pressable>;
}
const styles=StyleSheet.create({panel:{backgroundColor:C.panel,borderColor:C.stroke,borderWidth:1,borderRadius:16,padding:15,gap:7,minWidth:0,maxWidth:'100%'},title:{color:C.text,fontSize:15,fontWeight:'800',marginBottom:4}});
