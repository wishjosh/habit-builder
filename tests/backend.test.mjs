import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {freshState} from '../engine.js';
function backend(){
 const sheets=new Map();
 const mk=(name)=>{
   let rows=name==='State'?[['revision',0]]:[];
   return {
     getDataRange:()=>({getValues:()=>structuredClone(rows)}),
     clearContents:()=>rows=[],setFrozenRows:()=>{},
     getRange:(r,c,n,w)=>({setValues:values=>{for(let i=0;i<n;i++)rows[r-1+i]=values[i].slice();}})
   };
 };
 for(const n of ['State','이전 저장','실천 기록','아이와 활동'])sheets.set(n,mk(n));
 const key='a'.repeat(64),properties={SHEET_ID:'test',KEY_HASH:createHash('sha256').update(key).digest('hex')};let released=0;
 const ctx={console,PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties[k]})},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(a,s)=>[...createHash(a).update(s).digest()]},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){released++}})},SpreadsheetApp:{openById:()=>({getSheetByName:n=>sheets.get(n)}),flush(){}}};
 vm.createContext(ctx);vm.runInContext(readFileSync(new URL('../google/Code.gs',import.meta.url),'utf8'),ctx);return {ctx,key,sheets,released:()=>released};
}
test('연결 키 없는 읽기 거절, 처음 상태 읽기',()=>{const {ctx,key}=backend();assert.throws(()=>ctx.bridge({action:'read',key:'wrong'}));assert.equal(ctx.bridge({action:'read',key}).revision,0);});
test('동시 저장 충돌은 기존 기록을 덮어쓰지 않음',()=>{
 const {ctx,key,released}=backend(),state=freshState('2026-09-14');assert.equal(ctx.bridge({action:'write',key,revision:0,state}).revision,1);
 const other=structuredClone(state);other.children[0].name='바뀐 이름';assert.equal(ctx.bridge({action:'write',key,revision:0,state:other}).conflict,true);
 assert.equal(ctx.bridge({action:'read',key}).state.children[0].name,'첫째');assert.equal(released(),3);
});
test('긴 JSON 분할과 수식 방지, 이전 저장본 보존',()=>{
 const {ctx,key,sheets}=backend(),state=freshState('2026-09-14');state.notes.extra='='.repeat(60000);
 ctx.bridge({action:'write',key,revision:0,state});assert.equal(ctx.bridge({action:'read',key}).state.notes.extra,state.notes.extra);
 assert.ok(sheets.get('State').getDataRange().getValues().slice(1).every(r=>r[0].startsWith('#')));
 ctx.bridge({action:'write',key,revision:1,state:freshState('2026-09-14')});assert.equal(ctx.readSnapshot_(sheets.get('이전 저장')).state.notes.extra,state.notes.extra);
 assert.equal(ctx.bridge({action:'read',key}).state.notes.extra,undefined);
});
