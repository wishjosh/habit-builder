import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,today,addDays,weekStart,clone,saveWeeklyPlan,canResetStoppedWeeklyPlan,weeklyAt,weeklyDue,dailyGroupsFor,saveDailyPlan,recentDailyPlans,weeklyCopyDates,copyDailyPlanToWeek,removeDailyPlan,markDone,undoDone,starSummary,entriesFor,groupRecords,recentMaterials,historyHabits,missedPlansFor,stopHabit,eraseHabit,redeem,validateState,deleteCategory,cardsFor,saveHabit} from '../engine.js';
import {makeBackup,readBackup,persist,STORE_KEY,BACKUP_KEY} from '../storage.js';
import {plannedItems,pastItems,taskManagerScreen,weeklyScreen} from '../planner-ui.js';
import {sampleState} from './fixtures.mjs';
const day=today(),tomorrow=addDays(day,1),child='child-1';
test('설정 목록은 두 아이의 주간·날짜별·기존 반복 계획을 함께 모으고 아이별로 거른다',()=>{
 const s=freshState(day);
 saveWeeklyPlan(s,'child-1','reading',{mode:'daily'});
 const dailyId=saveDailyPlan(s,'child-2',null,{category:'math',material:'눈높이 A1',title:'2쪽 풀기'},tomorrow);
 saveHabit(s,'child-1',null,{category:'life',title:'정리하기',frequency:'weekly',target:3,points:1});
 const rows=plannedItems(s,day);
 assert.deepEqual(new Set(rows.map(row=>row.kind)),new Set(['weekly','daily','legacy']));
 assert.equal(rows.find(row=>row.id===dailyId).childId,'child-2');
 assert.equal(rows.find(row=>row.id===dailyId).nextDate,tomorrow);
 const button=(action,label,cls='',attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`;
 const byDate=taskManagerScreen(s,'date','child-2',button,day);
 assert.match(byDate,/눈높이 A1/);assert.doesNotMatch(byDate,/정리하기/);
 assert.match(byDate,/data-action="manager-edit"/);
 const byCategory=taskManagerScreen(s,'category','all',button,day);
 assert.match(byCategory,/상위 묶음별/);assert.match(byCategory,/정리하기/);
});
test('묶음 일정만 정하면 빈 세부 계획 칸이 나오고, 아이별로 분리',()=>{
 const s=freshState(day);assert.equal(s.habits.length,0);
 saveWeeklyPlan(s,child,'reading',{mode:'daily'});
 assert.equal(dailyGroupsFor(s,child,day)[0].items.length,0);
 assert.equal(dailyGroupsFor(s,child,tomorrow)[0].id,'reading');
 assert.equal(dailyGroupsFor(s,'child-2',day).length,0);
 assert.throws(()=>markDone(s,child,s.weeklyPlans[0].id,day));assert.equal(starSummary(s,child).balance,0);
});
test('월수금과 격일은 달·주·연도 경계를 넘어 일정 유지',()=>{
 const days={mode:'days',days:[1,3,5]};
 assert.equal(weeklyDue(days,'2026-09-28'),true);assert.equal(weeklyDue(days,'2026-09-29'),false);
 const alternate={mode:'alternate',days:[],anchorDate:'2026-12-30'};
 assert.equal(weeklyDue(alternate,'2026-12-29'),false);assert.equal(weeklyDue(alternate,'2026-12-30'),true);
 assert.equal(weeklyDue(alternate,'2027-01-01'),true);assert.equal(weeklyDue(alternate,'2027-01-04'),false);
 assert.equal(weeklyDue({...alternate,anchorDate:'2024-02-28'},'2024-03-01'),true);
});
test('일요일에도 다음 주를 선택해 월요일부터 변경하고 이번 주 일정은 보존',()=>{
 const s=freshState(day),nextStart=addDays(weekStart(day),7),button=(action,label,cls='',attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`;
 assert.equal(weekStart('2026-09-27'),'2026-09-21');
 const html=weeklyScreen(s,s.children[0],button,nextStart);
 assert.match(html,/다음 주/);assert.match(html,new RegExp(`data-start="${nextStart}"`));assert.match(html,/aria-pressed="true"/);
 saveWeeklyPlan(s,child,'reading',{mode:'daily'});
 saveWeeklyPlan(s,child,'reading',{mode:'days',days:[1,3,5]},true,nextStart);
 assert.equal(weeklyAt(s.weeklyPlans[0],day).mode,'daily');
 assert.equal(weeklyAt(s.weeklyPlans[0],nextStart).mode,'days');
 saveWeeklyPlan(s,child,'reading',{mode:'alternate',anchorDate:day},true,day);
 assert.equal(weeklyAt(s.weeklyPlans[0],nextStart).mode,'days');
 assert.equal(weeklyDue(weeklyAt(s.weeklyPlans[0],nextStart),nextStart),true);
 assert.equal(weeklyDue(weeklyAt(s.weeklyPlans[0],addDays(nextStart,1)),addDays(nextStart,1)),false);
 validateState(s);
});
test('할 일 없는 종료 일정은 정하기로 표시하고 기록이 있으면 자동 정리하지 않는다',()=>{
 const s=freshState(day),button=(action,label,cls='',attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`;
 saveWeeklyPlan(s,child,'reading',{mode:'daily'});
 saveWeeklyPlan(s,child,'reading',{mode:'off'},true);
 const html=weeklyScreen(s,s.children[0],button);
 assert.match(html,/책 읽기 이번 주 할 일 정하기/);
 assert.doesNotMatch(html,/책 읽기 이번 주 할 일 바꾸기/);
 assert.match(html,/수학 이번 주 할 일 정하기/);
 assert.equal(canResetStoppedWeeklyPlan(s,child,'reading'),true);
 saveDailyPlan(s,child,null,{category:'reading',material:'기록할 책',title:'한 장 읽기'},day);
 assert.equal(canResetStoppedWeeklyPlan(s,child,'reading'),false);
 s.habits=[];
 s.entries.sample={childId:child,snapshot:{category:'reading'}};
 assert.equal(canResetStoppedWeeklyPlan(s,child,'reading'),false);
});
test('주간계획 변경은 부모 확인이 필요하며 이전 일정과 이미 정한 내일 계획 보존',()=>{
 const s=freshState(day);saveWeeklyPlan(s,child,'reading',{mode:'daily'});
 const id=saveDailyPlan(s,child,null,{category:'reading',material:'톰 소여의 모험',title:'3장까지 읽기'},tomorrow);
 const before=clone(s);assert.throws(()=>saveWeeklyPlan(s,child,'reading',{mode:'off'}));assert.deepEqual(s,before);
 saveWeeklyPlan(s,child,'reading',{mode:'off'},true,tomorrow);
 assert.equal(weeklyDue(weeklyAt(s.weeklyPlans[0],day),day),true);
 assert.equal(weeklyDue(weeklyAt(s.weeklyPlans[0],tomorrow),tomorrow),false);
 assert.equal(cardsFor(s,child,tomorrow)[0].habit.id,id);validateState(s);
});
test('내일 계획은 오늘 완료할 수 없고 날짜별 제목·분량·완료가 독립적',()=>{
 const s=freshState(day);saveWeeklyPlan(s,child,'reading',{mode:'daily'});
 const first=saveDailyPlan(s,child,null,{category:'reading',material:'어린 왕자',title:'1~2장 읽기'},day);
 const next=saveDailyPlan(s,child,null,{category:'reading',material:'어린 왕자',title:'3장 읽기'},tomorrow);
 assert.throws(()=>markDone(s,child,next,tomorrow));assert.throws(()=>markDone(s,child,next,day));
 markDone(s,child,first,day);assert.equal(markDone(s,child,first,day),false);
 assert.equal(starSummary(s,child).balance,1);assert.equal(cardsFor(s,child,tomorrow)[0].config.title,'3장 읽기');
 assert.equal(groupRecords(entriesFor(s,child),s)[0].materials[0].title,'어린 왕자');
 assert.deepEqual(recentMaterials(s,child,'reading'),['어린 왕자']);assert.deepEqual(recentMaterials(s,'child-2','reading'),[]);
 assert.deepEqual(readBackup(makeBackup(s)),s);
});
test('최근 할 일은 아이와 묶음별로 다시 고르고 삭제한 계획은 제안하지 않는다',()=>{
 const s=freshState(day),first=saveDailyPlan(s,child,null,{category:'math',material:'눈높이 수학',title:'4쪽 풀기'},day);
 saveDailyPlan(s,child,null,{category:'math',material:'눈높이 수학',title:'5쪽 풀기'},tomorrow);
 assert.deepEqual(recentDailyPlans(s,child,'math').map(v=>v.title),['5쪽 풀기','4쪽 풀기']);
 assert.deepEqual(recentDailyPlans(s,'child-2','math'),[]);
 stopHabit(s,first,true,day);
 assert.deepEqual(recentDailyPlans(s,child,'math').map(v=>v.title),['5쪽 풀기']);
});
test('같은 묶음의 다른 교재는 같은 날 함께 복사하고 똑같은 할 일만 중복하지 않는다',()=>{
 const s=freshState(day),monday=addDays(weekStart(day),7),wednesday=addDays(monday,2),friday=addDays(monday,4);
 saveWeeklyPlan(s,child,'math',{mode:'days',days:[1,3,5]},false,monday);
 saveHabit(s,child,null,{category:'math',material:'기탄 수학',title:'2쪽 풀기',frequency:'once',dueDate:wednesday,points:1});s.habits.at(-1).dailyPlan=true;
 saveHabit(s,child,null,{category:'math',material:'눈높이 수학',title:'4쪽 풀기',frequency:'once',dueDate:friday,points:1});s.habits.at(-1).dailyPlan=true;
 saveHabit(s,child,null,{category:'math',material:'눈높이 수학',title:'4쪽 풀기',frequency:'once',dueDate:monday,points:1});const source=s.habits.at(-1);source.dailyPlan=true;
 assert.deepEqual(weeklyCopyDates(s,child,'math',monday),[wednesday,friday]);
 assert.deepEqual(copyDailyPlanToWeek(s,child,source.id,monday),[wednesday]);
 assert.deepEqual(copyDailyPlanToWeek(s,child,source.id,monday),[]);
 assert.equal(s.habits.filter(h=>h.dailyPlan&&h.versions.at(-1).dueDate===wednesday).length,2);
 assert.equal(s.habits.filter(h=>h.dailyPlan&&h.versions.at(-1).dueDate===friday).length,1);
 const copied=s.habits.find(h=>h.id!==source.id&&h.versions.at(-1).dueDate===wednesday&&h.versions.at(-1).material==='눈높이 수학');
 assert.equal(copied.versions.at(-1).title,'4쪽 풀기');assert.equal(starSummary(s,child).balance,0);
 assert.throws(()=>saveDailyPlan(s,child,null,{category:'math',material:'눈높이 수학',title:'새 계획'},wednesday));
 saveDailyPlan(s,child,copied.id,{category:'math',material:'눈높이 수학',title:'6쪽 풀기'},wednesday,true);
 assert.equal(copied.versions.at(-1).title,'6쪽 풀기');validateState(s);
});
test('복사할 요일을 고르면 같은 묶음의 세부 할 일이 주간 목록에 각각 보인다',()=>{
 const s=freshState(day),monday=addDays(weekStart(day),7),tuesday=addDays(monday,1),wednesday=addDays(monday,2),thursday=addDays(monday,3);
 const button=(action,label,cls='',attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`;
 saveWeeklyPlan(s,child,'math',{mode:'daily'},false,monday);
 saveHabit(s,child,null,{category:'math',material:'눈높이 수학',title:'4쪽 풀기',frequency:'once',dueDate:monday,points:1});const workbook=s.habits.at(-1);workbook.dailyPlan=true;
 saveHabit(s,child,null,{category:'math',material:'기탄 수학',title:'2쪽 풀기',frequency:'once',dueDate:monday,points:1});const drill=s.habits.at(-1);drill.dailyPlan=true;
 assert.deepEqual(copyDailyPlanToWeek(s,child,workbook.id,monday,[tuesday,wednesday,thursday]),[tuesday,wednesday,thursday]);
 assert.deepEqual(copyDailyPlanToWeek(s,child,drill.id,monday,[wednesday]),[wednesday]);
 assert.throws(()=>copyDailyPlanToWeek(s,child,drill.id,monday,[addDays(monday,7)]));
 const html=weeklyScreen(s,s.children[0],button,monday);
 assert.match(html,/정한 세부 할 일/);assert.match(html,/눈높이 수학/);assert.match(html,/기탄 수학/);
 assert.match(html,new RegExp(`data-action="weekly-open-task"[^>]*data-day="${wednesday}"`));
 assert.equal((html.match(new RegExp(`data-day="${wednesday}"`,'g'))||[]).length,2);
 assert.doesNotMatch(html,/data-child="child-2"/);
 validateState(s);
});
test('세부 계획 수정·삭제는 부모 확인, 완료 기록 변경 방지와 취소 허용',()=>{
 const s=freshState(day),values={category:'math',material:'눈높이 수학',title:'A1권 2쪽 풀기'};
 const id=saveDailyPlan(s,child,null,values,day);
 assert.throws(()=>saveDailyPlan(s,child,id,{...values,title:'1쪽 풀기'},day));
 assert.throws(()=>removeDailyPlan(s,child,id));
 saveDailyPlan(s,child,id,{...values,title:'1쪽 풀기'},day,true);markDone(s,child,id,day);
 const before=clone(s.entries);assert.throws(()=>saveDailyPlan(s,child,id,values,day,true));assert.throws(()=>removeDailyPlan(s,child,id,true));assert.deepEqual(s.entries,before);
 undoDone(s,child,id,day);removeDailyPlan(s,child,id,true);assert.equal(cardsFor(s,child,day).length,0);assert.equal(starSummary(s,child).balance,0);assert.deepEqual(recentMaterials(s,child,'math'),[]);assert.equal(historyHabits(s,child).length,0);
});
test('삭제한 묶음의 주간 일정은 중단하고 완료·별과 옮긴 세부 계획 보존',()=>{
 const s=freshState(day);saveWeeklyPlan(s,child,'reading',{mode:'daily'});
 const id=saveDailyPlan(s,child,null,{category:'reading',material:'읽던 책',title:'1장 읽기'},day);
 markDone(s,child,id,day);deleteCategory(s,'reading','life',day);
 assert.equal(weeklyAt(s.weeklyPlans[0],day).mode,'off');assert.equal(dailyGroupsFor(s,child,tomorrow).some(g=>g.id==='reading'),false);
 assert.equal(groupRecords(entriesFor(s,child),s)[0].id,'reading');assert.equal(starSummary(s,child).balance,1);validateState(s);
});
test('예전 저장본을 불러와도 기존 반복과 기록을 바꾸거나 중복 생성하지 않음',()=>{
 const s=sampleState(day);markDone(s,child,'habit-1',day);delete s.weeklyPlans;
 const loaded=readBackup(makeBackup(s));assert.deepEqual(loaded.habits,s.habits);assert.deepEqual(loaded.entries,s.entries);assert.deepEqual(loaded.weeklyPlans,[]);
 assert.equal(cardsFor(loaded,child,day).length,cardsFor(s,child,day).length);
});
test('잘못된 일정·다른 아이·잘못된 날짜의 세부 계획을 거절',()=>{
 const s=freshState(day);assert.throws(()=>saveWeeklyPlan(s,child,'reading',{mode:'days',days:[]}));
 assert.throws(()=>saveWeeklyPlan(s,child,'reading',{mode:'alternate',anchorDate:'2026-02-30'}));
 assert.throws(()=>saveDailyPlan(s,child,null,{category:'reading',title:'읽기'},day));
 assert.throws(()=>saveDailyPlan(s,child,null,{category:'life',title:'준비하기'},addDays(day,2)));
 assert.throws(()=>saveDailyPlan(s,child,null,{category:'life',title:'준비하기'},addDays(day,-1)));
 saveWeeklyPlan(s,child,'reading',{mode:'daily'});
 const duplicate=clone(s);duplicate.weeklyPlans.push({...clone(s.weeklyPlans[0]),id:'other'});assert.throws(()=>validateState(duplicate));
 s.weeklyPlans[0].childId='missing';assert.throws(()=>validateState(s));
});

test('지난 할 일은 완료·미실행·취소를 구분하고 주간 묶음만으로 미실행을 만들지 않는다',()=>{
 const s=freshState(day),base=addDays(day,2);
 saveWeeklyPlan(s,child,'reading',{mode:'daily'});
 const missed=saveDailyPlan(s,child,null,{category:'reading',material:'실제 계획한 책',title:'1장 읽기'},day);
 const cancelled=saveDailyPlan(s,child,null,{category:'life',title:'잘못 정한 계획'},tomorrow);
 stopHabit(s,cancelled,true,day);
 assert.deepEqual(missedPlansFor(s,child,day,base).map(item=>item.habit.id),[missed]);
 assert.deepEqual(missedPlansFor(s,child,tomorrow,base),[]);
 const past=pastItems(s,base);
 assert.equal(past.find(item=>item.id===missed).status,'미실행');
 assert.equal(past.find(item=>item.id===cancelled).status,'취소');
 assert.equal(past.some(item=>item.kind==='weekly'),false);
 assert.equal(plannedItems(s,base).some(item=>item.id===missed),false);
 s.restDays[`${child}/${day}`]=true;
 assert.deepEqual(missedPlansFor(s,child,day,base),[]);
 assert.equal(pastItems(s,base).find(item=>item.id===missed).status,'쉬는 날');
 delete s.restDays[`${child}/${day}`];
 const button=(action,label,cls='',attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`;
 const html=taskManagerScreen(s,'date','all',button,base,'past');
 assert.match(html,/지난 할 일/);assert.match(html,/미실행/);assert.match(html,/취소/);
 assert.match(html,/data-action="manager-manage"/);
});

test('중단은 실천과 별을 남기고 잘못 만든 항목 삭제는 실천·별만 없앤다',()=>{
 const s=freshState(day),id=saveDailyPlan(s,child,null,{category:'reading',material:'시험 책',title:'1장 읽기'},day);
 markDone(s,child,id,day);
 s.rewards.push({id:'test-reward',title:'시험 선물',cost:1,icon:'gift'});
 redeem(s,child,'test-reward');
 assert.throws(()=>stopHabit(s,id));
 stopHabit(s,id,true);
 assert.equal(historyHabits(s,child).length,1);
 assert.equal(starSummary(s,child).balance,0);
 assert.equal(pastItems(s).find(item=>item.id===id).status,'완료');
 assert.throws(()=>eraseHabit(s,id));
 assert.deepEqual(eraseHabit(s,id,true),{entries:1,points:1});
 assert.equal(historyHabits(s,child).length,0);
 assert.equal(entriesFor(s,child).length,0);
 assert.equal(starSummary(s,child).balance,-1);
 assert.equal(s.redemptions.length,1);
 assert.deepEqual(recentMaterials(s,child,'reading'),[]);
 validateState(s);
});

test('실천 0번의 지난 시험 항목은 발자국에 보이지 않고 기록에서 지울 수 있다',()=>{
 const s=freshState(day);
 saveHabit(s,child,null,{category:'life',title:'시험 반복',frequency:'daily',points:1});
 const id=s.habits.at(-1).id;
 stopHabit(s,id,true);
 assert.equal(historyHabits(s,child).length,0);
 assert.equal(pastItems(s).find(item=>item.id===id).status,'중단');
 eraseHabit(s,id,true);
 assert.equal(pastItems(s).length,0);
 validateState(s);
});

test('완전히 지울 때 기기의 이전 저장본에서도 시험 항목을 제거한다',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const s=freshState(day),id=saveDailyPlan(s,child,null,{category:'life',title:'시험 계획'},day);
 persist(s,storage);
 const next=clone(s);eraseHabit(next,id,true);
 persist(next,storage,{keepPrevious:false});
 assert.equal(values.has(BACKUP_KEY),false);
 assert.equal(JSON.parse(values.get(STORE_KEY)).habits.length,0);
});
