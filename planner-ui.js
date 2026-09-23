import {activeCategories,categoryInfo,habitAt,weeklyAt,weeklyDue,weeklyLabel,dailyGroupsFor,taskLabel,frequencyLabel,today,addDays,weekStart,datesBetween} from './engine.js';
import {icon,esc} from './ui.js';
import {fold} from './hierarchy.js';

export function planPageSwitch(current,button){
  return `<nav class="plan-page-switch" aria-label="할 일 화면">${[['today','home','오늘 할 일'],['weekly','calendar','이번 주 할 일']].map(([page,symbol,label])=>button('page',`${icon(symbol)}<span>${label}</span>`,page===current?'active':'',`data-page="${page}"${page===current?' aria-current="page"':''}`)).join('')}</nav>`;
}

export function weeklyScreen(state,child,button){
  const start=weekStart(today()),week=datesBetween(start,addDays(start,6));
  return `<div class="main-heading"><h1>이번 주 할 일</h1></div>${planPageSwitch('weekly',button)}<p class="planner-intro">어느 날 무엇을 할까요? 묶음별로 할 날만 골라요.<br>책 이름과 분량은 오늘이나 내일의 계획에서 정해요.</p><div class="weekly-list">${activeCategories(state).map(c=>{
    const plan=(state.weeklyPlans||[]).find(p=>p.childId===child.id&&p.category===c.id),v=weeklyAt(plan,today());
    return `<section class="panel weekly-card" data-weekly-category="${esc(c.id)}"><div class="weekly-title"><span class="activity-icon ${c.color}">${icon(c.icon)}</span><div class="grow"><h2>${esc(c.label)}</h2><p>${esc(weeklyLabel(v))}</p></div>${v&&v.mode!=='off'?button('weekly-remove','일정 삭제','text-btn',`data-category="${esc(c.id)}" aria-label="${esc(c.label)} 이번 주 일정 삭제"`):''}${button('weekly-edit',plan?'함께 바꾸기':'정하기','secondary',`data-category="${esc(c.id)}" aria-label="${esc(c.label)} ${plan?'이번 주 할 일 바꾸기':'이번 주 할 일 정하기'}"`)}</div><div class="weekly-preview" aria-label="이번 주 일정">${week.map(d=>`<span class="${weeklyDue(weeklyAt(plan,d),d)?'planned':''} ${d===today()?'is-today':''}"><small>${'일월화수목금토'[new Date(d+'T12:00:00').getDay()]}</small><b>${Number(d.slice(8))}</b><span aria-label="${weeklyDue(weeklyAt(plan,d),d)?'계획 있음':'계획 없음'}">${weeklyDue(weeklyAt(plan,d),d)?'●':'·'}</span></span>`).join('')}</div></section>`;
  }).join('')}</div><p class="support-note">${icon('leaf')}정한 일정은 다음 주에도 이어져요. 변경하거나 그만할 때는 부모님과 함께해요.</p>`;
}

export function dailyScreenGroups(state,child,day,renderCard,button){
  const groups=dailyGroupsFor(state,child,day),canPlan=day>=today()&&day<=addDays(today(),1);
  if(!groups.length)return `<section class="panel empty-plan"><h2>${day>today()?'내일':'이날'}은 정한 묶음이 없어요</h2><p>이번 주 할 일에서 할 날을 정하면 이곳에 나타나요.</p><div class="button-row">${button('page','이번 주 할 일 정하기','primary','data-page="weekly"')}${canPlan?button('daily-add','할 일 하나 정하기'):''}</div></section>`;
  return groups.map(g=>fold(`today/${child}/${day}/${g.id}`,`${icon(g.icon)}${esc(g.label)}`,g.items.length?`${g.items.filter(c=>c.entry).length} / ${g.items.length}개 완료`:'내용을 정해요',
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
  if(version.frequency==='once')return version.dueDate;
  if(version.frequency==='daily')return base;
  if(version.frequency==='weekdays'){
    for(let i=0;i<7;i++){const day=addDays(base,i);if(version.days.includes(new Date(day+'T12:00:00').getDay()))return day;}
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
    if(habit.archivedFrom&&habit.archivedFrom<=base)continue;
    const version=habitAt(habit,base)||habit.versions.at(-1);
    if(!version)continue;
    if(habit.dailyPlan){
      if(version.dueDate<base||habit.archivedFrom&&habit.archivedFrom<=version.dueDate)continue;
      rows.push({kind:'daily',id:habit.id,childId:habit.childId,category:version.category,title:taskLabel(version),schedule:'날짜별 할 일',nextDate:version.dueDate,completed:Object.values(state.entries).some(entry=>entry.habitId===habit.id)});
    }else{
      rows.push({kind:'legacy',id:habit.id,childId:habit.childId,category:version.category,title:taskLabel(version),schedule:frequencyLabel(version),nextDate:nextHabitDate(version,base)});
    }
  }
  return rows;
}

export function taskManagerScreen(state,view,filter,button,base=today()){
  const all=plannedItems(state,base),items=filter==='all'?all:all.filter(item=>item.childId===filter);
  const categoryOrder=new Map(activeCategories(state).map((category,index)=>[category.id,index]));
  const key=item=>view==='date'?(item.nextDate?(item.nextDate<base?'past':item.nextDate):'flexible'):item.category;
  const keys=[...new Set(items.map(key))].sort((a,b)=>view==='date'?
    (a==='flexible'||a==='past'?1:0)-(b==='flexible'||b==='past'?1:0)||
    (a==='past'?1:0)-(b==='past'?1:0)||a.localeCompare(b):
    (categoryOrder.get(a)??999)-(categoryOrder.get(b)??999));
  const label=group=>view==='category'?categoryInfo(state,group)?.label||'지난 묶음':group==='flexible'?'날짜를 정하지 않은 반복':group==='past'?'지난 날짜의 할 일':`${Number(group.slice(5,7))}월 ${Number(group.slice(8))}일 ${['일','월','화','수','목','금','토'][new Date(group+'T12:00:00').getDay()]}요일`;
  const row=item=>{
    const person=state.children.find(child=>child.id===item.childId),category=categoryInfo(state,item.category),attrs=`data-kind="${item.kind}" data-id="${esc(item.id)}" data-child="${esc(item.childId)}" data-category="${esc(item.category)}"${item.nextDate?` data-day="${item.nextDate}"`:''}`;
    return `<div class="task-manager-row"><span class="activity-icon ${category?.color||'mint'}">${icon(category?.icon||'leaf')}</span><div class="grow"><strong>${esc(item.title)}</strong><p>${esc(person?.name||'아이')} · ${item.kind==='weekly'?'주간 일정':item.kind==='daily'?'날짜별 할 일':'이전에 만든 할 일'} · ${esc(item.schedule)}${view==='category'&&item.nextDate?` · ${item.nextDate<base?'지난 날짜':`${Number(item.nextDate.slice(5,7))}/${Number(item.nextDate.slice(8))} 다음 예정`}`:''}</p>${item.completed?'<small>완료를 취소한 뒤 수정·삭제할 수 있어요.</small>':''}</div><div class="task-manager-actions">${item.completed?button('manager-open-day','날짜 보기','text-btn',attrs):button('manager-edit','수정','text-btn',attrs)+button('manager-delete','삭제','text-btn',attrs)}</div></div>`;
  };
  return `<section class="panel task-manager"><div class="section-head"><div><h2>할 일 목록 관리</h2><p>두 아이의 계획 ${all.length}개를 한곳에서 살펴봐요.</p></div>${button('manager-add',`${icon('plus')}할 일 추가`,'primary')}</div><div class="task-manager-controls"><div class="tabbar" aria-label="목록 보기 방식">${[['date','날짜별'],['category','상위 묶음별']].map(([id,name])=>button('manager-view',name,view===id?'active':'',`data-view="${id}" aria-pressed="${view===id}"`)).join('')}</div><div class="tabbar" aria-label="아이별 목록">${[['all','모두'],...state.children.map(child=>[child.id,child.name])].map(([id,name])=>button('manager-filter',esc(name),filter===id?'active':'',`data-child="${esc(id)}" aria-pressed="${filter===id}"`)).join('')}</div></div><p class="manager-hint">날짜별 보기에서는 반복 일정도 다음 예정일에 한 번씩 표시해요. 날짜가 정해지지 않은 반복은 아래에 모아요.</p>${keys.length?keys.map(group=>`<div class="task-manager-group"><h3>${esc(label(group))} <small>${items.filter(item=>key(item)===group).length}개</small></h3>${items.filter(item=>key(item)===group).sort((a,b)=>a.childId.localeCompare(b.childId)||a.title.localeCompare(b.title,'ko')).map(row).join('')}</div>`).join(''):'<div class="empty">계획한 할 일이 없어요. 위에서 새 할 일을 추가해 보세요.</div>'}</section>`;
}
