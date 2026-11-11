import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import type { DayMetric,Metric } from '../../services/admin';
const C={bg:'#0B1220',panel:'#172235',text:'#F3F6FA',muted:'#A9BACB',green:'#43D9A3',stroke:'#2A4058',red:'#F68080'};
export {C};
export function AdminScreen({children,title,subtitle}: {children:React.ReactNode;title:string;subtitle?:string}){
 return <ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={{padding:18,paddingBottom:36,gap:14}}>
  <Text style={{color:C.green,fontSize:12,fontWeight:'700',letterSpacing:1.8}}>FITLOG · CONTROL CENTER</Text>
  <Text style={{color:C.text,fontSize:28,fontWeight:'800'}}>{title}</Text>
  {subtitle?<Text style={{color:C.muted,marginBottom:5,lineHeight:20}}>{subtitle}</Text>:null}
  {children}
 </ScrollView>;
}
export function Panel({title,children}:{title?:string;children:React.ReactNode}){
 return <View style={styles.panel}>{title?<Text style={styles.title}>{title}</Text>:null}{children}</View>;
}
export function Kpi({label,value,sub}:{label:string;value:string|number;sub?:string}){
 return <View style={[styles.panel,{flexGrow:1,minWidth:145,flexBasis:'45%'}]}>
  <Text style={{color:C.muted,fontSize:12}}>{label}</Text>
  <Text style={{color:C.text,fontSize:28,fontWeight:'800',marginTop:7}}>{value}</Text>
  {sub?<Text style={{color:C.green,fontSize:11,marginTop:4}}>{sub}</Text>:null}
 </View>;
}
export function State({loading,error,onRetry}:{loading?:boolean;error?:string|null;onRetry?:()=>void}){
 if(loading)return <ActivityIndicator color={C.green} size="large" style={{margin:25}}/>;
 if(error)return <Panel><Text style={{color:C.red}}>{error}</Text><Pressable onPress={onRetry}><Text style={{color:C.green,marginTop:10}}>Thử lại</Text></Pressable></Panel>;
 return null;
}
export function Bars({data,labelKey='label',title}:{data:Metric[]|DayMetric[];labelKey?:'label'|'day';title:string}){
 const safe=data.slice(-10);
 const max=Math.max(1,...safe.map(v=>Math.max(0,Number(v.count)||0)));
 return <Panel title={title}>
  {safe.length===0?<Text style={{color:C.muted}}>Chưa có dữ liệu</Text>:
  <View style={{flexDirection:'row',alignItems:'flex-end',gap:7,height:175,marginTop:15}}>
   {safe.map((d,i)=><View key={`${i}`} style={{flex:1,alignItems:'center',minWidth:0}}>
     <Text style={{fontSize:10,color:C.text}}>{d.count}</Text>
     <View style={{height:125,width:'75%',justifyContent:'flex-end',marginTop:5}}>
       <View style={{height:Math.max(4,125*Math.max(0,Number(d.count)||0)/max),backgroundColor:i%2? '#2F8EAA':C.green,borderTopLeftRadius:5,borderTopRightRadius:5}} />
     </View>
     <Text numberOfLines={1} style={{fontSize:9,color:C.muted,marginTop:6,width:'100%',textAlign:'center'}}>{String(labelKey==='day'?(d as DayMetric).day:(d as Metric).label).slice(-6)}</Text>
   </View>)}
  </View>}
 </Panel>;
}
export function Action({label,onPress,danger=false,disabled=false}:{label:string;onPress:()=>void;danger?:boolean;disabled?:boolean}){
 return <Pressable disabled={disabled} accessibilityRole="button" onPress={onPress} style={{paddingVertical:10,paddingHorizontal:14,borderRadius:10,backgroundColor:danger?'#5E2838':'#164D45',opacity:disabled?.5:1,alignSelf:'flex-start'}}><Text style={{color:danger?'#FFB5B5':'#C9FBEA',fontWeight:'700',fontSize:12}}>{label}</Text></Pressable>;
}
const styles=StyleSheet.create({panel:{backgroundColor:C.panel,borderColor:C.stroke,borderWidth:1,borderRadius:16,padding:15,gap:7},title:{color:C.text,fontSize:15,fontWeight:'800',marginBottom:4}});
