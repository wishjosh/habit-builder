import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,today,addDays,weekStart,validateState,starSummary,entryKey,saveWeeklyPlan,saveRoutinePlan,updateRoutinePlan,markDone} from '../engine.js';
import {saveTask,taskRows,taskConfig,flexibleTasks,completeTask,assignFlexible,removeTask,restoreTask,themeFor,themes,saveTheme,moveTheme,removeTheme} from '../work.js';
import {workspace,editorBody} from '../work-ui.js';
import {makeBackup,readBackup} from '../storage.js';
const day=today(),next=addDays(day,1),child='child-1',button=(a,l,c='',attrs='')=>`<button data-action="${a}" ${attrs}>${l}</button>`;
const create=(s,values={},date=day)=>saveTask(s,child,null,date,{title:'눈높이 수학',detail:'4쪽',themeId:'thinking',frequency:'daily',until:'ongoing',...values});
test('하루·주간·목록은 같은 할 일 ID를 사용하며 한 번만 별을 적립한다',()=>{
 const s=freshState(),id=create(s);for(const view of ['day','week','list']){const html=workspace(s,child,{view,day,week:weekStart(day)},button);assert.match(html,new RegExp(`data-id="${id}"`));assert.match(html,/task-edit/);}
 completeTask(s,child,id,day);completeTask(s,child,id,day);assert.equal(starSummary(s,child).earned,1);assert.equal(taskRows(s,'child-2',day).length,0);validateState(s);
});
test('주간 횟수는 날짜를 강요하지 않고 배치와 실천을 구분한다',()=>{
 const s=freshState(),id=create(s,{title:'아빠와 책 읽기',frequency:'weekly',target:2,themeId:'literacy'});
 assert.equal(taskRows(s,child,day).length,0);assert.equal(flexibleTasks(s,child,day)[0].count,0);
 assignFlexible(s,child,id,day);assert.equal(taskRows(s,child,day).length,1);assert.equal(flexibleTasks(s,child,day)[0].count,0);
 completeTask(s,child,id,day);assert.equal(flexibleTasks(s,child,day)[0].count,1);assert.equal(flexibleTasks(s,child,day)[0].planned.length,0);
 assert.equal(flexibleTasks(s,child,addDays(weekStart(day),7))[0].count,0);validateState(s);
});
test('미래 주 중간에 시작하는 날짜 미정 계획도 그 주에 보인다',()=>{
 const s=freshState(),start=addDays(weekStart(day),9);create(s,{frequency:'weekly',target:2},start);
 assert.equal(flexibleTasks(s,child,weekStart(start)).length,1);
});
test('반복 한 날의 책·분량을 바꾸어도 다른 날과 동일한 할 일 ID를 유지한다',()=>{
 const s=freshState(),id=create(s,{title:'책 읽기',material:'해리포터',themeId:'literacy'});
 assert.throws(()=>saveTask(s,child,id,next,{title:'다른 책'},false),/부모/);
 saveTask(s,child,id,next,{title:'책 읽기',material:'톰 소여',detail:'2장',scope:'day'},true);
 assert.equal(taskConfig(s,child,id,day).material,'해리포터');assert.equal(taskRows(s,child,next)[0].config.material,'톰 소여');validateState(s);
});
test('일회 할 일 날짜 이동은 기존 날에서 빠지고 반복 범위 밖에도 나타난다',()=>{
 const s=freshState(),id=create(s,{frequency:'once'});saveTask(s,child,id,day,{date:addDays(day,10),scope:'day'},true);
 assert.equal(taskRows(s,child,day).length,0);assert.equal(taskRows(s,child,addDays(day,10)).length,1);validateState(s);
});
test('옛 묶음 자체 할 일의 날짜 이동과 그만하기가 다음 주까지 일관된다',()=>{
 const s=freshState();saveWeeklyPlan(s,child,'life',{mode:'days',days:[new Date(day+'T12:00:00').getDay()]});
 const id=taskRows(s,child,day)[0].habit.id;saveTask(s,child,id,day,{date:next,scope:'day'},true);
 assert.equal(taskRows(s,child,day).length,0);assert.equal(taskRows(s,child,next).length,1);
 removeTask(s,child,id,next,'future',true);assert.equal(taskRows(s,child,addDays(day,7)).length,0);validateState(s);
});
test('기존 완료의 실제 내용·원래 계획 정정은 별을 늘리지 않는다',()=>{
 const s=freshState(),id=create(s,{title:'레슨 1개',themeId:'language'});completeTask(s,child,id,day);
 saveTask(s,child,id,day,{actualTitle:'레슨 2개',actualNote:'하나 더 했어요'});assert.equal(s.entries[entryKey(child,id,day)].snapshot.title,'레슨 1개');
 saveTask(s,child,id,day,{correctPlan:true,title:'레슨 1개 풀기'},true);const e=s.entries[entryKey(child,id,day)];assert.equal(e.planHistory.length,1);assert.equal(e.actual.title,'레슨 2개');assert.equal(starSummary(s,child).earned,1);validateState(s);
});
test('하루 삭제·복원, 전체 삭제·복원은 기록과 별을 함께 반영한다',()=>{
 const s=freshState(),id=create(s);completeTask(s,child,id,day);removeTask(s,child,id,day,'day',true);
 assert.equal(taskRows(s,child,day).length,0);assert.equal(starSummary(s,child).earned,0);restoreTask(s,s.taskTrash[0].id,true);assert.equal(starSummary(s,child).earned,1);
 removeTask(s,child,id,day,'all',true);assert.equal(s.habits.length,0);assert.equal(starSummary(s,child).earned,0);validateState(s);
 const copy=readBackup(makeBackup(s));restoreTask(copy,copy.taskTrash[0].id,true);assert.equal(starSummary(copy,child).earned,1);validateState(copy);
});
test('반복 종료일과 그만하기는 과거 완료를 보존한다',()=>{
 const s=freshState(),id=create(s,{until:'date',endDate:next});completeTask(s,child,id,day);
 assert.equal(taskRows(s,child,next).length,1);assert.equal(taskRows(s,child,addDays(next,1)).length,0);
 removeTask(s,child,id,next,'future',true);assert.equal(taskRows(s,child,next).length,0);assert.equal(taskRows(s,child,day)[0].entry.points,1);validateState(s);
});
test('옛 반복의 하루 예외가 있어도 이후 계획 수정과 백업은 유효하다',()=>{
 const s=freshState(),id=saveRoutinePlan(s,child,{title:'4쪽',material:'눈높이',category:'math',repeatPattern:'daily',repeatScope:'ongoing'},day);
 updateRoutinePlan(s,child,id,{title:'6쪽',material:'눈높이'},next,'day',true);
 saveTask(s,child,id,day,{scope:'future',title:'새 계획',frequency:'daily',until:'ongoing'},true);validateState(s);readBackup(makeBackup(s));
});
test('지난 실천을 나중에 추가하고 같은 편집창에서 다시 고칠 수 있다',()=>{
 const s=freshState(),past=addDays(day,-1),id=create(s,{frequency:'once',recordAfter:true},past);
 assert.equal(taskRows(s,child,past)[0].entry.habitId,id);assert.match(editorBody(s,child,id,past,button),/실제로 한 일/);assert.throws(()=>completeTask(s,child,id,next),/오늘/);validateState(s);
});
test('기존 영어·수학·일기 활동을 의미에 맞는 성장 주제로 연결한다',()=>{
 const s=freshState();s.categories.push({id:'english',label:'영어',type:'learning'},{id:'diary',label:'일기',type:'life'});
 assert.equal(themeFor(s,{category:'english'}).id,'language');assert.equal(themeFor(s,{category:'math'}).id,'thinking');assert.equal(themeFor(s,{category:'diary'}).id,'life');
});
test('묶음 일정에서 공통 반복으로 바꿔도 과거 완료를 한 번만 표시한다',()=>{
 const s=freshState();saveWeeklyPlan(s,child,'life',{mode:'days',days:[new Date(day+'T12:00:00').getDay()]});const id=taskRows(s,child,day)[0].habit.id;
 completeTask(s,child,id,day);saveTask(s,child,id,next,{scope:'future',title:'일기',frequency:'daily',until:'ongoing'},true);
 assert.equal(taskRows(s,child,next)[0].config.title,'일기');assert.equal(taskRows(s,child,day).length,1);assert.equal(starSummary(s,child).earned,1);validateState(s);
});
test('한 주로 끝났던 반복을 다시 이어도 중간 빈 기간에 할 일이 소급 생성되지 않는다',()=>{
 const s=freshState(),past=addDays(day,-15),end=addDays(day,-10);
 const id=create(s,{frequency:'daily',recordAfter:true,until:'date',endDate:end},past);
 saveTask(s,child,id,day,{scope:'future',frequency:'daily',until:'ongoing'},true);
 assert.equal(taskRows(s,child,addDays(day,-5)).length,0);assert.equal(taskRows(s,child,day).length,1);validateState(s);
});
test('성장 주제의 추가·순서·삭제는 앞으로의 일만 옮기고 과거 실천과 별을 보존한다',()=>{
 const s=freshState(),id=create(s);completeTask(s,child,id,day);saveTheme(s,null,{label:'함께하기',childLabel:'서로 도와요'});const custom=themes(s).at(-1).id;
 moveTheme(s,custom,-1);assert.equal(themes(s).at(-2).id,custom);removeTheme(s,'thinking',custom);
 assert.equal(taskConfig(s,child,id,next).themeId,custom);assert.equal(taskRows(s,child,day)[0].theme.id,'thinking');assert.equal(starSummary(s,child).earned,1);validateState(s);
 const html=workspace(s,child,{view:'day',day},button);assert.match(html,/눈높이 수학/);
});
