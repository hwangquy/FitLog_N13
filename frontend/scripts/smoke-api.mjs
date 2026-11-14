/** Integration smoke test. Creates TWO test accounts; run on a development database only. */
const API = process.env.FITLOG_API_URL || 'http://localhost:8080/api';
const unique = Date.now().toString(36);
async function req(method, path, token, body, expect = 200) {
  const r=await fetch(`${API}${path}`, {method, headers: {
    ...(token?{Authorization:`Bearer ${token}`}:{ }),
    ...(body!==undefined?{'Content-Type':'application/json'}:{})
  },body: body!==undefined?JSON.stringify(body):undefined});
  const raw=await r.text();
  let json=null;try{json=raw?JSON.parse(raw):null;}catch{}
  if(r.status!==expect) throw Error(`${method} ${path}: expected ${expect}, got ${r.status}; ${raw.slice(0,200)}`);
  return {json,headers:r.headers};
}
const register=async tag => (await req('POST','/auth/register',null,{
  name:`Test ${tag}`,email:`fitlog-${tag}-${unique}@example.invalid`,password:`TestPass!${unique}AB`
},201)).json;
const log=(t)=>console.log('✓',t);
try {
 const a=await register('a');const b=await register('b');log('register 2 accounts');
 await req('GET','/auth/me',a.accessToken);log('valid token');
 await req('GET','/workouts',null,undefined,401);log('unauthorized denied');
 const input={title:'Chạy bộ thử nghiệm',type:'Chạy bộ',date:new Date().toISOString().slice(0,10),duration:30,distance:2,calories:null,note:'test'};
 const created=(await req('POST','/workouts',a.accessToken,input,201)).json;
 const own=(await req('GET',`/workouts/${created.id}`,a.accessToken)).json;
 if(own.id!==created.id)throw Error('owner lookup mismatch');log('A creates and reads workout');
 await req('GET',`/workouts/${created.id}`,b.accessToken,undefined,404);
 await req('PUT',`/workouts/${created.id}`,b.accessToken,input,404);
 await req('DELETE',`/workouts/${created.id}`,b.accessToken,undefined,404);log('B denied reading/updating/deleting A workout');
 const list=(await req('GET','/workouts?_page=1&_limit=10',b.accessToken)).json;
 if(list.length!==0)throw Error('B can see A data!');log('per-user pagination isolated');
 const goal=(await req('POST','/goals',a.accessToken,{title:'3 buổi',metric:'sessions',target:3,period:'week',workoutType:'all'},201)).json;
 const reminder=(await req('POST','/reminders',a.accessToken,{title:'Tập thôi',time:'07:00',days:[1,3,5],enabled:true},201)).json;
 if(!goal.id||!reminder.id)throw Error('goal / reminder creation failed');log('goal and reminder CRUD endpoints');
 const plan=(await req('POST','/plans',a.accessToken,{title:'Yoga thử',type:'Yoga',date:new Date().toISOString().slice(0,10),minutes:20,intensity:'nhẹ',note:'test'},201)).json;
 const completed=(await req('POST',`/plans/${plan.id}/complete`,a.accessToken,{})).json;
 const repeated=(await req('POST',`/plans/${plan.id}/complete`,a.accessToken,{})).json;
 if(!completed.completedWorkoutId||completed.completedWorkoutId!==repeated.completedWorkoutId)throw Error('non-idempotent complete');log('planner completion idempotent');
 await req('DELETE',`/workouts/${created.id}`,a.accessToken,undefined,204);log('A can delete own workout');
 await req('POST','/auth/logout',a.accessToken,undefined,204);
 await req('GET','/auth/me',a.accessToken,undefined,401);log('revoked token refused');
 console.log('\nALL INTEGRATION SMOKE TESTS PASSED');
} catch(e){console.error('\nSMOKE TEST FAILED:',e);process.exitCode=1;}
