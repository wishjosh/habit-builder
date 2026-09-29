// Shared task operations. Legacy plans are adapted here; every screen uses this API.
import {UNGROUPED,clone,uid,today,isDate,addDays,weekStart,monthDays,habitAt,weeklyAt,weeklyDue,cardsFor,categoryInfo,activeCategories,entryKey,entriesFor,saveActual,taskLabel,touch} from './engine.js?v=0.4';

export const THEMES=[
 {id:'literacy',label:'문해력',childLabel:'책과 가까워지기',type:'reading',icon:'book',color:'peach'},
 {id:'language',label:'외국어',childLabel:'영어와 친해지기',type:'learning',icon:'pencil',color:'mint'},
 {id:'thinking',label:'사고력',childLabel:'생각하는 힘 기르기',type:'math',icon:'pencil',color:'lavender'},
 {id:'life',label:'생활 습관',childLabel:'내 생활 스스로 하기',type:'life',icon:'sun',color:'yellow'},
 {id:'expression',label:'몸과 표현',childLabel:'움직이고 표현하기',type:'art',icon:'music',color:'pink'},
 {id:'other',label:'그 밖의 활동',childLabel:'새롭게 해 보기',type:'learning',icon:'leaf',color:'mint'}
];
export function themes(state,includeArchived=false){return (state.themes||THEMES).filter(t=>includeArchived||!t.archived);}
export function saveTheme(state,id,values){
 const label=String(values.label||'').trim(),childLabel=String(values.childLabel||label).trim();
 if(!label||label.length>30||childLabel.length>40)throw new Error('주제 이름은 30자, 아이에게 보여 줄 이름은 40자 안으로 적어 주세요.');
 if(themes(state).some(t=>t.id!==id&&t.label===label))throw new Error('같은 이름의 주제가 있어요.');
 state.themes??=clone(THEMES);const theme=state.themes.find(t=>t.id===id&&!t.archived);
 if(id&&!theme)throw new Error('주제를 찾을 수 없어요.');
 if(theme)Object.assign(theme,{label,childLabel});else state.themes.push({id:uid(),label,childLabel,icon:'leaf',color:'mint',type:'learning'});
 touch(state);
}
export function moveTheme(state,id,direction){
 state.themes??=clone(THEMES);const active=themes(state),index=active.findIndex(t=>t.id===id),other=active[index+direction];
 if(![-1,1].includes(direction)||!other)throw new Error('더 옮길 수 없어요.');const a=state.themes.findIndex(t=>t.id===id),b=state.themes.indexOf(other);[state.themes[a],state.themes[b]]=[state.themes[b],state.themes[a]];touch(state);
}
export function removeTheme(state,id,destination){
 if(id===destination||!themes(state).some(t=>t.id===destination))throw new Error('할 일을 옮길 주제를 골라 주세요.');
 state.themes??=clone(THEMES);const target=state.themes.find(t=>t.id===id&&!t.archived);if(!target)throw new Error('주제를 찾을 수 없어요.');
 // Keep completed and past plans in their original theme; only future work moves.
 for(const e of Object.values(state.entries))e.snapshot.themeId||=themeFor(state,e.snapshot).id;
 for(const h of state.habits){for(const v of h.versions)v.themeId||=themeFor(state,v).id;for(const v of Object.values(h.dayChanges||{}))v.themeId||=themeFor(state,v).id;
  const current=habitAt(h,today());if(current?.themeId===id){h.versions=h.versions.filter(v=>v.effectiveFrom!==today());h.versions.push({...current,effectiveFrom:today(),themeId:destination});}
  for(const v of h.versions)if(v.effectiveFrom>=today()&&v.themeId===id)v.themeId=destination;
  for(const [day,v] of Object.entries(h.dayChanges||{}))if(day>=today()&&v.themeId===id)v.themeId=destination;
 }
 for(const c of state.categories||[])if(themeFor(state,{category:c.id}).id===id)c.themeId=destination;
 target.archived=true;touch(state);
}
export function themeFor(state,config){
 const c=categoryInfo(state,config?.category),name=c?.label||'';
 const inferred=/영어|외국어|ORT/i.test(name)?'language':/일기|생활|정리/.test(name)?'life':/독서|책|문해/.test(name)?'literacy':c?.type==='math'?'thinking':c?.type==='reading'?'literacy':['art','movement'].includes(c?.type)?'expression':c?.type==='life'&&!c.internal?'life':'other';
 return themes(state,true).find(t=>t.id===(config?.themeId||c?.themeId||inferred))||themes(state).at(-1)||THEMES.at(-1);
}
export function categoryForTheme(state,theme,id){
 if(id&&categoryInfo(state,id)&&themeFor(state,{category:id}).id===theme)return id;
 return activeCategories(state).find(c=>themeFor(state,{category:c.id}).id===theme)?.id||UNGROUPED;
}
export function taskConfig(state,child,id,day){
 const h=state.habits.find(h=>h.childId===child&&h.id===id),entry=state.entries[entryKey(child,id,day)];
 const p=(!h||h.weeklyFallbackFor)&&(state.weeklyPlans||[]).find(p=>p.childId===child&&`weekly-${p.id}`===id);
 if(entry)return clone(entry.snapshot);
 if(p){
  const v=weeklyAt(p,day);if((!weeklyDue(v,day)&&!h?.dayChanges?.[day]?.dueDate)||h?.omittedDates?.includes(day)||h?.archivedFrom&&day>=h.archivedFrom)return null;
  return {...{effectiveFrom:v?.effectiveFrom||h.versions[0].effectiveFrom,category:p.category,title:categoryInfo(state,p.category)?.label||'할 일',material:'',detail:'',frequency:v?.mode==='days'?'weekdays':v?.mode==='alternate'?'alternate':'daily',days:v?.days||[],anchorDate:v?.anchorDate||day,target:1,points:1},...h?.dayChanges?.[day]};
 }
 return h?habitAt(h,day):null;
}
export function taskRows(state,child,day){
 const cards=cardsFor(state,child,day);
 for(const h of state.habits.filter(h=>h.childId===child&&h.dayChanges?.[day]?.dueDate===day))if(!cards.some(r=>r.habit.id===h.id)&&habitAt(h,day))cards.push({habit:h,config:habitAt(h,day),entry:state.entries[entryKey(child,h.id,day)]});
 const seen=new Set();return cards.flatMap(row=>{
  const h=row.habit,config=taskConfig(state,child,h.id,day);
  if(seen.has(h.id))return [];seen.add(h.id);
  if(!config||h.omittedDates?.includes(day)&&!row.entry)return [];
  if(['weekly','monthly'].includes(config.frequency)&&!row.entry&&!h.scheduledDates?.includes(day))return [];
  return [{...row,config,day,theme:themeFor(state,config)}];
 });
}
export function flexibleTasks(state,child,day){
 return state.habits.filter(h=>h.childId===child).flatMap(h=>{
  const weekEnd=addDays(weekStart(day),6);
  let editDay=day,v=habitAt(h,day);
  if(!v||!['weekly','monthly'].includes(v.frequency)){
   const upcoming=h.versions.filter(v=>v.effectiveFrom>day&&v.effectiveFrom<=weekEnd&&['weekly','monthly'].includes(v.frequency)).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom))[0];
   if(upcoming){editDay=upcoming.effectiveFrom;v=habitAt(h,editDay);}
  }
  if(!v||!['weekly','monthly'].includes(v.frequency))return [];
  const start=v.frequency==='weekly'?weekStart(day):day.slice(0,7)+'-01',end=v.frequency==='weekly'?addDays(start,6):monthDays(day.slice(0,7)).at(-1);
  const records=entriesFor(state,child,start,end).filter(e=>e.habitId===h.id);
  return [{habit:h,config:v,editDay,start,end,count:records.length,planned:(h.scheduledDates||[]).filter(d=>d>=start&&d<=end&&habitAt(h,d)&&!state.entries[entryKey(child,h.id,d)]),theme:themeFor(state,v)}];
 });
}
function requireParent(allowed){if(!allowed)throw new Error('부모님과 함께 확인해 주세요.');}
function getHabit(state,child,id,day){
 let h=state.habits.find(h=>h.id===id&&h.childId===child);
 if(!h){const p=(state.weeklyPlans||[]).find(p=>p.childId===child&&`weekly-${p.id}`===id),config=taskConfig(state,child,id,day);if(p&&config){h={id,childId:child,weeklyFallbackFor:p.id,versions:[config]};state.habits.push(h);}}
 if(!h)throw new Error('할 일을 찾을 수 없어요.');return h;
}
function content(state,values,old={}){
 const title=String(values.title??old.title??'').trim(),material=String(values.material??old.material??'').trim(),detail=String(values.detail??old.detail??'').trim();
 if(!title||title.length>60||material.length>100||detail.length>160)throw new Error('할 일은 1~60자, 책·교재는 100자, 분량·메모는 160자 안으로 적어 주세요.');
 const themeId=themes(state).some(t=>t.id===values.themeId)?values.themeId:themeFor(state,old).id;
 return {title,material,detail,themeId,category:categoryForTheme(state,themeId,old.category||values.category)};
}
function schedule(values,day,old={}){
 if(!isDate(day))throw new Error('날짜를 확인해 주세요.');
 const frequency=values.frequency||old.frequency||'once',days=[...new Set((values.days||old.days||[]).map(Number))];
 if(!['once','daily','weekdays','alternate','weekly','monthly'].includes(frequency))throw new Error('반복 방법을 골라 주세요.');
 if(frequency==='weekdays'&&(!days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6)))throw new Error('할 요일을 골라 주세요.');
 const target=Number(values.target??old.target??2);
 if(!Number.isInteger(target)||target<1||target>(frequency==='weekly'?7:31))throw new Error('목표 횟수를 확인해 주세요.');
 return {frequency,days:frequency==='weekdays'?days:[],target,anchorDate:day,...frequency==='once'?{dueDate:day}:{}};
}
function setEnd(h,values,day){
 if(values.until==='date'){if(!isDate(values.endDate)||values.endDate<day)throw new Error('종료일을 시작일 이후로 정해 주세요.');h.repeatUntil=addDays(values.endDate,1);}
 else if(values.until==='week')h.repeatUntil=addDays(weekStart(day),7);
 else delete h.repeatUntil;
}
export function saveTask(state,child,id,day,values,parent=false){
 if(!state.children.some(c=>c.id===child)||!isDate(day))throw new Error('아이와 날짜를 확인해 주세요.');
 const nextDay=values.date||day;
 if(!isDate(nextDay))throw new Error('날짜를 확인해 주세요.');
 if(!id){
  if(nextDay<today()&&!values.recordAfter)throw new Error('지난 날짜는 실천 기록으로 남겨 주세요.');
  const v={effectiveFrom:nextDay,...content(state,values),...schedule(values,nextDay),points:1};
  const h={id:uid(),childId:child,unified:true,versions:[v]};setEnd(h,values,nextDay);if(v.frequency==='once')delete h.repeatUntil;
  state.habits.push(h);if(values.recordAfter)completeTask(state,child,h.id,nextDay);touch(state);return h.id;
 }
 const h=getHabit(state,child,id,day),entry=state.entries[entryKey(child,id,day)],old=taskConfig(state,child,id,day)||habitAt(h,day)||h.versions.at(-1);
 if(entry){
  saveActual(state,child,id,day,{title:values.actualTitle??entry.actual?.title??entry.snapshot.title,material:values.actualMaterial??entry.actual?.material??entry.snapshot.material??'',note:values.actualNote??entry.actual?.note??''});
  if(values.correctPlan){requireParent(parent);entry.planHistory??=[];entry.planHistory.push({at:new Date().toISOString(),snapshot:clone(entry.snapshot)});entry.snapshot={...entry.snapshot,...content(state,values,entry.snapshot)};}
  return id;
 }
 requireParent(parent);
 const changed=content(state,values,old);
 const scope=values.scope||'day';
 if(scope==='future'&&day<today())throw new Error('지난 계획은 이날의 내용만 고쳐 주세요.');
 if(scope==='future'){
  if(h.weeklyFallbackFor){const p=state.weeklyPlans.find(p=>p.id===h.weeklyFallbackFor),versions=[...p.versions].sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));
   h.versions=versions.filter(v=>v.mode!=='off'&&v.effectiveFrom<day).map(v=>({...old,...content(state,{},old),effectiveFrom:v.effectiveFrom,frequency:v.mode==='days'?'weekdays':v.mode==='alternate'?'alternate':'daily',days:v.days,anchorDate:v.anchorDate,...versions.find(n=>n.effectiveFrom>v.effectiveFrom)?{untilDate:versions.find(n=>n.effectiveFrom>v.effectiveFrom).effectiveFrom}:{}}));
   p.versions=p.versions.filter(v=>v.effectiveFrom<day);p.versions.push({effectiveFrom:day,mode:'off',days:[],anchorDate:day});delete h.weeklyFallbackFor;}
  // Existing entries keep their snapshots; future schedules share one task identity.
  h.unified=true;delete h.dailyPlan;delete h.routinePlan;delete h.repeatScope;
  if(h.replacesHabitId){delete h.replacesHabitId;}
  h.versions=h.versions.filter(v=>v.effectiveFrom<day);if(h.repeatUntil)for(const v of h.versions)v.untilDate=v.untilDate&&v.untilDate<h.repeatUntil?v.untilDate:h.repeatUntil;
  const version={...old,...changed,...schedule(values,nextDay,old),effectiveFrom:day};delete version.untilDate;h.versions.push(version);setEnd(h,values,nextDay);
  if(h.archivedFrom&&h.archivedFrom>=day)delete h.archivedFrom;
 }else{
  h.dayChanges??={};
  if(nextDay!==day){
   if(state.entries[entryKey(child,id,nextDay)]||taskRows(state,child,nextDay).some(r=>r.habit.id===id))throw new Error('옮길 날짜에 같은 할 일이 있어요. 다른 날짜를 골라 주세요.');
   h.omittedDates=[...new Set([...(h.omittedDates||[]),day])];
   // A moved occurrence is an explicit exception, including days outside the repeat range.
   h.dayChanges[nextDay]={...old,...changed,frequency:'once',dueDate:nextDay};
  }else h.dayChanges[day]={...changed};
 }
 touch(state);return id;
}
export function assignFlexible(state,child,id,day){
 const h=getHabit(state,child,id,day),v=habitAt(h,day);
 if(!isDate(day)||day<today()||!v||!['weekly','monthly'].includes(v.frequency))throw new Error('계획할 날짜를 확인해 주세요.');
 h.scheduledDates=[...new Set([...(h.scheduledDates||[]),day])].sort();touch(state);
}
export function completeTask(state,child,id,day){
 if(!isDate(day)||day>today())throw new Error('오늘 또는 지난 날짜에 실천을 표시해 주세요.');
 if(state.restDays[`${child}/${day}`])throw new Error('쉬는 날을 취소한 뒤 실천을 표시해 주세요.');
 const key=entryKey(child,id,day);if(state.entries[key])return false;
 const h=getHabit(state,child,id,day),config=taskConfig(state,child,id,day);
 if(!config||h.omittedDates?.includes(day))throw new Error('이날의 할 일을 찾을 수 없어요.');
 const isFlex=['weekly','monthly'].includes(config.frequency);
 if(!isFlex&&!taskRows(state,child,day).some(r=>r.habit.id===id))throw new Error('이날의 할 일을 찾을 수 없어요.');
 state.entries[key]={id:uid(),childId:child,habitId:id,date:day,points:config.points,snapshot:{...clone(config),themeId:themeFor(state,config).id},recordedAt:new Date().toISOString()};
 touch(state);return true;
}
export function removeTask(state,child,id,day,scope,parent=false){
 requireParent(parent);const h=getHabit(state,child,id,day);
 if(scope==='future'){
  if(h.weeklyFallbackFor){const p=state.weeklyPlans.find(p=>p.id===h.weeklyFallbackFor);p.versions=p.versions.filter(v=>v.effectiveFrom<day);p.versions.push({effectiveFrom:day,mode:'off',days:[],anchorDate:day});}
  if(day<today())throw new Error('오늘부터 반복을 그만할 수 있어요.');h.archivedFrom=day;
  for(const other of state.habits.filter(x=>x.replacesHabitId===id)){if(other.versions.at(-1).dueDate>=day)other.archivedFrom=day;}
  touch(state);return;
 }
 state.taskTrash??=[];
 if(scope==='all'){
  const ids=new Set([id,...state.habits.filter(x=>x.replacesHabitId===id).map(x=>x.id)]),habits=state.habits.filter(x=>ids.has(x.id));
  const plans=(state.weeklyPlans||[]).filter(p=>habits.some(h=>h.weeklyFallbackFor===p.id));
  const records=Object.entries(state.entries).filter(([,e])=>ids.has(e.habitId));
  state.taskTrash.push({id:uid(),kind:'all',childId:child,title:taskLabel(h.versions.at(-1)),at:new Date().toISOString(),habits:clone(habits),plans:clone(plans),records:clone(records)});
  state.habits=state.habits.filter(x=>!ids.has(x.id));state.weeklyPlans=state.weeklyPlans.filter(p=>!plans.some(x=>x.id===p.id));records.forEach(([key])=>delete state.entries[key]);
 }else{
  const key=entryKey(child,id,day),entry=state.entries[key];
  state.taskTrash.push({id:uid(),kind:'day',childId:child,habitId:id,day,title:taskLabel(taskConfig(state,child,id,day)||h.versions.at(-1)),at:new Date().toISOString(),entry:entry?clone(entry):null});
  delete state.entries[key];h.omittedDates=[...new Set([...(h.omittedDates||[]),day])];
 }
 touch(state);
}
export function restoreTask(state,id,parent=false){
 requireParent(parent);const item=state.taskTrash?.find(x=>x.id===id);if(!item)throw new Error('복원할 할 일을 찾을 수 없어요.');
 if(item.kind==='all'){
  if(item.habits.some(h=>state.habits.some(x=>x.id===h.id))||item.plans.some(p=>state.weeklyPlans.some(x=>x.id===p.id||x.childId===p.childId&&x.category===p.category)))throw new Error('같은 일정이 있어 바로 복원할 수 없어요.');
  state.habits.push(...clone(item.habits));state.weeklyPlans.push(...clone(item.plans));for(const [key,e] of item.records)state.entries[key]=clone(e);
 }else{
  const h=state.habits.find(h=>h.id===item.habitId&&h.childId===item.childId);if(!h)throw new Error('먼저 이 활동 전체를 복원해 주세요.');
  h.omittedDates=(h.omittedDates||[]).filter(d=>d!==item.day);if(item.entry)state.entries[entryKey(item.childId,h.id,item.day)]=clone(item.entry);
 }
 state.taskTrash=state.taskTrash.filter(x=>x.id!==id);touch(state);
}
