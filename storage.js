import {freshState,validateState,categoryInfo} from './engine.js';
export const STORE_KEY='habit-builder:state:v1';
export const BACKUP_KEY='habit-builder:previous:v1';
export function loadState(storage=localStorage) {
  let raw;
  try { raw=storage.getItem(STORE_KEY); } catch {return {state:freshState(),warning:'이 브라우저에서는 기록을 저장할 수 없어요. 일반 Safari 창에서 열어 주세요.',writable:false};}
  if(!raw)return {state:freshState(),writable:true};
  try{return {state:validateState(JSON.parse(raw)),writable:true};}
  catch{return {state:null,warning:'저장된 기록을 읽을 수 없어요. 기존 기록은 지우지 않았어요.',raw,writable:false};}
}
export function persist(state,storage=localStorage,{keepPrevious=true}={}) {
  const valid=validateState(state);
  const old=storage.getItem(STORE_KEY);
  if(old&&keepPrevious)storage.setItem(BACKUP_KEY,old);
  storage.setItem(STORE_KEY,JSON.stringify(valid));
  if(!keepPrevious)storage.removeItem(BACKUP_KEY);
  return valid;
}
export function makeBackup(state) {return JSON.stringify({app:'habit-builder',version:1,exportedAt:new Date().toISOString(),state},null,2);}
export function readBackup(text) {const parsed=JSON.parse(text);if(parsed.app!=='habit-builder'||parsed.version!==1)throw new Error('습관 형성 시스템의 백업 파일을 선택해 주세요.');return validateState(parsed.state);}
export function toCSV(state,child) {
  const protect=x=>{let s=String(x??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const rows=[['날짜','아이','상위 묶음','책·교재','할 일·분량','완료 기준','별']];
  for(const e of Object.values(state.entries).filter(e=>!child||e.childId===child).sort((a,b)=>a.date.localeCompare(b.date)))rows.push([e.date,state.children.find(c=>c.id===e.childId)?.name,categoryInfo(state,e.snapshot.category).label,e.snapshot.material||'',e.snapshot.title,e.snapshot.detail,e.points]);
  return '\uFEFF'+rows.map(r=>r.map(protect).join(',')).join('\r\n');
}
