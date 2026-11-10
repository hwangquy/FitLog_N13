import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { plannerApi } from '../services/api';
import type { WorkoutPlan, WorkoutPlanInput } from '../types';
import { errorMessage } from '../utils/format';
type PlannerState = { items: WorkoutPlan[]; status: 'idle'|'loading'|'succeeded'|'failed'; error: string|null };
const initialState: PlannerState = { items: [], status: 'idle', error: null };
export const fetchPlans = createAsyncThunk<WorkoutPlan[], {from:string;to:string}, {rejectValue:string}>(
  'planner/fetch', async ({from,to},{rejectWithValue}) => {
    try { return await plannerApi.list(from,to); } catch(e){ return rejectWithValue(errorMessage(e)); }
  }
);
export const createPlan = createAsyncThunk<WorkoutPlan, WorkoutPlanInput, {rejectValue:string}>(
  'planner/create', async (input,{rejectWithValue}) => {
    try{return await plannerApi.create(input);}catch(e){return rejectWithValue(errorMessage(e));}
  }
);
export const updatePlan = createAsyncThunk<WorkoutPlan, {id:string;input:WorkoutPlanInput}, {rejectValue:string}>(
  'planner/update', async ({id,input},{rejectWithValue}) => {
    try{return await plannerApi.update(id,input);}catch(e){return rejectWithValue(errorMessage(e));}
  }
);
export const completePlan = createAsyncThunk<WorkoutPlan,string,{rejectValue:string}>(
  'planner/complete',async(id,{rejectWithValue})=>{
    try{return await plannerApi.complete(id);}catch(e){return rejectWithValue(errorMessage(e));}
  }
);
export const skipPlan = createAsyncThunk<WorkoutPlan,string,{rejectValue:string}>(
  'planner/skip',async(id,{rejectWithValue})=>{
    try{return await plannerApi.skip(id);}catch(e){return rejectWithValue(errorMessage(e));}
  }
);
export const deletePlan = createAsyncThunk<string,string,{rejectValue:string}>(
  'planner/delete',async(id,{rejectWithValue})=>{
    try{await plannerApi.remove(id);return id;}catch(e){return rejectWithValue(errorMessage(e));}
  }
);
const slice=createSlice({
  name:'planner',initialState,reducers:{},extraReducers:builder=>{
    const upsert=(state:PlannerState,item:WorkoutPlan)=>{state.items=[...state.items.filter(x=>x.id!==item.id),item].sort((a,b)=>a.date.localeCompare(b.date));};
    builder.addCase(fetchPlans.pending,s=>{s.status='loading';s.error=null;})
      .addCase(fetchPlans.fulfilled,(s,a)=>{s.status='succeeded';s.items=a.payload;})
      .addCase(fetchPlans.rejected,(s,a)=>{s.status='failed';s.error=a.payload??'Không tải được lịch tập.';})
      .addCase(createPlan.fulfilled,(s,a)=>upsert(s,a.payload))
      .addCase(updatePlan.fulfilled,(s,a)=>upsert(s,a.payload))
      .addCase(completePlan.fulfilled,(s,a)=>upsert(s,a.payload))
      .addCase(skipPlan.fulfilled,(s,a)=>upsert(s,a.payload))
      .addCase(deletePlan.fulfilled,(s,a)=>{s.items=s.items.filter(x=>x.id!==a.payload);});
  }
});
export default slice.reducer;
