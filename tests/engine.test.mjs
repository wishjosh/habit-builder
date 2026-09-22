import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,markDone,undoDone,starSummary,redeem,cancelRedemption,saveHabit,habitAt,cardsFor,validateState,weekStart,monthDays,addDays,today} from '../engine.js';
import {loadState,persist,makeBackup,readBackup,toCSV,STORE_KEY,BACKUP_KEY} from '../storage.js';
const day='2026-09-14';
test('완료 중복 적립 방지, 아이별 분리, 취소',()=>{
 const s=freshState(day);assert.equal(markDone(s,'child-1','habit-1',day),true);assert.equal(markDone(s,'child-1','habit-1',day),false);
 assert.equal(starSummary(s,'child-1').balance,1);assert.equal(starSummary(s,'child-2').balance,0);
 assert.throws(()=>markDone(s,'child-2','habit-1',day));undoDone(s,'child-1','habit-1',day);assert.equal(starSummary(s,'child-1').balance,0);
});
test('미래 기록과 일정 밖 요일은 기록하지 않음',()=>{
 const s=freshState(day);assert.throws(()=>markDone(s,'child-1','habit-1',addDays(today(),1)));
 assert.throws(()=>markDone(s,'child-1','habit-2','2026-09-19'));
 assert.equal(cardsFor(s,'child-1','2026-09-19').some(c=>c.habit.id==='habit-2'),false);
});
test('주간 목표는 월요일에 새로 시작하며 초과 적립 방지',()=>{
 const s=freshState(day);for(let i=0;i<3;i++)markDone(s,'child-1','habit-4',addDays(day,i));
 assert.throws(()=>markDone(s,'child-1','habit-4',addDays(day,3)));
 assert.equal(cardsFor(s,'child-1',addDays(day,3)).find(c=>c.habit.id==='habit-4').goalReached,true);
 assert.equal(markDone(s,'child-1','habit-4','2026-09-21'),true);
});
test('활동 수정과 보관 후 과거 기록의 제목, 별 유지',()=>{
 const s=freshState(day);markDone(s,'child-1','habit-1',day);
 saveHabit(s,'child-1','habit-1',{title:'새 활동',detail:'새 기준',frequency:'daily',category:'life',points:5},addDays(day,1));
 assert.equal(habitAt(s.habits[0],day).title,'책과 만나는 시간');assert.equal(starSummary(s,'child-1').balance,1);
 s.habits[0].archivedFrom=addDays(day,2);assert.equal(cardsFor(s,'child-1',day)[0].entry.snapshot.title,'책과 만나는 시간');
 assert.equal(cardsFor(s,'child-1',addDays(day,3)).some(c=>c.habit.id==='habit-1'),false);validateState(s);
});
test('월간 및 한 번 하는 활동 일정',()=>{
 const s=freshState('2026-08-01');saveHabit(s,'child-1',null,{title:'월간',detail:'',frequency:'monthly',target:2,points:1},'2026-08-01');
 const id=s.habits.at(-1).id;markDone(s,'child-1',id,'2026-08-01');markDone(s,'child-1',id,'2026-08-02');
 assert.throws(()=>markDone(s,'child-1',id,'2026-08-03'));assert.equal(markDone(s,'child-1',id,'2026-09-01'),true);
 saveHabit(s,'child-2',null,{title:'나들이',detail:'',frequency:'once',dueDate:day,points:2},day);
 const once=s.habits.at(-1).id;assert.throws(()=>markDone(s,'child-2',once,addDays(day,1)));assert.equal(markDone(s,'child-2',once,day),true);
});
test('선물 사용과 취소, 잔액 부족 거절',()=>{
 const s=freshState(day);s.rewards[0].cost=1;assert.throws(()=>redeem(s,'child-1','reward-1'));
 markDone(s,'child-1','habit-1',day);const r=redeem(s,'child-1','reward-1');assert.equal(starSummary(s,'child-1').balance,0);
 assert.throws(()=>redeem(s,'child-1','reward-1'));cancelRedemption(s,r.id);cancelRedemption(s,r.id);assert.equal(starSummary(s,'child-1').balance,1);
});
test('백업 왕복, 손상된 기록 보존, 이전 저장본',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const s=freshState(day);persist(s,storage);markDone(s,'child-1','habit-1',day);persist(s,storage);
 assert.equal(Object.keys(JSON.parse(map.get(BACKUP_KEY)).entries).length,0);assert.deepEqual(readBackup(makeBackup(s)),s);
 map.set(STORE_KEY,'broken');const result=loadState(storage);assert.equal(result.state,null);assert.equal(map.get(STORE_KEY),'broken');
 assert.throws(()=>readBackup('{"app":"other"}'));
});
test('다른 아이의 기록과 잘못된 날짜가 든 백업 거절',()=>{
 const s=freshState(day);markDone(s,'child-1','habit-1',day);const e=Object.values(s.entries)[0];e.childId='child-2';assert.throws(()=>validateState(s));
 const s2=freshState(day);s2.habits[0].versions[0].effectiveFrom='2026-02-30';assert.throws(()=>validateState(s2));
});
test('윤년과 주간 경계, CSV 수식 보호',()=>{
 assert.equal(monthDays('2024-02').length,29);assert.equal(weekStart('2026-09-20'),day);
 const s=freshState(day);s.children[0].name='=1+1';markDone(s,'child-1','habit-1',day);assert.ok(toCSV(s).includes("'=1+1"));
});
