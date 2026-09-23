import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,today,addDays,clone,saveWeeklyPlan,weeklyAt,weeklyDue,dailyGroupsFor,saveDailyPlan,removeDailyPlan,markDone,undoDone,starSummary,entriesFor,groupRecords,recentMaterials,historyHabits,validateState,deleteCategory,cardsFor,saveHabit} from '../engine.js';
import {makeBackup,readBackup} from '../storage.js';
import {plannedItems,taskManagerScreen} from '../planner-ui.js';
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
