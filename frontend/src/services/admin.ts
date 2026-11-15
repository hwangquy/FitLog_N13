import { http } from './api';
export type Metric = { label: string; count: number };
export type DayMetric = { day: string; count: number };
export type AdminSummary = {
 totalUsers:number; activeUsers:number; newUsers7d:number;
 totalWorkouts:number; workouts7d:number; totalGoals:number; completedGoals:number;
 upcomingPlans7d:number; completedPlans7d:number; scheduledPlans7d:number;
 totalReminders:number; totalPlans:number; trackingOptIn:number;
 aiKnowledgeCount?:number|null; aiChatMessageCount?:number|null;
 dailyWorkouts:DayMetric[]; workoutTypes:Metric[]; registrations:DayMetric[];
};
export type AdminUser = { id:string; name:string; email:string; role:'ADMIN'|'USER'; enabled:boolean; analyticsEnabled:boolean; createdAt:string; workouts:number };
export type Paged<T> = {items:T[]; page:number; size?:number; total:number};
export type TrackingSummary = {totalEvents:number;uniqueUsers:number;screens:Metric[];events:Metric[];daily:DayMetric[];consentingUsers:number;totalUsers:number;screenViews:number;meaningfulActions:number;averageEventsPerUser:number;};
export type AuditLog = {action:string;targetId:string|null;createdAt:string;actorName?:string;actorEmail?:string;targetName?:string;targetEmail?:string;reason?:string|null};
export const adminApi = {
 summary: async() => (await http.get<AdminSummary>('/admin/summary')).data,
 users: async(page=0,q='') => (await http.get<Paged<AdminUser>>(`/admin/users?page=${page}&size=15&q=${encodeURIComponent(q)}`)).data,
 setEnabled: async(id:string,enabled:boolean,reason:string) => (await http.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}/enabled`,{enabled,reason})).data,
 tracking: async(days=7) => (await http.get<TrackingSummary>(`/admin/tracking?days=${days}`)).data,
 audit: async(page=0) => (await http.get<Paged<AuditLog>>(`/admin/audit?page=${page}`)).data
};
