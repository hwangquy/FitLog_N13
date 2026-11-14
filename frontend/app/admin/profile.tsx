import React,{useEffect,useState} from 'react';
import {Text} from 'react-native';
import {showConfirmDialog} from '../../src/utils/alert';
import {showError} from '../../src/components/ui/dialogs';
import {useRouter} from 'expo-router';
import {authService,User} from '../../services/authService';
import {AdminScreen,Action,C,Panel} from '../../src/components/admin/AdminUI';
import {useAppDispatch} from '../../src/store/hooks';
import {resetAccountData} from '../../src/store';
export default function AdminProfile(){
 const [user,setUser]=useState<User|null>(null);const dispatch=useAppDispatch();const router=useRouter();
 useEffect(()=>{void authService.getCurrentUser().then(setUser);},[]);
 const signOut=()=>showConfirmDialog('Đăng xuất','Đăng xuất khỏi trang quản trị?',()=>{void (async()=>{try{await authService.logout();dispatch(resetAccountData());router.replace('/auth/login');}catch(e){showError('Lỗi',e instanceof Error?e.message:'Không đăng xuất được');}})();},'Đăng xuất','Hủy');
 return <AdminScreen title="Tài khoản quản trị" subtitle="Khu vực độc lập với ứng dụng luyện tập của người dùng.">
 <Panel title={user?.name??'Quản trị viên'}><Text style={{color:C.muted}}>{user?.email??'Đang tải...'}</Text><Text style={{color:C.green,fontWeight:'700'}}>ROLE_ADMIN</Text></Panel>
 <Panel title="Bảo mật"><Text style={{color:C.muted,lineHeight:22}}>Chỉ tài khoản được cấp quyền ADMIN từ cơ sở dữ liệu mới truy cập API quản trị. Các thao tác khóa/mở tài khoản được ghi nhận trong audit log.</Text></Panel>
 <Action label="Đăng xuất Admin" danger onPress={signOut}/>
 </AdminScreen>;
}
