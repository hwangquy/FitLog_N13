import { http } from './client';
export type Metric = { label: string; count: number };
export type DayMetric = { day: string; count: number };
export type AdminSummary = {
 totalUsers:number; activeUsers:number; newUsers7d:number;
 totalWorkouts:number; workouts7d:number; totalGoals:number;
 totalReminders:number; totalPlans:number; trackingOptIn:number;
 pageViews7d:number; activeTrackedUsers7d:number;
 dailyWorkouts:DayMetric[]; workoutTypes:Metric[]; registrations:DayMetric[];
};
export type AdminUser = { id:string; name:string; email:string; role:'ADMIN'|'USER'; enabled:boolean; analyticsEnabled:boolean; createdAt:string; workouts:number };
export type Paged<T> = {items:T[]; page:number; size?:number; total:number};
export type TrackingSummary = {totalEvents:number;uniqueUsers:number;screens:Metric[];events:Metric[];daily:DayMetric[]};
export type AuditLog = {action:string;targetId:string|null;createdAt:string};
export const adminApi = {
 summary: async() => (await http.get<AdminSummary>('/admin/summary')).data,
 users: async(page=0,q='') => (await http.get<Paged<AdminUser>>(`/admin/users?page=${page}&size=15&q=${encodeURIComponent(q)}`)).data,
 setEnabled: async(id:string,enabled:boolean) => (await http.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}/enabled`,{enabled})).data,
 tracking: async(days=7) => (await http.get<TrackingSummary>(`/admin/tracking?days=${days}`)).data,
 audit: async(page=0) => (await http.get<Paged<AuditLog>>(`/admin/audit?page=${page}`)).data
};
