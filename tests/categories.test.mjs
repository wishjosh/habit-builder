import {sampleState as freshState} from './fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {clone,saveCategory,deleteCategory,categoryInfo,categoryHabits,activeCategories,saveHabit,habitAt,markDone,cardsFor,entriesFor,groupRecords,starSummary,validateState} from '../engine.js';
import {makeBackup,readBackup,toCSV,loadState,STORE_KEY} from '../storage.js';
const day='2026-09-14',next='2026-09-15';
test('직접 만든 묶음에 두 아이의 할 일을 넣고 완료·백업·이름 변경',()=>{
  const s=freshState(day),id=saveCategory(s,null,{label:'영어 그림책',type:'reading'});
  for(const child of s.children)saveHabit(s,child.id,null,{title:'한 장 읽기',material:'My Book',category:id,frequency:'daily',points:2},day);
  const h=s.habits.at(-2);markDone(s,'child-1',h.id,day);
  assert.equal(categoryHabits(s,id,day).length,2);
  assert.equal(groupRecords(entriesFor(s,'child-1'),s)[0].label,'영어 그림책');
  assert.equal(entriesFor(s,'child-2').length,0);
  saveCategory(s,id,{label:'영어 읽기',type:'reading'});
  assert.equal(categoryInfo(s,id).label,'영어 읽기');assert.equal(groupRecords(entriesFor(s,'child-1'),s)[0].label,'영어 읽기');
  assert.match(toCSV(s),/영어 읽기/);assert.deepEqual(readBackup(makeBackup(s)),s);
  assert.throws(()=>saveHabit(s,'child-1',null,{title:'읽기',category:id,frequency:'daily'},day),/책이나 교재/);
});
test('묶음 삭제는 두 아이의 현재·미래 할 일을 옮기고 과거 일정·완료·별 보존',()=>{
  const s=freshState(day),id=saveCategory(s,null,{label:'이동할 묶음',type:'life'});
  for(const child of s.children)saveHabit(s,child.id,null,{title:'연습',category:id,frequency:'daily',points:3},day);
  const [h1,h2]=s.habits.slice(-2);
  h2.versions.push({...clone(h2.versions[0]),effectiveFrom:'2026-09-17',title:'다음 연습'});
  markDone(s,'child-1',h1.id,day);markDone(s,'child-1',h1.id,next);
  const entries=clone(s.entries),balance=starSummary(s,'child-1');
  const before=clone(s);assert.throws(()=>deleteCategory(s,id,id,next));assert.deepEqual(s,before);
  assert.equal(deleteCategory(s,id,'life',next),2);
  assert.equal(habitAt(h1,day).category,id);assert.equal(habitAt(h1,next).category,'life');
  assert.equal(habitAt(h2,'2026-09-17').category,'life');
  assert.deepEqual(s.entries,entries);assert.deepEqual(starSummary(s,'child-1'),balance);
  assert.equal(cardsFor(s,'child-1',next).find(c=>c.habit.id===h1.id).config.category,id);
  assert.equal(activeCategories(s).some(c=>c.id===id),false);
  assert.equal(groupRecords(entriesFor(s,'child-1'),s)[0].label,'이동할 묶음');assert.match(toCSV(s),/이동할 묶음/);
  assert.deepEqual(readBackup(makeBackup(s)),s);
  assert.throws(()=>saveHabit(s,'child-1',null,{title:'잘못된 추가',category:id,frequency:'daily'},next));
});
test('빈 묶음 삭제, 중복 이름 거절, 마지막 묶음 보호',()=>{
  const s=freshState(day),id=saveCategory(s,null,{label:'잠깐',type:'life'});
  assert.throws(()=>saveCategory(s,null,{label:' 잠깐 ',type:'art'}));
  assert.throws(()=>saveCategory(s,null,{label:'  ',type:'life'}));
  assert.throws(()=>saveCategory(s,null,{label:'잘못된 방식',type:'toString'}));
  assert.equal(deleteCategory(s,id,null,day),0);
  const newId=saveCategory(s,null,{label:'잠깐',type:'art'});assert.notEqual(newId,id);
  for(const c of activeCategories(s).filter(c=>c.id!==newId))deleteCategory(s,c.id,newId,day);
  assert.throws(()=>deleteCategory(s,newId,null,day),/하나 이상/);assert.equal(activeCategories(s).length,1);validateState(s);
});
test('이전 저장 형식에 기본 묶음을 보충하고 기록을 유지',()=>{
  const s=freshState(day);markDone(s,'child-1','habit-1',day);delete s.categories;
  const raw=JSON.stringify(s),loaded=loadState({getItem:key=>key===STORE_KEY?raw:null});
  assert.equal(activeCategories(loaded.state).length,6);assert.deepEqual(loaded.state.entries,s.entries);assert.equal(s.categories,undefined);
  const backup=readBackup(makeBackup(s));assert.equal(categoryInfo(backup,'reading').label,'책 읽기');
});
test('손상된 묶음이나 알 수 없는 묶음의 기록은 복구 시 거절',()=>{
  const s=freshState(day);
  for(const broken of [[],null,[{id:'bad/id',label:'이름',type:'life'}],[{id:'x',label:'이름',type:'constructor'}]]){
    const altered=clone(s);altered.categories=broken;assert.throws(()=>validateState(altered));
  }
  const duplicate=clone(s);duplicate.categories.push(clone(duplicate.categories[0]));assert.throws(()=>validateState(duplicate));
  const unknown=clone(s);unknown.habits[0].versions[0].category='missing';assert.throws(()=>validateState(unknown));
  markDone(s,'child-1','habit-1',day);Object.values(s.entries)[0].snapshot.category='missing';assert.throws(()=>validateState(s));
});
