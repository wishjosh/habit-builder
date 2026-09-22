import {activeCategories,weeklyAt,weeklyDue,weeklyLabel,dailyGroupsFor,today,addDays,weekStart,datesBetween} from './engine.js';
import {icon,esc} from './ui.js';
import {fold} from './hierarchy.js';

export function planPageSwitch(current,button){
  return `<nav class="plan-page-switch" aria-label="할 일 화면">${[['today','home','오늘 할 일'],['weekly','calendar','이번 주 할 일']].map(([page,symbol,label])=>button('page',`${icon(symbol)}<span>${label}</span>`,page===current?'active':'',`data-page="${page}"${page===current?' aria-current="page"':''}`)).join('')}</nav>`;
}

export function weeklyScreen(state,child,button){
  const start=weekStart(today()),week=datesBetween(start,addDays(start,6));
  return `<div class="main-heading"><h1>이번 주 할 일</h1></div>${planPageSwitch('weekly',button)}<p class="planner-intro">어느 날 무엇을 할까요? 묶음별로 할 날만 골라요.<br>책 이름과 분량은 오늘이나 내일의 계획에서 정해요.</p><div class="weekly-list">${activeCategories(state).map(c=>{
    const plan=(state.weeklyPlans||[]).find(p=>p.childId===child.id&&p.category===c.id),v=weeklyAt(plan,today());
    return `<section class="panel weekly-card" data-weekly-category="${esc(c.id)}"><div class="weekly-title"><span class="activity-icon ${c.color}">${icon(c.icon)}</span><div class="grow"><h2>${esc(c.label)}</h2><p>${esc(weeklyLabel(v))}</p></div>${button('weekly-edit',plan?'함께 바꾸기':'정하기','secondary',`data-category="${esc(c.id)}" aria-label="${esc(c.label)} ${plan?'이번 주 할 일 바꾸기':'이번 주 할 일 정하기'}"`)}</div><div class="weekly-preview" aria-label="이번 주 일정">${week.map(d=>`<span class="${weeklyDue(weeklyAt(plan,d),d)?'planned':''} ${d===today()?'is-today':''}"><small>${'일월화수목금토'[new Date(d+'T12:00:00').getDay()]}</small><b>${Number(d.slice(8))}</b><span aria-label="${weeklyDue(weeklyAt(plan,d),d)?'계획 있음':'계획 없음'}">${weeklyDue(weeklyAt(plan,d),d)?'●':'·'}</span></span>`).join('')}</div></section>`;
  }).join('')}</div><p class="support-note">${icon('leaf')}정한 일정은 다음 주에도 이어져요. 변경하거나 그만할 때는 부모님과 함께해요.</p>`;
}

export function dailyScreenGroups(state,child,day,renderCard,button){
  const groups=dailyGroupsFor(state,child,day),canPlan=day>=today()&&day<=addDays(today(),1);
  if(!groups.length)return `<section class="panel empty-plan"><h2>${day>today()?'내일':'이날'}은 정한 묶음이 없어요</h2><p>이번 주 할 일에서 할 날을 정하면 이곳에 나타나요.</p><div class="button-row">${button('page','이번 주 할 일 정하기','primary','data-page="weekly"')}${canPlan?button('daily-add','할 일 하나 정하기'):''}</div></section>`;
  return groups.map(g=>fold(`today/${child}/${day}/${g.id}`,`${icon(g.icon)}${esc(g.label)}`,g.items.length?`${g.items.filter(c=>c.entry).length} / ${g.items.length}개 완료`:'내용을 정해요',
    `<div class="habit-grid">${g.items.map(renderCard).join('')}</div>${!g.items.length?`<div class="plan-placeholder"><p>${day>today()?'내일':'오늘'} ${esc(g.label)}에서 무엇을 할까요?</p>${canPlan?button('daily-add',`${icon('plus')}할 일 정하기`,'primary',`data-category="${esc(g.id)}" aria-label="${esc(g.label)} 세부 계획 정하기"`):'<small>정한 내용이 없어요.</small>'}</div>`:canPlan&&!g.archivedFrom?`<div class="group-add">${button('daily-add',`${icon('plus')}하나 더 정하기`,'text-btn',`data-category="${esc(g.id)}" aria-label="${esc(g.label)} 할 일 추가"`)}</div>`:''}`)).join('');
}

export function parentCheck(){return '<label class="parent-check"><input type="checkbox" name="parentConfirmed" required><span>부모님과 함께 확인했어요.</span></label>';}
