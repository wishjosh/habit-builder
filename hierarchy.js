import {themes,themeFor} from './work.js?v=0.4';
import {activeCategories,groupByCategory,groupRecords,habitAt,today,taskLabel,frequencyLabel} from './engine.js';
import {esc,icon} from './ui.js';

const foldStates=new Map();
export function rememberFolds(root){root.querySelectorAll('details[data-fold]').forEach(d=>foldStates.set(d.dataset.fold,d.open));}
export function fold(key,title,meta,content,open=true,extra=''){
  const expanded=foldStates.has(key)?foldStates.get(key):open;
  return `<details class="task-group ${extra}" data-fold="${esc(key)}" ${expanded?'open':''}><summary><span class="fold-chevron" aria-hidden="true">›</span><span class="group-title">${title}</span><span class="group-count">${esc(meta)}</span></summary><div class="group-body">${content}</div></details>`;
}
export function todayGroups(cards,child,date,renderCard,addButton,state){
  return groupByCategory(cards,card=>card.config,state).map(group=>fold(`today/${child}/${group.id}`,`${icon(group.icon)}${esc(group.label)}`,`${group.items.filter(c=>c.entry).length} / ${group.items.length}개 완료`,`<div class="habit-grid">${group.items.map(renderCard).join('')}</div>${date===today()&&!group.archivedFrom?`<div class="group-add">${addButton(group.id)}</div>`:''}`)).join('');
}
export function recordGroups(entries,scope,renderTimeline,state){
  if(!entries.length)return '<div class="empty">실천한 책과 할 일이 이곳에 모여요.</div>';
  return themes(state,true).map(theme=>{
    const rows=entries.filter(e=>themeFor(state,e.snapshot).id===theme.id);if(!rows.length)return '';
    const materials=new Map();for(const e of rows){const title=e.actual?.material||e.snapshot.material||e.actual?.title||e.snapshot.title;if(!materials.has(title))materials.set(title,[]);materials.get(title).push(e);}
    return fold(`${scope}/${theme.id}`,`${icon(theme.icon)}${esc(theme.childLabel)}`,`${rows.length}번 실천`,[...materials].map(([title,list])=>fold(`${scope}/${theme.id}/${title}`,esc(title),`${list.length}번 기록`,renderTimeline(list.sort((a,b)=>b.date.localeCompare(a.date))),false,'material-group')).join(''));
  }).join('');
}
export function parentGroups(habits,child,button,state){
  return activeCategories(state).map(cat=>{
    const id=cat.id;
    const items=habits.filter(h=>(habitAt(h,today())||h.versions.at(-1)).category===id);
    const list=items.map(h=>{const v=habitAt(h,today())||h.versions.at(-1);return `<div class="settings-item"><div class="grow"><strong>${esc(taskLabel(v))}</strong><p>${frequencyLabel(v)} · 별 ${v.points}개<br>${esc(v.detail)}</p></div>${button('edit-habit','수정','text-btn',`data-id="${esc(h.id)}"`)}${button('archive-habit','삭제','text-btn',`data-id="${esc(h.id)}" aria-label="${esc(taskLabel(v))} 할 일 삭제"`)}</div>`;}).join('');
    return fold(`parent/${child}/${id}`,`${icon(cat.icon)}${esc(cat.label)}`,`${items.length}개 할 일`,`${list||'<p>이 묶음에 구체적인 할 일을 넣어 주세요.</p>'}<div class="group-add">${button('add-habit',`${icon('plus')}${esc(cat.label)} 할 일 추가`,'text-btn',`data-category="${esc(id)}"`)}</div>`,items.length>0);
  }).join('');
}
