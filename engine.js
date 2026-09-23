export const SCHEMA = 1;
export const ZODIAC_AVATARS = [['rat','쥐'],['ox','소'],['tiger','호랑이'],['bunny','토끼'],['dragon','용'],['snake','뱀'],['horse','말'],['sheep','양'],['monkey','원숭이'],['rooster','닭'],['dog','개'],['pig','돼지']];
export const CATEGORIES = {
  reading: { label: '책 읽기', icon: 'book', color: 'peach' },
  math: { label: '수학', icon: 'pencil', color: 'lavender' },
  learning: { label: '기타 학습', icon: 'pencil', color: 'lavender' },
  life: { label: '생활 습관', icon: 'sun', color: 'yellow' },
  movement: { label: '몸 움직이기', icon: 'move', color: 'mint' },
  art: { label: '만들고 표현하기', icon: 'music', color: 'pink' }
};
export const defaultCategories=()=>Object.entries(CATEGORIES).map(([id,c])=>({id,label:c.label,type:id}));
export function allCategories(state){return (state?.categories||defaultCategories()).map(c=>({...c,icon:CATEGORIES[c.type].icon,color:CATEGORIES[c.type].color}));}
export function activeCategories(state){return allCategories(state).filter(c=>!c.archivedFrom);}
export function categoryInfo(state,id){return allCategories(state).find(c=>c.id===id);}
export function saveCategory(state,id,values){
  const label=String(values.label||'').trim();
  if(!label||label.length>30)throw new Error('묶음 이름을 1~30자로 적어 주세요.');
  if(!Object.hasOwn(CATEGORIES,values.type))throw new Error('묶음의 입력 방식을 골라 주세요.');
  if(activeCategories(state).some(c=>c.id!==id&&c.label.toLocaleLowerCase()===label.toLocaleLowerCase()))throw new Error('같은 이름의 묶음이 있어요. 다른 이름을 적어 주세요.');
  state.categories??=defaultCategories();
  if(id){const c=state.categories.find(c=>c.id===id&&!c.archivedFrom);if(!c)throw new Error('묶음을 찾을 수 없어요.');Object.assign(c,{label,type:values.type});}
  else{if(state.categories.length>=500)throw new Error('묶음을 더 만들 수 없어요. 기존 묶음을 사용해 주세요.');id=uid();state.categories.push({id,label,type:values.type});}
  touch(state);return id;
}
export function moveCategory(state,id,direction){
  if(direction!==-1&&direction!==1)throw new Error('묶음 순서를 바꿀 수 없어요.');
  state.categories??=defaultCategories();
  const positions=state.categories.flatMap((category,index)=>category.archivedFrom?[]:[index]);
  const from=positions.findIndex(index=>state.categories[index].id===id),to=from+direction;
  if(from<0||to<0||to>=positions.length)throw new Error('묶음을 더 옮길 수 없어요.');
  [state.categories[positions[from]],state.categories[positions[to]]]=[state.categories[positions[to]],state.categories[positions[from]]];
  touch(state);
}
export function categoryHabits(state,id,date=today()){
  return state.habits.filter(h=>(!h.archivedFrom||h.archivedFrom>date)&&(habitAt(h,date)?.category===id||h.versions.some(v=>v.effectiveFrom>date&&v.category===id)));
}
export function deleteCategory(state,id,destination,date=today()){
  const category=activeCategories(state).find(c=>c.id===id),others=activeCategories(state).filter(c=>c.id!==id);
  if(!category)throw new Error('묶음을 찾을 수 없어요.');
  if(!others.length)throw new Error('묶음은 하나 이상 필요해요. 먼저 새 묶음을 만들어 주세요.');
  const habits=categoryHabits(state,id,date);
  if(habits.length&&!others.some(c=>c.id===destination))throw new Error('할 일을 옮길 묶음을 골라 주세요.');
  for(const h of habits){
    const current=habitAt(h,date);
    if(current?.category===id){h.versions=h.versions.filter(v=>v.effectiveFrom!==date);h.versions.push({...clone(current),effectiveFrom:date,category:destination});}
    h.versions=h.versions.map(v=>v.effectiveFrom>date&&v.category===id?{...v,category:destination}:v).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));
  }
  for(const p of state.weeklyPlans||[]){if(p.category===id){p.versions=p.versions.filter(v=>v.effectiveFrom<date);p.versions.push({effectiveFrom:date,mode:'off',days:[],anchorDate:date});}}
  state.categories??=defaultCategories();state.categories.find(c=>c.id===id).archivedFrom=date;
  touch(state);return habits.length;
}
export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function dateObj(s) { return new Date(`${s}T12:00:00`); }
export function addDays(s,n) { const d = dateObj(s); d.setDate(d.getDate()+n); return today(d); }
export function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(dateObj(s).getTime()) && today(dateObj(s)) === s; }
export function weekStart(s) { const w = dateObj(s).getDay(); return addDays(s, -(w === 0 ? 6 : w-1)); }
export function datesBetween(start,end) { const out=[]; for(let d=start;d<=end;d=addDays(d,1)) { out.push(d); if(out.length>3700) throw new Error('기간이 너무 깁니다.'); } return out; }
export function monthDays(month) { const [y,m]=month.split('-').map(Number); return datesBetween(`${month}-01`, today(new Date(y,m,0,12))); }
export function uid() { return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function clone(s) { return JSON.parse(JSON.stringify(s)); }
export function freshState(date=today()) {
  const state = { schema: SCHEMA, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), children: [
    { id:'child-1', name:'첫째', avatar:'fox', style:'independent' },
    { id:'child-2', name:'둘째', avatar:'bunny', style:'together' }
  ], categories:defaultCategories(), weeklyPlans:[], habits: [], entries: {}, restDays: {}, rewards: [
    { id:'reward-1', title:'함께 보드게임 하기', cost:12, icon:'game' },
    { id:'reward-2', title:'주말 놀이 고르기', cost:20, icon:'sparkles' }
  ], redemptions: [], notes: {} };
  return state;
}
export function habitAt(habit,date) { if(habit.archivedFrom && date>=habit.archivedFrom) return null; return [...habit.versions].filter(v=>v.effectiveFrom<=date).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0] || null; }
export function weeklyAt(plan,date){return plan?[...plan.versions].filter(v=>v.effectiveFrom<=date).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0]||null:null;}
export function weeklyDue(v,date){
  if(!v||v.mode==='off')return false;
  if(v.mode==='daily')return true;
  if(v.mode==='days')return v.days.includes(dateObj(date).getDay());
  const serial=d=>{const [y,m,n]=d.split('-').map(Number);return Date.UTC(y,m-1,n)/86400000;};
  return date>=v.anchorDate&&(serial(date)-serial(v.anchorDate))%2===0;
}
export function weeklyLabel(v){if(!v||v.mode==='off')return '아직 정하지 않았어요';if(v.mode==='daily')return '매일';if(v.mode==='alternate')return `${Number(v.anchorDate.slice(5,7))}/${Number(v.anchorDate.slice(8))}부터 격일`;return [1,2,3,4,5,6,0].filter(d=>v.days.includes(d)).map(d=>'일월화수목금토'[d]).join(' · ');}
export function saveWeeklyPlan(state,child,category,values,parentConfirmed=false,date=today()){
  if(!state.children.some(c=>c.id===child)||!activeCategories(state).some(c=>c.id===category))throw new Error('아이와 묶음을 확인해 주세요.');
  if(!isDate(date)||date<today())throw new Error('주간계획은 오늘부터 바꿀 수 있어요.');
  const existing=(state.weeklyPlans||[]).find(p=>p.childId===child&&p.category===category);
  if(existing&&!parentConfirmed)throw new Error('이미 정한 계획은 부모님과 함께 바꿔 주세요.');
  const mode=values.mode,days=[...new Set((values.days||[]).map(Number))].filter(d=>Number.isInteger(d)&&d>=0&&d<=6);
  if(!['daily','days','alternate','off'].includes(mode)||mode==='days'&&!days.length)throw new Error('실천할 날을 골라 주세요.');
  const anchorDate=mode==='alternate'?values.anchorDate:date;
  if(!isDate(anchorDate))throw new Error('격일 계획을 시작할 날짜를 골라 주세요.');
  const v={effectiveFrom:date,mode,days:mode==='days'?days:[],anchorDate};
  state.weeklyPlans??=[];
  if(existing){existing.versions=existing.versions.filter(v=>v.effectiveFrom<date);existing.versions.push(v);}
  else state.weeklyPlans.push({id:uid(),childId:child,category,versions:[v]});
  touch(state);
}
export function dailyGroupsFor(state,child,date){
  const cards=cardsFor(state,child,date);
  return allCategories(state).flatMap(category=>{
    const items=cards.filter(c=>c.config.category===category.id),plan=(state.weeklyPlans||[]).find(p=>p.childId===child&&p.category===category.id);
    const expected=(!category.archivedFrom||date<category.archivedFrom)&&weeklyDue(weeklyAt(plan,date),date);
    return expected||items.length?[{...category,items,expected}]:[];
  });
}
export function saveDailyPlan(state,child,id,values,day=today(),parentConfirmed=false){
  if(!isDate(day)||day<today()||day>addDays(today(),1))throw new Error('오늘이나 내일의 할 일을 정해 주세요.');
  const existing=id?state.habits.find(h=>h.id===id&&h.childId===child):null;
  if(id&&(!existing||!existing.dailyPlan))throw new Error('이 계획을 찾을 수 없어요.');
  if(existing&&!parentConfirmed)throw new Error('이미 정한 계획은 부모님과 함께 바꿔 주세요.');
  if(existing&&Object.values(state.entries).some(e=>e.habitId===id))throw new Error('완료 기록은 그대로 남겨요. 완료를 취소한 뒤 부모님과 함께 바꿔 주세요.');
  const old=existing?.versions.at(-1);
  if(old&&old.dueDate!==day)throw new Error('계획한 날짜를 확인해 주세요.');
  saveHabit(state,child,id,{...values,frequency:'once',dueDate:day,points:old?.points??1},today());
  const h=existing||state.habits.at(-1);h.dailyPlan=true;return h.id;
}
export function removeDailyPlan(state,child,id,parentConfirmed=false){
  if(!parentConfirmed)throw new Error('부모님과 함께 확인해 주세요.');
  const h=state.habits.find(h=>h.id===id&&h.childId===child&&h.dailyPlan);
  if(!h)throw new Error('계획을 찾을 수 없어요.');
  if(Object.values(state.entries).some(e=>e.habitId===id))throw new Error('완료 기록은 그대로 남겨요. 완료를 취소한 뒤 다시 확인해 주세요.');
  if(h.versions.at(-1).dueDate<today())throw new Error('지난 계획은 그대로 보관해요.');
  h.archivedFrom=today();touch(state);
}
export function recentMaterials(state,child,category){
  const recorded=new Set(Object.values(state.entries).map(e=>e.habitId));
  const rows=state.habits.filter(h=>h.childId===child&&(!h.archivedFrom||recorded.has(h.id))).flatMap(h=>h.versions).filter(v=>v.category===category&&v.material).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom));
  return [...new Set(rows.map(v=>v.material))].slice(0,8);
}
export function historyHabits(state,child){const recorded=new Set(entriesFor(state,child).map(e=>e.habitId));return state.habits.filter(h=>h.childId===child&&(!h.dailyPlan||!h.archivedFrom||recorded.has(h.id)));}
export function scheduled(v,date) { if(!v) return false; if(v.frequency==='weekdays') return v.days.includes(dateObj(date).getDay()); if(v.frequency==='once') return date===v.dueDate; return true; }
export function entryKey(child,habit,date) { return `${child}/${habit}/${date}`; }
export function entriesFor(state,child,start='0000-00-00',end='9999-99-99') { return Object.values(state.entries).filter(e=>e.childId===child && e.date>=start && e.date<=end); }
export function periodCount(state,habit,v,date) {
  const start=v.frequency==='weekly'?weekStart(date):`${date.slice(0,7)}-01`;
  const end=v.frequency==='weekly'?addDays(start,6):monthDays(date.slice(0,7)).at(-1);
  return entriesFor(state,habit.childId,start,end).filter(e=>e.habitId===habit.id).length;
}
export function cardsFor(state,child,date) {
  return state.habits.filter(h=>h.childId===child).flatMap(h=>{
    const entry=state.entries[entryKey(child,h.id,date)];
    const v=habitAt(h,date);
    if(!scheduled(v,date) && !entry) return [];
    const display=entry?.snapshot||v;
    const flexible=['weekly','monthly'].includes(display.frequency);
    const count=flexible?periodCount(state,h,display,date):0;
    return [{habit:h,config:display,entry,flexible,count,target:display.target,goalReached:flexible && count>=display.target}];
  });
}
export function markDone(state,child,habitId,date=today()) {
  if(!isDate(date)||date>today()) throw new Error('오늘 또는 지난 날짜에 기록할 수 있어요.');
  const h=state.habits.find(h=>h.id===habitId&&h.childId===child);
  if(!h) throw new Error('활동을 찾을 수 없어요.');
  const key=entryKey(child,habitId,date);
  if(state.entries[key]) return false;
  const v=habitAt(h,date);
  if(!scheduled(v,date)) throw new Error('이 날짜의 활동이 아니에요.');
  if(['weekly','monthly'].includes(v.frequency)&&periodCount(state,h,v,date)>=v.target) throw new Error('이 기간의 약속을 모두 채웠어요.');
  state.entries[key]={id:uid(),childId:child,habitId,date,points:v.points,snapshot:clone(v),recordedAt:new Date().toISOString()};
  touch(state); return true;
}
export function undoDone(state,child,habitId,date) {
  const key=entryKey(child,habitId,date); if(!state.entries[key]) return false;
  delete state.entries[key]; touch(state); return true;
}
export function touch(state) { state.updatedAt=new Date().toISOString(); }
export function starSummary(state,child) {
  const earned=entriesFor(state,child).reduce((n,e)=>n+e.points,0);
  const spent=state.redemptions.filter(r=>r.childId===child&&!r.cancelledAt).reduce((n,r)=>n+r.cost,0);
  return {earned,spent,balance:earned-spent};
}
export function redeem(state,child,rewardId) {
  const reward=state.rewards.find(r=>r.id===rewardId);
  if(!reward||!state.children.some(c=>c.id===child)) throw new Error('선물을 찾을 수 없어요.');
  if(starSummary(state,child).balance<reward.cost) throw new Error('별을 조금 더 모아 주세요.');
  const item={id:uid(),childId:child,rewardId,title:reward.title,cost:reward.cost,at:new Date().toISOString()};
  state.redemptions.push(item); touch(state); return item;
}
export function removeReward(state,rewardId){
  const index=state.rewards.findIndex(reward=>reward.id===rewardId);
  if(index<0)throw new Error('목록에서 선물을 찾을 수 없어요.');
  state.rewards.splice(index,1);
  touch(state);
}
export function cancelRedemption(state,id) { const r=state.redemptions.find(r=>r.id===id); if(r&&!r.cancelledAt){r.cancelledAt=new Date().toISOString();touch(state);} }
export function saveHabit(state,child,id,values,date=today()) {
  if(!state.children.some(c=>c.id===child)) throw new Error('아이를 선택해 주세요.');
  const title=String(values.title||'').trim().slice(0,60);
  if(!title) throw new Error('활동 이름을 적어 주세요.');
  const material=String(values.material||'').trim().slice(0,100);
  const category=values.category?activeCategories(state).find(c=>c.id===values.category):(activeCategories(state).find(c=>c.id==='life')||activeCategories(state)[0]);
  if(!category)throw new Error('사용할 상위 묶음을 골라 주세요.');
  if(['reading','math'].includes(category.type)&&!material)throw new Error('책이나 교재 이름을 적어 주세요.');
  const frequency=values.frequency;
  if(!['daily','weekdays','weekly','monthly','once'].includes(frequency)) throw new Error('반복 방법을 선택해 주세요.');
  const days=[...new Set(values.days||[])].map(Number).filter(n=>n>=0&&n<=6);
  if(frequency==='weekdays'&&!days.length) throw new Error('실천할 요일을 골라 주세요.');
  if(frequency==='once'&&(!isDate(values.dueDate)||values.dueDate<date)) throw new Error('오늘 이후의 활동 날짜를 골라 주세요.');
  const v={effectiveFrom:date,title,material,detail:String(values.detail||'').trim().slice(0,160),category:category.id,frequency,days,target:Math.min(frequency==='weekly'?7:31,Math.max(1,Math.round(Number(values.target)||1))),points:Math.min(20,Math.max(0,Math.round(Number(values.points)||0)))};
  if(frequency==='once')v.dueDate=values.dueDate;
  if(id){const h=state.habits.find(h=>h.id===id&&h.childId===child);if(!h)throw new Error('활동을 찾을 수 없어요.');h.versions=h.versions.filter(x=>x.effectiveFrom!==date);h.versions.push(v);delete h.archivedFrom;}
  else state.habits.push({id:uid(),childId:child,versions:[v]});
  touch(state);
}
export function taskLabel(v){return v.material?`${v.material} · ${v.title}`:v.title;}
export function groupByCategory(items,configOf=x=>x,state){
  return allCategories(state).map(category=>({...category,items:items.filter(item=>configOf(item).category===category.id)})).filter(group=>group.items.length);
}
export function groupRecords(records,state){
  return groupByCategory(records,e=>e.snapshot,state).map(group=>{
    const materials=new Map();
    for(const entry of group.items){const title=entry.snapshot.material||entry.snapshot.title;const key=(entry.snapshot.material?'material:':'task:')+title;
      if(!materials.has(key))materials.set(key,{key,title,entries:[]});materials.get(key).entries.push(entry);
    }
    return {...group,materials:[...materials.values()].map(item=>({...item,entries:item.entries.sort((a,b)=>b.date.localeCompare(a.date))}))};
  });
}
export function frequencyLabel(v) {
  if(v.frequency==='daily')return '매일';
  if(v.frequency==='weekly')return `일주일에 ${v.target}번`;
  if(v.frequency==='monthly')return `한 달에 ${v.target}번`;
  if(v.frequency==='once')return `${Number(v.dueDate.slice(5,7))}월 ${Number(v.dueDate.slice(8))}일`;
  return [1,2,3,4,5,6,0].filter(d=>v.days.includes(d)).map(d=>'일월화수목금토'[d]).join(' · ');
}
export function validateState(s) {
  const fail=()=>{throw new Error('이 앱에서 만든 올바른 백업 파일이 아니에요.');};
  if(!s||s.schema!==SCHEMA||!Array.isArray(s.children)||s.children.length<1||s.children.length>8||!Array.isArray(s.habits)||s.habits.length>10000||!s.entries||typeof s.entries!=='object'||Array.isArray(s.entries)||!s.restDays||typeof s.restDays!=='object'||!Array.isArray(s.rewards)||!Array.isArray(s.redemptions)||!s.notes||typeof s.notes!=='object')fail();
  const ids=new Set();const short=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n;
  const categories=s.categories===undefined?defaultCategories():s.categories,categoryIds=new Set();
  if(!Array.isArray(categories)||!categories.length||categories.length>500)fail();
  for(const c of categories){if(!c||typeof c.id!=='string'||!(/^[a-zA-Z0-9_-]{1,100}$/).test(c.id)||categoryIds.has(c.id)||!short(c.label,30)||!c.label.trim()||!Object.hasOwn(CATEGORIES,c.type)||c.archivedFrom!==undefined&&!isDate(c.archivedFrom))fail();categoryIds.add(c.id);}
  const active=categories.filter(c=>!c.archivedFrom);if(!active.length||new Set(active.map(c=>c.label.trim().toLocaleLowerCase())).size!==active.length)fail();
  for(const c of s.children){if(!short(c.id,100)||ids.has(c.id)||!short(c.name,30)||![...ZODIAC_AVATARS.map(([id])=>id),'fox','bear','cat'].includes(c.avatar)||!['independent','together'].includes(c.style))fail();ids.add(c.id);}
  const weeklyPlans=s.weeklyPlans===undefined?[]:s.weeklyPlans,weeklyIds=new Set(),weeklyPairs=new Set();
  if(!Array.isArray(weeklyPlans)||weeklyPlans.length>4000)fail();
  for(const p of weeklyPlans){
    if(!p||!short(p.id,100)||weeklyIds.has(p.id)||!ids.has(p.childId)||!categoryIds.has(p.category)||weeklyPairs.has(`${p.childId}/${p.category}`)||!Array.isArray(p.versions)||!p.versions.length||p.versions.length>1000)fail();
    weeklyIds.add(p.id);weeklyPairs.add(`${p.childId}/${p.category}`);const dates=new Set();
    for(const v of p.versions){if(!v||!isDate(v.effectiveFrom)||dates.has(v.effectiveFrom)||!['daily','days','alternate','off'].includes(v.mode)||!Array.isArray(v.days)||v.days.some(d=>!Number.isInteger(d)||d<0||d>6)||v.mode==='days'&&!v.days.length||!isDate(v.anchorDate))fail();dates.add(v.effectiveFrom);}
  }
  const habits=new Set();
  for(const h of s.habits){if(!short(h.id,100)||habits.has(h.id)||!ids.has(h.childId)||!Array.isArray(h.versions)||!h.versions.length||h.versions.length>1000||h.archivedFrom&&!isDate(h.archivedFrom))fail();habits.add(h.id);
    for(const v of h.versions){if(!isDate(v.effectiveFrom)||!short(v.title,60)||typeof v.detail!=='string'||v.detail.length>160||!categoryIds.has(v.category)||!['daily','weekdays','weekly','monthly','once'].includes(v.frequency)||!Array.isArray(v.days)||v.days.some(d=>!Number.isInteger(d)||d<0||d>6)||v.frequency==='weekdays'&&!v.days.length||!Number.isInteger(v.target)||v.target<1||v.target>31||v.frequency==='weekly'&&v.target>7||!Number.isInteger(v.points)||v.points<0||v.points>20||v.frequency==='once'&&!isDate(v.dueDate))fail();}
  }
  if(Object.keys(s.entries).length>50000||s.redemptions.length>10000||s.rewards.length>200)fail();
  for(const v of s.habits.flatMap(h=>h.versions).concat(Object.values(s.entries).map(e=>e?.snapshot))){if(v?.material!==undefined&&(typeof v.material!=='string'||v.material.length>100))fail();}
  for(const [key,e] of Object.entries(s.entries)){const h=s.habits.find(h=>h.id===e.habitId);if(!ids.has(e.childId)||!h||h.childId!==e.childId||!isDate(e.date)||key!==entryKey(e.childId,e.habitId,e.date)||!Number.isInteger(e.points)||e.points<0||e.points>20||!e.snapshot||!short(e.snapshot.title,60)||!categoryIds.has(e.snapshot.category)||!['daily','weekdays','weekly','monthly','once'].includes(e.snapshot.frequency)||!Array.isArray(e.snapshot.days)||!Number.isInteger(e.snapshot.target)||typeof e.snapshot.detail!=='string')fail();}
  for(const r of s.rewards){if(!short(r.id,100)||!short(r.title,60)||!Number.isInteger(r.cost)||r.cost<1||r.cost>9999)fail();}
  for(const r of s.redemptions){if(!short(r.id,100)||!ids.has(r.childId)||!short(r.title,60)||!Number.isInteger(r.cost)||r.cost<1||r.cost>9999||!Number.isFinite(Date.parse(r.at)))fail();}
  for(const [k,v] of Object.entries(s.restDays)){const [child,date]=k.split('/');if(!ids.has(child)||!isDate(date)||typeof v!=='boolean')fail();}
  for(const [k,v] of Object.entries(s.notes)){const [child,week]=k.split('/');if(!ids.has(child)||!isDate(week)||typeof v!=='string'||v.length>1000)fail();}
  for(const h of s.habits){if(h.dailyPlan!==undefined&&typeof h.dailyPlan!=='boolean'||h.dailyPlan&&h.versions.some(v=>v.frequency!=='once'))fail();}
  return clone({...s,categories,weeklyPlans});
}
