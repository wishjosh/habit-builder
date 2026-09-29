import {activeCategories,categoryInfo,habitAt,weeklyAt,weeklyDue,weeklyLabel,dailyGroupsFor,cardsFor,scheduled,taskLabel,frequencyLabel,today,addDays,weekStart,datesBetween} from './engine.js?v=0.3';
import {icon,esc} from './ui.js';
import {fold} from './hierarchy.js';

export function planPageSwitch(current,button){
  return `<nav class="plan-page-switch" aria-label="할 일 화면">${[['today','home','오늘 할 일'],['weekly','calendar','이번 주 할 일']].map(([page,symbol,label])=>button('page',`${icon(symbol)}<span>${label}</span>`,page===current?'active':'',`data-page="${page}"${page===current?' aria-current="page"':''}`)).join('')}</nav>`;
}

export function weeklyScreen(state,child,button,selectedStart=weekStart(today())){
  const currentStart=weekStart(today()),nextStart=addDays(currentStart,7),start=selectedStart===nextStart?nextStart:currentStart,week=datesBetween(start,addDays(start,6)),next=start===nextStart;
  const range=day=>`${Number(day.slice(5,7))}/${Number(day.slice(8))}`;
  const weeklyTasks=week.flatMap(d=>cardsFor(state,child.id,d).filter(card=>card.habit.dailyPlan||card.habit.routinePlan).map(card=>({day:d,...card})));
  return `<div class="main-heading"><h1>이번 주 할 일</h1></div>${planPageSwitch('weekly',button)}<div class="weekly-navigation"><div class="tabbar" aria-label="계획할 주">${button('weekly-week','이번 주',next?'':'active',`data-start="${currentStart}" aria-pressed="${!next}"`)}${button('weekly-week','다음 주',next?'active':'',`data-start="${nextStart}" aria-pressed="${next}"`)}</div><strong>${next?'다음 주':'이번 주'} · ${range(start)}~${range(week[6])}</strong></div><p class="planner-intro">${next?'다음 주 할 날을 미리 정해요. 월요일부터 적용되고 이번 주 계획은 그대로예요.':'묶음의 요일을 정하거나, 오늘 할 일에서 반복할 일을 바로 만들 수 있어요.'}<br>일기처럼 묶음 이름이 곧 할 일이라면 요일만 정하세요. 책 읽기처럼 내용이 필요한 날에는 세부 할 일을 정하면 그 항목이 대신 나타나요.</p><div class="weekly-list">${activeCategories(state).map(c=>{
    const plan=(state.weeklyPlans||[]).find(p=>p.childId===child.id&&p.category===c.id),v=weeklyAt(plan,next?start:today());
    const attrs=`data-category="${esc(c.id)}" data-start="${start}"`,active=v&&v.mode!=='off',editLabel=active?'함께 바꾸기':'정하기';
    const tasks=weeklyTasks.filter(card=>card.config.category===c.id);
    const plannedDay=d=>weeklyDue(weeklyAt(plan,d),d)||tasks.some(task=>task.day===d);
    return `<section class="panel weekly-card" data-weekly-category="${esc(c.id)}"><div class="weekly-title"><span class="activity-icon ${c.color}">${icon(c.icon)}</span><div class="grow"><h2>${esc(c.label)}</h2><p>${esc(active?weeklyLabel(v):tasks.length?'세부 할 일로 정했어요':weeklyLabel(v))}</p></div>${active?button('weekly-remove','일정 삭제','text-btn',`${attrs} aria-label="${esc(c.label)} ${next?'다음':'이번'} 주 일정 삭제"`):''}${button('weekly-edit',editLabel,'secondary',`${attrs} aria-label="${esc(c.label)} ${next?'다음':'이번'} 주 할 일 ${editLabel}"`)}</div><div class="weekly-preview" aria-label="${next?'다음':'이번'} 주 일정">${week.map(d=>`<span class="${plannedDay(d)?'planned':''} ${d===today()?'is-today':''}"><small>${'일월화수목금토'[new Date(d+'T12:00:00').getDay()]}</small><b>${Number(d.slice(8))}</b><span aria-label="${plannedDay(d)?'계획 있음':'계획 없음'}">${plannedDay(d)?'●':'·'}</span></span>`).join('')}</div>${tasks.length?`<div class="weekly-tasks"><h3>정한 세부 할 일 <small>${tasks.length}개</small></h3><div class="weekly-task-list">${tasks.map(({day,habit,config,entry})=>button('weekly-open-task',`<span class="weekly-task-date">${range(day)} ${'일월화수목금토'[new Date(day+'T12:00:00').getDay()]}</span><span class="weekly-task-name">${esc(taskLabel(config))}</span><span class="weekly-task-state">${entry?'완료':day<today()?'지난 할 일':'보기 ›'}</span>`,'weekly-task',`data-day="${day}" data-id="${esc(habit.id)}" data-child="${esc(child.id)}" aria-label="${range(day)} ${esc(taskLabel(config))} 날짜별 할 일 보기"`)).join('')}</div></div>`:''}</section>`;
  }).join('')}</div><p class="support-note">${icon('leaf')}정한 일정은 그다음 주에도 이어져요. 변경하거나 그만할 때는 부모님과 함께해요.</p>`;
}

export function dailyScreenGroups(state,child,day,renderCard,button){
  const groups=dailyGroupsFor(state,child,day),canPlan=day>=today()&&day<=addDays(today(),1);
  if(!groups.length)return `<section class="panel empty-plan"><h2>${day===addDays(today(),1)?'내일':'이날'}은 아직 정한 할 일이 없어요</h2><p>위의 할 일 추가 버튼으로 묶음 없이도 바로 정할 수 있어요.</p><div class="button-row">${button('page','이번 주 할 일 보기','secondary','data-page="weekly"')}</div></section>`;
  return groups.map(g=>g.internal?`<section class="standalone-tasks"><h2>묶음 없이 하는 일</h2><div class="habit-grid">${g.items.map(renderCard).join('')}</div></section>`:fold(`today/${child}/${day}/${g.id}`,`${icon(g.icon)}${esc(g.label)}`,g.items.length?`${g.items.filter(c=>c.entry).length} / ${g.items.length}개 완료`:'내용을 정해요',
    `<div class="habit-grid">${g.items.map(renderCard).join('')}</div>${!g.items.length?`<div class="plan-placeholder"><p>${day>today()?'내일':'오늘'} ${esc(g.label)}에서 무엇을 할까요?</p>${canPlan?button('daily-add',`${icon('plus')}할 일 정하기`,'primary',`data-category="${esc(g.id)}" aria-label="${esc(g.label)} 세부 계획 정하기"`):'<small>정한 내용이 없어요.</small>'}</div>`:canPlan&&!g.archivedFrom?`<div class="group-add">${button('daily-add',`${icon('plus')}하나 더 정하기`,'text-btn',`data-category="${esc(g.id)}" aria-label="${esc(g.label)} 할 일 추가"`)}</div>`:''}`)).join('');
}

export function parentCheck(){return '<label class="parent-check"><input type="checkbox" name="parentConfirmed" required><span>부모님과 함께 확인했어요.</span></label>';}

function nextWeeklyDate(plan,base){
  const current=weeklyAt(plan,base);
  if(!current||current.mode==='off')return null;
  if(current.mode==='alternate'&&current.anchorDate>base)return current.anchorDate;
  for(let i=0;i<14;i++){const day=addDays(base,i);if(weeklyDue(weeklyAt(plan,day),day))return day;}
  return null;
}

function nextHabitDate(version,base){
  base=base>version.effectiveFrom?base:version.effectiveFrom;
  if(version.frequency==='once')return version.dueDate;
  if(version.frequency==='daily')return base;
  if(version.frequency==='weekdays'){
    for(let i=0;i<7;i++){const day=addDays(base,i);if(version.days.includes(new Date(day+'T12:00:00').getDay()))return day;}
  }
  return null;
}
function nextRoutineDate(state,habit,base){
  for(let i=0;i<60;i++){
    const day=addDays(base,i),version=habitAt(habit,day);
    if(!scheduled(version,day))continue;
    const replaced=state.habits.some(item=>item.replacesHabitId===habit.id&&item.versions.at(-1).dueDate===day&&(!item.archivedFrom||item.archivedFrom>day||!!state.entries[`${habit.childId}/${item.id}/${day}`]));
    if(!replaced)return day;
  }
  return null;
}

export function plannedItems(state,base=today()){
  const rows=[];
  for(const plan of state.weeklyPlans||[]){
    const category=categoryInfo(state,plan.category),day=nextWeeklyDate(plan,base),version=weeklyAt(plan,base);
    if(!category||category.archivedFrom||!day||!version||version.mode==='off')continue;
    rows.push({kind:'weekly',id:plan.id,childId:plan.childId,category:plan.category,title:`${category.label} 일정`,schedule:weeklyLabel(version),nextDate:day});
  }
  for(const habit of state.habits){
    if(habit.weeklyFallbackFor)continue;
    if(habit.archivedFrom&&habit.archivedFrom<=base||habit.repeatUntil&&habit.repeatUntil<=base)continue;
    const version=habitAt(habit,base)||habit.versions.at(-1);
    if(!version)continue;
    if(habit.dailyPlan){
      if(version.dueDate<base||habit.archivedFrom&&habit.archivedFrom<=version.dueDate)continue;
      rows.push({kind:'daily',id:habit.id,childId:habit.childId,category:version.category,title:taskLabel(version),schedule:'날짜별 할 일',nextDate:version.dueDate,completed:Object.values(state.entries).some(entry=>entry.habitId===habit.id)});
    }else if(habit.routinePlan){
      const nextDate=nextRoutineDate(state,habit,base);
      if(nextDate){const nextVersion=habitAt(habit,nextDate)||version;const end=habit.repeatUntil?addDays(habit.repeatUntil,-1):null;rows.push({kind:'routine',id:habit.id,childId:habit.childId,category:nextVersion.category,title:taskLabel(nextVersion),schedule:`${end?`${Number(end.slice(5,7))}/${Number(end.slice(8))}까지`:'종료일 없음'} · ${frequencyLabel(nextVersion)}`,nextDate,completed:!!state.entries[`${habit.childId}/${habit.id}/${nextDate}`]});}
      for(const skipped of habit.skippedDates||[]){if(skipped>=base&&(!habit.archivedFrom||skipped<habit.archivedFrom)&&(!habit.repeatUntil||skipped<habit.repeatUntil))rows.push({kind:'skipped',id:habit.id,childId:habit.childId,category:version.category,title:taskLabel(version),schedule:'이날만 뺀 할 일',nextDate:skipped});}
    }else{
      if(version.frequency==='once'&&version.dueDate<base)continue;
      rows.push({kind:'legacy',id:habit.id,childId:habit.childId,category:version.category,title:taskLabel(version),schedule:frequencyLabel(version),nextDate:nextHabitDate(version,base)});
    }
  }
  return rows;
}

export function pastItems(state,base=today()){
  const rows=[],entries=Object.values(state.entries);
  for(const habit of state.habits){
    const version=habit.versions.at(-1),recorded=entries.filter(entry=>entry.habitId===habit.id).sort((a,b)=>b.date.localeCompare(a.date));
    if(!version)continue;
    const once=version.frequency==='once';
    if(once){
      const due=version.dueDate;
      if(due>=base&&!recorded.length&&(!habit.archivedFrom||habit.archivedFrom>base))continue;
      const completed=recorded.length>0,rest=state.restDays[`${habit.childId}/${due}`],missed=!completed&&!rest&&due<base&&(!habit.archivedFrom||habit.archivedFrom>due);
      rows.push({kind:habit.dailyPlan?'daily':'legacy',id:habit.id,childId:habit.childId,category:recorded[0]?.snapshot.category||version.category,title:taskLabel(recorded[0]?.snapshot||version),schedule:'날짜별 할 일',nextDate:due,status:completed?'완료':rest?'쉬는 날':missed?'미실행':'취소',completed});
    }else if(habit.archivedFrom&&habit.archivedFrom<=base||habit.repeatUntil&&habit.repeatUntil<=base||recorded.length){
      rows.push({kind:habit.weeklyFallbackFor?'weeklyDone':habit.routinePlan?'routine':'legacy',id:habit.id,childId:habit.childId,category:recorded[0]?.snapshot.category||version.category,title:taskLabel(recorded[0]?.snapshot||version),schedule:habit.weeklyFallbackFor?'주간 묶음 실천':frequencyLabel(version),nextDate:recorded[0]?.date||habit.archivedFrom||habit.repeatUntil,status:recorded.length?`${recorded.length}번 실천${habit.archivedFrom?' · 중단':''}`:habit.repeatUntil?'기간 끝남':'중단',completed:recorded.length>0});
    }
  }
  return rows;
}

export function taskManagerScreen(state,view,filter,button,base=today(),scope='current'){
  const all=scope==='past'?pastItems(state,base):plannedItems(state,base),items=filter==='all'?all:all.filter(item=>item.childId===filter);
  const categoryOrder=new Map(activeCategories(state).map((category,index)=>[category.id,index]));
  const key=item=>view==='date'?(item.nextDate?(scope==='past'?item.nextDate:item.nextDate<base?'past':item.nextDate):'flexible'):item.category;
  const keys=[...new Set(items.map(key))].sort((a,b)=>view==='date'&&scope==='past'?b.localeCompare(a):view==='date'?
    (a==='flexible'||a==='past'?1:0)-(b==='flexible'||b==='past'?1:0)||
    (a==='past'?1:0)-(b==='past'?1:0)||a.localeCompare(b):
    (categoryOrder.get(a)??999)-(categoryOrder.get(b)??999));
  const label=group=>view==='category'?categoryInfo(state,group)?.label||'지난 묶음':group==='flexible'?'날짜를 정하지 않은 반복':group==='past'?'지난 날짜의 할 일':`${Number(group.slice(5,7))}월 ${Number(group.slice(8))}일 ${['일','월','화','수','목','금','토'][new Date(group+'T12:00:00').getDay()]}요일`;
  const row=item=>{
    const person=state.children.find(child=>child.id===item.childId),category=categoryInfo(state,item.category),attrs=`data-kind="${item.kind}" data-id="${esc(item.id)}" data-child="${esc(item.childId)}" data-category="${esc(item.category)}"${item.nextDate?` data-day="${item.nextDate}"`:''}`;
    const actions=scope==='past'?`${item.nextDate&&item.completed?button('manager-open-day','기록 보기','text-btn',attrs):''}${button('manager-manage','정리','text-btn',attrs)}`:item.kind==='skipped'?button('manager-restore','다시 넣기','text-btn',attrs):item.kind==='weekly'?button('manager-edit','수정','text-btn',attrs)+button('manager-delete','일정 삭제','text-btn',attrs):`${item.completed?button('manager-open-day','날짜 보기','text-btn',attrs):button('manager-edit','수정','text-btn',attrs)}${button('manager-manage','정리','text-btn',attrs)}`;
    return `<div class="task-manager-row"><span class="activity-icon ${category?.color||'mint'}">${icon(category?.icon||'leaf')}</span><div class="grow"><strong>${esc(item.title)}</strong><p>${esc(person?.name||'아이')} · ${item.kind==='weekly'?'주간 일정':item.kind==='weeklyDone'?'주간 묶음 실천':item.kind==='daily'?'날짜별 할 일':item.kind==='routine'?'반복할 일':item.kind==='skipped'?'이날만 뺀 할 일':'이전에 만든 할 일'} · ${esc(item.schedule)}${view==='category'&&item.nextDate?` · ${Number(item.nextDate.slice(5,7))}/${Number(item.nextDate.slice(8))}`:''}</p>${item.status?`<span class="task-status">${esc(item.status)}</span>`:''}</div><div class="task-manager-actions">${actions}</div></div>`;
  };
  return `<section class="panel task-manager"><div class="section-head"><div><h2>할 일 목록 관리</h2><p>${scope==='past'?'지난 계획':'현재 계획'} ${items.length}개를 살펴봐요.</p></div>${scope==='current'?button('manager-add',`${icon('plus')}할 일 추가`,'primary'):''}</div><div class="tabbar manager-scope" aria-label="할 일 범위">${[['current','현재 할 일'],['past','지난 할 일']].map(([id,name])=>button('manager-scope',name,scope===id?'active':'',`data-scope="${id}" aria-pressed="${scope===id}"`)).join('')}</div><div class="task-manager-controls"><div class="tabbar" aria-label="목록 보기 방식">${[['date','날짜별'],['category','상위 묶음별']].map(([id,name])=>button('manager-view',name,view===id?'active':'',`data-view="${id}" aria-pressed="${view===id}"`)).join('')}</div><div class="tabbar" aria-label="아이별 목록">${[['all','모두'],...state.children.map(child=>[child.id,child.name])].map(([id,name])=>button('manager-filter',esc(name),filter===id?'active':'',`data-child="${esc(id)}" aria-pressed="${filter===id}"`)).join('')}</div></div><p class="manager-hint">${scope==='past'?'날짜와 결과를 확인하고, 잘못 만든 항목은 부모님과 함께 기록에서 지울 수 있어요.':'반복 일정은 다음 예정일에 한 번 표시해요. 완료한 오늘 할 일도 여기 남아요.'}</p>${keys.length?keys.map(group=>`<div class="task-manager-group"><h3>${esc(label(group))} <small>${items.filter(item=>key(item)===group).length}개</small></h3>${items.filter(item=>key(item)===group).sort((a,b)=>a.childId.localeCompare(b.childId)||a.title.localeCompare(b.title,'ko')).map(row).join('')}</div>`).join(''):`<div class="empty">${scope==='past'?'지난 할 일이 없어요.':'계획한 할 일이 없어요. 위에서 새 할 일을 추가해 보세요.'}</div>`}</section>`;
}
