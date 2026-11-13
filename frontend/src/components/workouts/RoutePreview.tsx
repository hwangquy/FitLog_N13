import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import type { Coords } from '../../types';
import { useAppTheme } from '../../hooks/useAppTheme';
import { routeDistanceKm } from '../../features/location/route';
import { AppText } from '../ui/primitives';
export type RoutePreviewProps = {
  route: Coords[];
  currentLocation?: Coords;
  tracking?: boolean;
};

export function RoutePreview({route}:RoutePreviewProps) {
 const {colors}=useAppTheme();
 if(route.length<2)return <AppText tone="muted" size="sm">Cần ít nhất 2 điểm GPS để hiện tuyến đường.</AppText>;
 const xs=route.map(p=>p.longitude),ys=route.map(p=>p.latitude);
 const [minX,maxX,minY,maxY]=[Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)];
 const dx=Math.max(0.00001,maxX-minX),dy=Math.max(0.00001,maxY-minY);
 const points=route.map(p=>`${10+(p.longitude-minX)/dx*280},${160-(p.latitude-minY)/dy*140}`).join(' ');
 return <View style={{gap:8}}>
  <Svg width="100%" height={170} viewBox="0 0 300 170">
    <Polyline points={points} stroke={colors.brand} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
  <AppText tone="muted" size="xs">Tuyến GPS · {routeDistanceKm(route).toFixed(2)} km · {route.length} điểm. Sơ đồ tuyến không phải bản đồ nền.</AppText>
 </View>;
}
