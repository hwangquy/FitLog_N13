import type { Coords } from '../../types';
/** Haversine (kilometers); pure function for tests. */
export function distanceKm(a: Coords,b: Coords): number {
 const rad=(n:number)=>n*Math.PI/180;
 const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
 const x=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));
}
export function routeDistanceKm(points:Coords[]):number {
 return points.slice(1).reduce((sum,p,i)=>sum+distanceKm(points[i],p),0);
}
