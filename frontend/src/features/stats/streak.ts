import type { Workout } from '../../types';
import { addDays } from '../../utils/date';
/** Day streak counts only ACTUAL workouts; start today or yesterday so rest days are not punished prematurely. */
export function calculateStreak(workouts:Workout[],today:string):number {
 const done=new Set(workouts.filter(w=>w.date<=today).map(w=>w.date));
 let day=done.has(today)?today:addDays(today,-1);
 let count=0;
 while(done.has(day) && count<3660){count++;day=addDays(day,-1);}
 return count;
}
