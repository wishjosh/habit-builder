import {CATEGORIES,activeCategories,categoryInfo,saveCategory,deleteCategory,categoryHabits,today,dateObj,addDays,weekStart,monthDays,datesBetween,uid,clone,freshState,habitAt,entriesFor,cardsFor,markDone,undoDone,starSummary,redeem,cancelRedemption,saveHabit,frequencyLabel,touch,validateState,taskLabel,groupByCategory} from './engine.js';
import {loadState,persist,makeBackup,readBackup,toCSV,STORE_KEY,BACKUP_KEY} from './storage.js';
import {icon,avatar,garden,esc} from './ui.js';
import {rememberFolds,fold,todayGroups,recordGroups,parentGroups} from './hierarchy.js';
import {SheetBridge,readCloudConfig,saveCloudConfig,encodeConnection,decodeConnection} from './cloud.js';

const root=document.querySelector('#app'),dialog=document.querySelector('#dialog');
const loaded=loadState();let state=loaded.state;
let page='today',childId=state?.children[0].id,date=today(),recordTab='week',recordMonth=today().slice(0,7),selectedCalendarDay=today();
let toastTimer,cloud=null,cloudConfig=readCloudConfig(),syncBusy=false,cloudMessage='',generation=0,lastSaved=null,selectedAvatar='fox';
const weekdays=['일','월','화','수','목','금','토'];
const navItems=[['today','home','오늘'],['records','chart','내 기록'],['rewards','gift','선물'],['parent','settings','부모 메뉴']];
const child=()=>state.children.find(c=>c.id===childId)||state.children[0];
const fmt=d=>`${Number(d.slice(5,7))}월 ${Number(d.slice(8))}일 ${weekdays[dateObj(d).getDay()]}요일`;
const restKey=d=>`${childId}/${d}`;
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3400);}
function btn(action,label,cls='secondary',attrs=''){return `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;}
function empty(message,symbol='leaf'){return `<div class="empty">${icon(symbol)}${message}</div>`;}
function heading(title,extra=''){return `<div class="main-heading"><h1>${title}</h1>${extra}</div>`;}
function navigation(cls){return `<nav class="${cls}" aria-label="주 메뉴">${navItems.map(([p,i,label])=>btn('page',`${icon(i)}<span>${label}</span>`,p===page?'active':'',`data-page="${p}" aria-current="${p===page?'page':'false'}"`)).join('')}</nav>`;}
function brand(mobile=false){return `<div class="brand ${mobile?'mobile-brand':''}"><div class="logo">${icon('leaf')}</div><div><span class="title">습관 형성 시스템</span><small>HABIT BUILDER</small></div></div>`;}
function saveLabel(){if(cloudConfig?.enabled){return cloudMessage|| (cloudConfig.dirty?'이 기기 저장 · 연결 대기':'가족 기록 연결됨');}return lastSaved?'이 기기에 저장했어요':'이 기기에 기록해요';}
function render(){
  if(!state){renderRecovery();return;}
  if(!state.children.some(c=>c.id===childId))childId=state.children[0].id;
  rememberFolds(root);
  const html=page==='today'?renderToday():page==='records'?renderRecords():page==='rewards'?renderRewards():renderParent();
  root.innerHTML=`<div class="shell"><aside class="sidebar">${brand()}${navigation('nav')}<div class="sidebar-bottom"><div class="sprout">${icon('leaf')}<br>하루의 작은 실천이<br>나만의 습관이 되어요.</div>우리 가족의 작은 성장 기록<br>Habit Builder · 처음 버전</div></aside><div class="content"><header class="topbar"><div class="desktop-date"><div class="eyebrow">OUR LITTLE EVERYDAY</div><div class="date-label">${today().slice(0,4)}년 ${fmt(today())}</div></div>${brand(true)}<div class="profile-switch" aria-label="아이 선택">${state.children.map(c=>btn('child',`${avatar(c.avatar)}<span>${esc(c.name)}</span>`,c.id===childId?'active':'',`data-id="${esc(c.id)}" aria-pressed="${c.id===childId}"`)).join('')}</div></header><main id="main" tabindex="-1">${loaded.warning?`<div class="banner">${esc(loaded.warning)}</div>`:''}${html}</main></div>${navigation('mobile-nav')}</div>`;
}
function renderRecovery(){root.innerHTML=`<main class="content"><div class="danger-box"><h1>기록을 먼저 확인해 주세요</h1><p>${esc(loaded.warning)}</p><p>이전 저장본으로 복구하거나, 원본 파일을 내려받아 보관할 수 있어요.</p><div class="button-row">${btn('recover','이전 저장본 복구','primary')}${btn('raw-export','현재 저장 원본 받기')}${btn('import','백업 파일 불러오기')}</div><input id="import-file" type="file" accept=".json,application/json" class="file-input"></div></main>`;}
function renderToday(){
  const c=child(),entries=entriesFor(state,c.id,date,date),stars=starSummary(state,c.id),start=weekStart(date),week=datesBetween(start,addDays(start,6)),days=new Set(entriesFor(state,c.id,start,addDays(start,6)).map(e=>e.date)).size;
  const cards=cardsFor(state,c.id,date),rest=state.restDays[restKey(date)];
  return `${heading(`${esc(c.name)}의 오늘`, `<span class="soft-label">${icon(cloudConfig?.enabled?'cloud':'check')}<span id="save-label">${esc(saveLabel())}</span></span>`)}
  <section class="hero" aria-label="오늘의 응원"><div class="hero-copy"><div class="greeting">${icon('sun')} ${date===today()?'오늘도 반가워요':fmt(date)}</div><h2>${rest?'쉬어 가는 날도,<br>소중한 하루예요.':entries.length?'차곡차곡 쌓이는<br>나의 멋진 하루.':'작은 실천이,<br>멋진 습관으로.'}</h2><p>${c.style==='together'?'함께 해보고, 내가 직접 눌러요.':'하나씩 해보고, 나의 발자국을 남겨요.'}<br>${entries.length?'지금까지 잘 해왔어요. 오늘의 나를 응원해요.':'오늘은 어떤 작은 실천을 해볼까요?'}</p></div>${garden(entries.length)}</section>
  <div class="stats-row"><div class="stat"><span class="stat-icon mint">${icon('check')}</span><div><small>오늘의 발자국</small><strong>${entries.length}<span>개 실천</span></strong></div></div><div class="stat"><span class="stat-icon yellow">${icon('star')}</span><div><small>내가 모은 별</small><strong>${stars.balance}<span>개</span></strong></div></div><div class="stat"><span class="stat-icon lavender">${icon('calendar')}</span><div><small>이번 주 함께한 날</small><strong>${days}<span>일</span></strong></div></div></div>
  <div class="section-head"><h2>오늘의 약속<small>나의 속도로 하나씩</small></h2><div class="date-controls">${btn('day-prev',icon('left'),'icon-btn','aria-label="지난 날짜"')}${btn('date-today',date===today()?'오늘':fmt(date).replace('요일',''),'text-btn')}${btn('day-next',icon('right'),'icon-btn',`aria-label="다음 날짜" ${date>=today()?'disabled':''}`)}</div></div>
  <div class="week-strip">${week.map(d=>btn('date',`<span class="day-name">${weekdays[dateObj(d).getDay()]}</span><span class="day-number">${Number(d.slice(8))}</span><span class="dot"></span>`,`day-pill ${d===date?'selected':''} ${d===today()?'is-today':''} ${entriesFor(state,c.id,d,d).length?'has-record':''}`,`data-date="${d}" aria-label="${fmt(d)}" aria-pressed="${d===date}" ${d>today()?'disabled':''}`)).join('')}</div>
  ${rest?'<div class="banner rest">오늘은 쉬기로 했어요. 이미 남긴 실천 기록은 그대로 간직해요.</div>':''}
  ${todayGroups(cards,childId,date,card=>habitCard(card,rest),category=>btn('add-habit',`${icon('plus')}할 일 추가`,'text-btn',`data-category="${esc(category)}"`),state)}${!cards.length?empty('이날은 정해 둔 할 일이 없어요.')+btn('add-habit',`${icon('plus')}할 일 추가`,'secondary'):''}
  <div class="section-head"><span class="date-label">${fmt(date)}</span>${btn('rest',`${icon('sun')}${rest?'쉬는 날 취소':'오늘은 쉬는 날'}`,'text-btn')}</div>
  <p class="support-note">${icon('leaf')} ${c.style==='together'?'잘한 뒤 부모님과 함께 눌러도 좋아요.':'완료한 활동을 다시 누르면 취소할 수 있어요.'}</p>`;
}
function habitCard({habit:h,config:v,entry,flexible,count,target,goalReached},rest){
  const cat=categoryInfo(state,v.category),disabled=!entry&&(rest||goalReached);
  return `<article class="habit-card ${entry?'done':''}"><div class="card-top"><span class="activity-icon ${cat.color}">${icon(cat.icon)}</span><span class="reward-tag">${icon('star')}${entry?entry.points:v.points}</span></div><div class="task-copy">${v.material?`<div class="material-name">${esc(v.material)}</div>`:''}<h3>${esc(v.title)}</h3><p>${esc(v.detail)}</p></div><div class="card-footer"><span class="frequency">${frequencyLabel(v)}${flexible?`<br>${count} / ${target}번 실천`:''}</span>${btn(entry?'undo':'done',`${icon(entry||goalReached?'check':'plus')}${entry?'했어요!':goalReached?'약속 달성':rest?'쉬어 가요':'다 했어요'}`,`done-btn ${goalReached&&!entry?'goal':''}`,`data-id="${esc(h.id)}" aria-label="${esc(taskLabel(v))} ${entry?'완료 취소':'완료'}" aria-pressed="${!!entry}" ${disabled?'disabled':''}`)}</div></article>`;
}
function timeline(entries,showDate=true){return entries.map(e=>`<div class="timeline-item"><span class="activity-icon ${categoryInfo(state,e.snapshot.category)?.color||'mint'}">${icon(categoryInfo(state,e.snapshot.category)?.icon||'leaf')}</span><div class="grow"><strong>${esc(taskLabel(e.snapshot))}</strong><p>${showDate?`${Number(e.date.slice(5,7))}월 ${Number(e.date.slice(8))}일 · `:''}${esc(e.snapshot.detail)}</p></div><span class="reward-tag">${icon('star')}${e.points}</span></div>`).join('');}
function renderRecords(){
  let body='';
  if(recordTab==='week'){
    const start=weekStart(date),week=datesBetween(start,addDays(start,6)),records=entriesFor(state,childId,start,addDays(start,6)),activeDays=new Set(records.map(e=>e.date)).size;
    const max=Math.max(4,...week.map(d=>records.filter(e=>e.date===d).length));
    body=`<section class="panel"><div class="section-head" style="margin-top:0"><h2>${Number(start.slice(5,7))}월 ${Number(start.slice(8))}일 – ${Number(week[6].slice(5,7))}월 ${Number(week[6].slice(8))}일</h2><div class="date-controls">${btn('week-prev',icon('left'),'icon-btn','aria-label="지난주"')}${btn('week-next',icon('right'),'icon-btn',`aria-label="다음 주" ${start>=weekStart(today())?'disabled':''}`)}</div></div><p>${activeDays?`이번 주 ${activeDays}일 동안 ${records.length}번의 작은 실천을 남겼어요.`:'이번 주의 첫 발자국을 기다리고 있어요.'}</p><div class="record-bars">${week.map(d=>{const n=records.filter(e=>e.date===d).length;return `<div class="bar-column"><div class="bar-value">${n||'·'}</div><div class="bar-area"><div class="bar" style="height:${Math.max(4,n/max*100)}%"></div></div><div class="bar-label">${weekdays[dateObj(d).getDay()]}</div></div>`;}).join('')}</div></section><section class="panel"><h2>이번 주 기억하고 싶은 순간</h2><p>아이와 함께 한마디를 남겨 보세요.</p><form data-form="note"><label class="field"><span class="sr-only">이번 주 한마디</span><textarea name="note" maxlength="1000" placeholder="어떤 활동이 즐거웠나요? 다음 주에는 무엇을 해볼까요?">${esc(state.notes[`${childId}/${start}`]||'')}</textarea></label><button class="secondary" type="submit">한마디 저장</button></form></section><section class="panel"><h2>차곡차곡 남긴 기록</h2>${recordGroups(records,`week/${childId}/${start}`,timeline,state)}</section>`;
  }else if(recordTab==='month'){
    const days=monthDays(recordMonth),records=entriesFor(state,childId,days[0],days.at(-1)),selected=records.filter(e=>e.date===selectedCalendarDay),offset=(dateObj(days[0]).getDay()+6)%7;
    body=`<section class="panel"><div class="section-head" style="margin-top:0"><h2>${recordMonth.slice(0,4)}년 ${Number(recordMonth.slice(5))}월</h2><div class="date-controls">${btn('month-prev',icon('left'),'icon-btn','aria-label="지난달"')}${btn('month-next',icon('right'),'icon-btn',`aria-label="다음 달" ${recordMonth>=today().slice(0,7)?'disabled':''}`)}</div></div><p>${new Set(records.map(e=>e.date)).size}일의 실천 · ${records.length}개의 발자국 · 별 ${records.reduce((n,e)=>n+e.points,0)}개를 모았어요</p><div class="calendar">${['월','화','수','목','금','토','일'].map(w=>`<div class="calendar-label">${w}</div>`).join('')}${'<span></span>'.repeat(offset)}${days.map(d=>{const n=records.filter(e=>e.date===d).length,rest=state.restDays[restKey(d)];return btn('calendar-date',`<span>${Number(d.slice(8))}</span><small>${n?`${n}개 실천`:rest?'쉬는 날':'·'}</small>`,`calendar-day ${n?'has-record':''} ${d===selectedCalendarDay?'active':''} ${d===today()?'is-today':''} ${d>today()?'future':''}`,`data-date="${d}" aria-label="${fmt(d)}, ${n}개 실천${rest?', 쉬는 날':''}" ${d>today()?'disabled':''}`);}).join('')}</div><div class="calendar-detail"><h3>${fmt(selectedCalendarDay)}</h3>${selected.length?timeline(selected,false):empty('이날 남긴 실천 기록이 없어요.')}<div class="no-print">${btn('edit-date','이날의 약속 보기','text-btn',`data-date="${selectedCalendarDay}"`)}</div></div></section><section class="panel monthly-record-list"><h2>이 달에 읽은 책과 한 일</h2><p>제목을 누르면 날짜와 분량을 볼 수 있어요. 읽기 기록은 책을 끝까지 읽었다는 뜻과는 달라요.</p>${recordGroups(records,`month/${childId}/${recordMonth}`,timeline,state)}</section><div class="button-row no-print">${btn('print',`${icon('download')}월간 기록 인쇄 / PDF`)}</div>`;
  }else{
    const all=entriesFor(state,childId),habits=state.habits.filter(h=>h.childId===childId);
    body=groupByCategory(habits,h=>habitAt(h,today())||h.versions.at(-1),state).map(group=>fold(`activity/${childId}/${group.id}`,`${icon(group.icon)}${esc(group.label)}`,`${group.items.length}개 할 일`,group.items.map(h=>{const rows=all.filter(e=>e.habitId===h.id),v=habitAt(h,today())||h.versions.at(-1);return fold(`activity/${childId}/${h.id}`,`${esc(taskLabel(v))}${h.archivedFrom?' <small>지난 활동</small>':''}`,`${rows.length}번 실천`,rows.length?timeline(rows.sort((a,b)=>b.date.localeCompare(a.date))):empty('첫 발자국을 기다려요.'),false,'material-group');}).join(''))).join('');
  }
  return `${heading(`${esc(child().name)}의 발자국`)}<p class="date-label">작은 실천이 모여 나만의 이야기가 되어요.</p><div class="tabbar" aria-label="기록 보기">${[['week','이번 주'],['month','월간 기록'],['activity','활동별']].map(([id,name])=>btn('record-tab',name,recordTab===id?'active':'',`data-tab="${id}" aria-pressed="${recordTab===id}"`)).join('')}</div><div class="print-only">습관 형성 시스템 · ${esc(child().name)}</div>${body}`;
}
function renderRewards(){
  const s=starSummary(state,childId),history=state.redemptions.filter(r=>r.childId===childId).slice().reverse();
  return `${heading('별을 모아, 함께 즐겨요')}<div class="balance">${icon('star')}<div><strong>${s.balance}<small>개의 별</small></strong><p>지금까지 ${s.earned}개를 모았어요. 우리 가족의 약속대로 사용해요.</p></div></div>${s.balance<0?'<div class="banner">완료 기록을 취소해 사용한 별이 더 많아졌어요. 부모 메뉴에서 선물 교환 내역을 확인해 주세요.</div>':''}<div class="reward-grid">${state.rewards.map(r=>`<article class="reward-card"><div class="reward-illustration">${icon(r.icon||'gift')}</div><h3>${esc(r.title)}</h3><p>별 ${r.cost}개와 바꿔요</p>${btn('redeem',s.balance>=r.cost?'이 선물로 고를래요':`별 ${r.cost-s.balance}개 더 모아요`,'secondary',`data-id="${esc(r.id)}" ${s.balance<r.cost?'disabled':''}`)}</article>`).join('')}</div><p class="support-note">${icon('gift')}선물은 부모님과 함께 고르고 약속해요.</p>${history.length?`<section class="panel" style="margin-top:24px"><h2>함께 즐긴 선물</h2>${history.map(r=>`<div class="timeline-item"><span class="activity-icon yellow">${icon('gift')}</span><div class="grow"><strong>${esc(r.title)}</strong><p>${fmt(today(new Date(r.at)))} · ${r.cancelledAt?'교환 취소됨':`별 ${r.cost}개 사용`}</p></div></div>`).join('')}</section>`:''}`;
}
function renderParent(){
  const habits=state.habits.filter(h=>h.childId===childId&&!h.archivedFrom);
  return `${heading('우리 가족의 약속 만들기')}<div class="banner">책 읽기·수학은 상위 묶음이에요. 그 아래에 책·교재 이름과 오늘 할 분량을 넣어 주세요. 기존에 적어 둔 활동과 기록은 그대로 보관했어요.</div><section class="panel"><h2>함께하는 아이들</h2>${state.children.map(c=>`<div class="settings-item">${avatar(c.avatar)}<div class="grow"><strong>${esc(c.name)}</strong><p>${c.style==='together'?'부모와 함께 기록해요':'스스로 확인하고 기록해요'}</p></div>${btn('edit-child','바꾸기','text-btn',`data-id="${esc(c.id)}"`)}</div>`).join('')}</section>${renderCategorySettings()}<section class="panel"><div class="section-head" style="margin-top:0"><h2>${esc(child().name)}의 할 일</h2>${btn('add-habit',`${icon('plus')}할 일 추가`,'secondary')}</div>${parentGroups(habits,childId,btn,state)}<p>활동을 바꾸거나 그만해도 이미 남긴 기록과 별은 보관해요.</p></section><section class="panel"><div class="section-head" style="margin-top:0"><h2>우리 가족의 선물</h2>${btn('add-reward',`${icon('plus')}추가`,'text-btn')}</div>${state.rewards.map(r=>`<div class="settings-item"><span class="activity-icon yellow">${icon(r.icon||'gift')}</span><div class="grow"><strong>${esc(r.title)}</strong><p>별 ${r.cost}개</p></div>${btn('edit-reward','수정','text-btn',`data-id="${esc(r.id)}"`)}</div>`).join('')}${state.redemptions.some(r=>!r.cancelledAt)?`<details class="settings-section" style="margin-top:20px"><summary>선물 교환 내역 관리</summary>${state.redemptions.filter(r=>!r.cancelledAt).slice().reverse().map(r=>`<div class="settings-item"><div class="grow"><strong>${esc(state.children.find(c=>c.id===r.childId)?.name)} · ${esc(r.title)}</strong><p>별 ${r.cost}개 · ${fmt(today(new Date(r.at)))}</p></div>${btn('cancel-reward','교환 취소','text-btn',`data-id="${esc(r.id)}"`)}</div>`).join('')}</details>`:''}</section>
  <section class="panel"><h2>가족 기록 연결</h2><p>아이패드와 부모님의 기기에서 같은 기록을 볼 수 있어요. 연결 전에도 이 기기에는 자동 저장돼요.</p><div class="cloud-status" id="cloud-status">${esc(saveLabel())}</div><div class="button-row">${btn('connect',`${icon('cloud')}${cloudConfig?.enabled?'연결 설정':'가족 연결 코드 입력'}`)}${cloudConfig?.enabled?btn('sync','지금 동기화')+btn('share-connection','다른 기기 연결'):''}</div>${cloudConfig?.enabled&&cloudConfig.dirty?'<p>아직 다른 기기에 전달하지 못한 기록이 있어요. 연결을 확인한 뒤 동기화해 주세요.</p>':''}</section>
  <section class="panel"><h2>기록 보관하기</h2><p>백업 파일에는 두 아이의 설정과 기록이 함께 담겨요. 표 파일은 스프레드시트에서 열 수 있어요.</p><div class="button-row">${btn('export',`${icon('download')}전체 기록 백업`)}${btn('csv',`${icon('download')}실천 기록 표`)}${btn('import',`${icon('upload')}백업 불러오기`)}</div><input id="import-file" type="file" accept=".json,application/json" class="file-input"><details class="settings-section" style="margin-top:20px"><summary>아이패드 홈 화면에 추가하기</summary><p>Safari에서 앱 주소를 열고 공유 버튼 → ‘홈 화면에 추가’를 선택하세요. 처음 열 때 인터넷에 연결하면 이후에는 연결이 끊겨도 기록할 수 있어요. 가족 기록 연결은 인터넷이 돌아오면 이어집니다.</p><p>기록은 브라우저마다 따로 저장돼요. 다른 브라우저나 홈 화면 앱으로 옮길 때는 가족 연결 코드 또는 백업 파일을 사용해 주세요.</p></details></section><p class="version-note">습관 형성 시스템 · Habit Builder 0.3<br>아이의 속도에 맞춰, 우리 가족이 함께 만들어요.</p>`;
}
function renderCategorySettings(){
  return `<section class="panel category-settings"><div class="section-head" style="margin-top:0"><h2>상위 묶음 관리</h2>${btn('add-category',`${icon('plus')}묶음 추가`,'secondary')}</div><p>두 아이가 함께 사용하는 묶음이에요. 할 일과 완료 기록은 아이별로 따로 관리해요.</p>${activeCategories(state).map(c=>{
    const habits=categoryHabits(state,c.id),counts=state.children.map(child=>`${child.name} ${habits.filter(h=>h.childId===child.id).length}개`).join(' · ');
    return `<div class="settings-item category-setting" data-category-id="${esc(c.id)}"><span class="activity-icon ${c.color}">${icon(c.icon)}</span><div class="grow"><strong>${esc(c.label)}</strong><p>${esc(counts)}</p></div><div class="category-actions">${btn('edit-category','이름·설정','text-btn',`data-id="${esc(c.id)}" aria-label="${esc(c.label)} 이름과 설정 바꾸기"`)}${btn('delete-category','삭제','text-btn',`data-id="${esc(c.id)}" aria-label="${esc(c.label)} 묶음 삭제"`)}</div></div>`;
  }).join('')}<p>묶음 이름을 바꾸면 기록 화면의 이름도 함께 바뀌어요. 삭제한 묶음의 완료 기록은 지난 이름으로 남아요.</p></section>`;
}
function categoryEditor(id){
  const c=id?categoryInfo(state,id):{label:'',type:'life'};
  const types=[['reading','책 모양 · 책 제목 필수'],['math','연필 모양 · 교재 이름 필수'],['learning','연필 모양 · 이름은 선택'],['life','해 모양 · 이름은 선택'],['movement','운동 모양 · 이름은 선택'],['art','음표 모양 · 이름은 선택']];
  modal(id?'상위 묶음 바꾸기':'새 상위 묶음',`<form data-form="category" data-id="${esc(id||'')}"><label class="field">묶음 이름<input name="label" value="${esc(c.label)}" placeholder="예: 영어, 피아노, 스스로 하는 일" maxlength="30" required></label><label class="field">모양과 할 일 입력 방식<select name="type">${types.map(([value,label])=>`<option value="${value}" ${c.type===value?'selected':''}>${label}</option>`).join('')}</select><small>책·교재 제목을 따로 모으고 싶을 때는 제목이 필수인 방식을 고르세요.</small></label><p>두 아이의 할 일 메뉴에 함께 표시돼요.</p><p class="form-error" role="alert"></p><div class="dialog-actions">${btn('close','돌아가기')}<button type="submit" class="primary">묶음 저장</button></div></form>`);
}
function categoryDeleteDialog(id){
  const c=categoryInfo(state,id),others=activeCategories(state).filter(c=>c.id!==id),habits=categoryHabits(state,id);
  if(!others.length){modal('묶음 하나는 남겨 주세요','<p>할 일을 담을 묶음이 하나 이상 필요해요. 새 묶음을 먼저 만든 다음 이 묶음을 삭제할 수 있어요.</p>',btn('close','확인','primary'));return;}
  const counts=state.children.map(child=>`${child.name} ${habits.filter(h=>h.childId===child.id).length}개`).join(' · ');
  modal('상위 묶음을 삭제할까요?',`<form data-form="delete-category" data-id="${esc(id)}"><p>‘${esc(c.label)}’을 두 아이의 할 일 메뉴에서 지워요.</p>${habits.length?`<p>남아 있는 할 일 ${habits.length}개를 아래 묶음으로 옮겨요.<br>${esc(counts)}</p><label class="field">할 일을 옮길 묶음<select name="destination" required><option value="">묶음을 골라 주세요</option>${others.map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('')}</select></label>`:'<p>이 묶음에는 옮길 할 일이 없어요.</p>'}<p>완료한 기록과 별은 그대로 보관해요. 지난 기록에는 ‘${esc(c.label)}’이 남아요.</p><p class="form-error" role="alert"></p><div class="dialog-actions">${btn('close','돌아가기')}<button type="submit" class="primary">${habits.length?'할 일 옮기고 묶음 삭제':'묶음 삭제'}</button></div></form>`);
}
function commit(change,message){
  try{const next=clone(state);change(next);touch(next);const saved=persist(next);state=saved;generation++;lastSaved=new Date();if(cloudConfig?.enabled){cloudConfig.dirty=true;saveCloudConfig(cloudConfig);}render();if(message)toast(message);scheduleSync();return true;}
  catch(error){toast(error.name==='QuotaExceededError'?'저장 공간이 부족해 기록하지 못했어요. 먼저 백업해 주세요.':error.message||'저장하지 못했어요. 다시 시도해 주세요.');return false;}
}
function modal(title,body,actions=''){dialog.innerHTML=`<div class="dialog-inner"><div class="dialog-head"><h2 id="dialog-title">${title}</h2>${btn('close',icon('close'),'icon-btn','aria-label="닫기"')}</div>${body}${actions?`<div class="dialog-actions">${actions}</div>`:''}</div>`;if(!dialog.open)dialog.showModal();}
function confirmModal(title,body,action,label,attrs=''){modal(title,`<p>${body}</p>`,btn('close','돌아가기')+btn(action,label,'primary',attrs));}
function habitEditor(id,category='reading'){
  const h=state.habits.find(h=>h.id===id),v=h?(habitAt(h,today())||h.versions.at(-1)):{title:'',material:'',detail:'',category:activeCategories(state).some(c=>c.id===category)?category:activeCategories(state)[0].id,frequency:'once',days:[1,2,3,4,5],target:3,points:1,dueDate:today()};
  modal(h?'구체적인 할 일 바꾸기':'구체적인 할 일 추가',`<form data-form="habit" data-id="${esc(id||'')}"><label class="field">상위 묶음<select name="category">${activeCategories(state).map(c=>`<option value="${esc(c.id)}" ${c.id===v.category?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label><label class="field"><span id="material-label">책·교재 이름</span><input name="material" value="${esc(v.material||'')}" maxlength="100"><small id="material-hint"></small></label><label class="field">구체적인 할 일·분량<input name="title" value="${esc(v.title)}" placeholder="예: 1~2장 읽기 / A1권 1~2쪽 풀기" maxlength="60" required></label><label class="field">완료 기준 또는 도움말<input name="detail" value="${esc(v.detail)}" placeholder="예: 읽은 내용을 한 문장으로 이야기해요" maxlength="160"></label><label class="field">언제 할까요?<select name="frequency">${[['once','정한 날짜에 한 번'],['daily','매일'],['weekdays','요일을 골라서'],['weekly','일주일에 몇 번'],['monthly','한 달에 몇 번']].map(([id,label])=>`<option value="${id}" ${id===v.frequency?'selected':''}>${label}</option>`).join('')}</select></label><div id="frequency-extra"></div><label class="field">완료하면 받는 별<input type="number" name="points" min="0" max="20" value="${v.points}" required><small>상위 묶음에는 별을 주지 않고, 이 할 일을 완료할 때만 적립해요.</small></label><p class="form-error" role="alert"></p><div class="dialog-actions">${btn('close','돌아가기')}<button class="primary" type="submit">할 일 저장</button></div></form>`);
  renderFrequency(v.frequency,v);renderMaterial(v.category);
}
function renderMaterial(category){
  const field=dialog.querySelector('[name="material"]');if(!field)return;
  const type=categoryInfo(state,category)?.type;
  const required=['reading','math'].includes(type);field.required=required;
  dialog.querySelector('#material-label').textContent=type==='reading'?'책 제목':type==='math'?'교재 이름':'책·교재·준비물 이름 (선택)';
  field.placeholder=type==='reading'?'예: 톰 소여의 모험':type==='math'?'예: 눈높이 수학':'해당하는 경우 적어 주세요';
  dialog.querySelector('#material-hint').textContent=required?'완료하면 이 이름과 분량이 월간 기록에 함께 남아요.':'이름 없이 구체적인 할 일만 적어도 괜찮아요.';
}
function renderFrequency(f,v={days:[1,2,3,4,5],target:3,dueDate:today()}){const target=dialog.querySelector('#frequency-extra');if(!target)return;target.innerHTML=f==='weekdays'?`<div class="field"><span>실천할 요일</span><div class="days-choice">${[1,2,3,4,5,6,0].map(d=>`<label><input type="checkbox" name="days" value="${d}" ${v.days?.includes(d)?'checked':''}><span>${weekdays[d]}</span></label>`).join('')}</div></div>`:['weekly','monthly'].includes(f)?`<label class="field">${f==='weekly'?'일주일':'한 달'}에 몇 번 할까요?<input type="number" name="target" min="1" max="${f==='weekly'?7:31}" value="${v.target||3}" required><small>하루에 한 번씩 기록해요. 요일은 자유롭게 고를 수 있어요.</small></label>`:f==='once'?`<label class="field">활동 날짜<input type="date" name="dueDate" min="${today()}" value="${v.dueDate||today()}" required></label>`:'';}
function childEditor(id){const c=state.children.find(c=>c.id===id);selectedAvatar=c.avatar;modal('나를 소개해요',`<form data-form="child" data-id="${esc(id)}"><div class="avatar-choice">${['fox','bunny','bear','cat'].map(a=>btn('avatar',avatar(a),a===selectedAvatar?'active':'',`data-avatar="${a}" aria-label="${{fox:'여우',bunny:'토끼',bear:'곰',cat:'고양이'}[a]}" aria-pressed="${a===selectedAvatar}"`)).join('')}</div><label class="field">이름 또는 별명<input name="name" maxlength="30" value="${esc(c.name)}" required></label><label class="field">기록하는 방법<select name="style"><option value="independent" ${c.style==='independent'?'selected':''}>스스로 확인하고 기록해요</option><option value="together" ${c.style==='together'?'selected':''}>부모와 함께 기록해요</option></select></label><p class="form-error" role="alert"></p><div class="dialog-actions">${btn('close','돌아가기')}<button type="submit" class="primary">저장</button></div></form>`);}
function rewardEditor(id){const r=state.rewards.find(r=>r.id===id)||{title:'',cost:10};modal(id?'선물 바꾸기':'새로운 선물',`<form data-form="reward" data-id="${esc(id||'')}"><label class="field">함께 약속한 선물<input name="title" value="${esc(r.title)}" maxlength="60" required placeholder="예: 주말 놀이 고르기"></label><label class="field">필요한 별<input name="cost" type="number" min="1" max="9999" value="${r.cost}" required></label><p class="form-error" role="alert"></p><div class="dialog-actions">${btn('close','돌아가기')}<button class="primary" type="submit">저장</button></div></form>`);}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function exportBackup(){download(makeBackup(state),`habit-builder-${today()}.json`,'application/json');}
let pendingImport=null,pendingRemote=null;
function connectDialog(prefill=''){modal('가족 기록 연결',`<p>처음 연결한 기기의 부모 메뉴에서 ‘다른 기기 연결’ 코드를 복사해 붙여넣으세요.</p><form data-form="connect"><label class="field">가족 연결 코드<textarea name="connection" required autocomplete="off" spellcheck="false" placeholder="연결 코드를 여기에 붙여넣으세요">${esc(prefill)}</textarea></label><details class="settings-section"><summary>연결 주소와 열쇠를 직접 입력하기</summary><p>연결 코드를 모르는 경우, 준비한 저장소의 주소와 가족 열쇠로 연결할 수 있어요.</p><label class="field">연결 주소<input name="url" type="url" value="${esc(cloudConfig?.url||'')}" placeholder="https://script.google.com/macros/s/…/exec"></label><label class="field">가족 열쇠<input name="key" type="password" autocomplete="off"></label></details><p class="form-error" role="alert"></p><div class="dialog-actions">${cloudConfig?.enabled?btn('disconnect','이 기기 연결 해제','text-btn'):''}${btn('close','돌아가기')}<button class="primary" type="submit">연결하기</button></div></form>`);const form=dialog.querySelector('form');form.elements.connection.required=false;}
function setCloudMessage(text){cloudMessage=text;const label=document.querySelector('#save-label'),status=document.querySelector('#cloud-status');if(label)label.textContent=text||saveLabel();if(status)status.textContent=text||saveLabel();}
async function connectCloud(config,initial=false){
  if(syncBusy)throw new Error('저장이 끝난 뒤 잠시 후 다시 연결해 주세요.');
  setCloudMessage('가족 기록에 연결 중');const candidate=new SheetBridge(config.url,config.key);
  if(initial){cloud?.close();cloud=candidate;}
  const startingGeneration=generation;
  try{
    const remote=await candidate.open();
    if(remote.state)validateState(remote.state);
    if(initial&&config.enabled){
      cloudConfig=config;
      if(config.dirty&&remote.revision!==config.revision){throw new Error('다른 기기에도 새 기록이 있어요. 먼저 전체 기록을 백업하고 연결 설정에서 가져올 기록을 골라 주세요.');}
      if(generation!==startingGeneration){if(remote.revision!==config.revision)throw new Error('기록을 확인하는 동안 변경이 생겼어요. 이 기기 기록을 백업한 뒤 다시 연결해 주세요.');cloudConfig.dirty=true;}
      else if(!config.dirty&&remote.state){state=persist(remote.state);childId=state.children.some(c=>c.id===childId)?childId:state.children[0].id;cloudConfig.revision=remote.revision;}
      saveCloudConfig(cloudConfig);setCloudMessage('가족 기록 연결됨');render();scheduleSync();return;
    }
    const newConfig={...config,enabled:true,revision:remote.revision,dirty:false};
    if(remote.state){pendingRemote={remote,config:newConfig,bridge:candidate};confirmModal('가족 기록을 가져올까요?',`저장소에 아이 ${remote.state.children.length}명과 실천 ${Object.keys(remote.state.entries).length}개의 기록이 있어요. 지금 기기의 기록은 먼저 백업 파일로 보관하고 가져옵니다.`,'use-remote','백업하고 가져오기');}
    else{cloud?.close();cloud=candidate;cloudConfig={...newConfig,dirty:true};saveCloudConfig(cloudConfig);dialog.close();await syncCloud();render();toast('가족 저장소에 연결했어요.');}
  }catch(error){candidate.close();if(cloud===candidate)cloud=null;setCloudMessage('이 기기 저장 · 연결 확인 필요');if(dialog.open){const el=dialog.querySelector('.form-error');if(el)el.textContent=error.message;else toast(error.message);}else toast(error.message);throw error;}
}
let syncTimer;
function scheduleSync(){clearTimeout(syncTimer);if(cloudConfig?.enabled&&cloudConfig.dirty&&cloud)syncTimer=setTimeout(()=>syncCloud(),700);}
async function syncCloud(){
  if(syncBusy||pendingRemote||!cloudConfig?.enabled)return;
  if(!cloud?.source){try{await connectCloud(cloudConfig,true);}catch{}return;}
  syncBusy=true;const gen=generation;
  try{
    if(cloudConfig.dirty){setCloudMessage('이 기기 저장 · 가족 기록에 전달 중');const result=await cloud.request('write',{revision:cloudConfig.revision,state:clone(state)});if(result.conflict)throw new Error('다른 기기에 새 기록이 있어요. 이 기기 기록을 백업한 뒤 연결 설정에서 가족 기록을 가져와 주세요.');cloudConfig.revision=result.revision;cloudConfig.dirty=generation!==gen;saveCloudConfig(cloudConfig);}
    else{const result=await cloud.request('read');if(result.state&&result.revision!==cloudConfig.revision){if(generation!==gen)throw new Error('두 기기의 기록이 함께 바뀌었어요. 기록을 백업한 뒤 연결을 확인해 주세요.');state=persist(validateState(result.state));cloudConfig.revision=result.revision;saveCloudConfig(cloudConfig);render();}}
    setCloudMessage(cloudConfig.dirty?'이 기기 저장 · 연결 대기':'가족 기록 연결됨');
  }catch(error){setCloudMessage('이 기기 저장 · 연결 확인 필요');toast(error.message);}
  finally{syncBusy=false;if(generation!==gen)scheduleSync();}
}

document.addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;const action=el.dataset.action,id=el.dataset.id;
  try{
    if(action==='close'){dialog.close();return;}
    if(action==='page'){page=el.dataset.page;render();window.scrollTo({top:0});return;}
    if(action==='child'){childId=id;render();return;}
    if(action==='date'){date=el.dataset.date;render();return;}
    if(action==='date-today'){date=today();render();return;}
    if(action==='day-prev'||action==='day-next'){date=addDays(date,action==='day-prev'?-1:1);render();return;}
    if(action==='done'){commit(s=>markDone(s,childId,id,date),'멋져요! 작은 실천 하나를 남겼어요.');return;}
    if(action==='undo'){commit(s=>undoDone(s,childId,id,date),'완료를 취소했어요.');return;}
    if(action==='rest'){commit(s=>{s.restDays[restKey(date)]=!s.restDays[restKey(date)];},state.restDays[restKey(date)]?'다시 약속을 확인해요.':'오늘은 편하게 쉬어 가요.');return;}
    if(action==='record-tab'){recordTab=el.dataset.tab;render();return;}
    if(action==='week-prev'||action==='week-next'){date=addDays(date,action==='week-prev'?-7:7);if(date>today())date=today();render();return;}
    if(action==='month-prev'||action==='month-next'){const d=dateObj(`${recordMonth}-01`);d.setMonth(d.getMonth()+(action==='month-prev'?-1:1));recordMonth=today(d).slice(0,7);selectedCalendarDay=recordMonth===today().slice(0,7)?today():`${recordMonth}-01`;render();return;}
    if(action==='calendar-date'){selectedCalendarDay=el.dataset.date;render();return;}
    if(action==='edit-date'){date=el.dataset.date;page='today';render();return;}
    if(action==='print'){window.print();return;}
    if(action==='add-category'||action==='edit-category'){categoryEditor(id);return;}
    if(action==='delete-category'){categoryDeleteDialog(id);return;}
    if(action==='add-habit'||action==='edit-habit'){habitEditor(id,el.dataset.category);return;}
    if(action==='archive-habit'){const h=state.habits.find(h=>h.id===id);confirmModal('이 활동을 그만할까요?',`‘${esc(habitAt(h,today())?.title||h.versions.at(-1).title)}’을 앞으로의 약속에서 빼요. 이미 남긴 기록과 별은 보관해요.`,'archive-confirm','그만하기',`data-id="${esc(id)}"`);return;}
    if(action==='archive-confirm'){if(commit(s=>{s.habits.find(h=>h.id===id).archivedFrom=today();},'지난 실천은 그대로 보관했어요.'))dialog.close();return;}
    if(action==='edit-child'){childEditor(id);return;}
    if(action==='avatar'){selectedAvatar=el.dataset.avatar;dialog.querySelectorAll('[data-action="avatar"]').forEach(b=>{b.classList.toggle('active',b.dataset.avatar===selectedAvatar);b.setAttribute('aria-pressed',String(b.dataset.avatar===selectedAvatar));});return;}
    if(action==='add-reward'||action==='edit-reward'){rewardEditor(id);return;}
    if(action==='redeem'){const r=state.rewards.find(r=>r.id===id);confirmModal('함께 고른 선물인가요?',`부모님과 약속했다면 별 ${r.cost}개를 쓰고 ‘${esc(r.title)}’을 골라요.`,'redeem-confirm','별을 쓰고 고르기',`data-id="${esc(id)}"`);return;}
    if(action==='redeem-confirm'){el.disabled=true;if(commit(s=>redeem(s,childId,id),'함께 즐거운 시간을 보내요!'))dialog.close();else el.disabled=false;return;}
    if(action==='cancel-reward'){confirmModal('선물 교환을 취소할까요?','사용했던 별이 다시 돌아와요.','cancel-reward-confirm','교환 취소',`data-id="${esc(id)}"`);return;}
    if(action==='cancel-reward-confirm'){if(commit(s=>cancelRedemption(s,id),'별을 돌려놓았어요.'))dialog.close();return;}
    if(action==='export'){exportBackup();return;}
    if(action==='csv'){download(toCSV(state),`habit-builder-records-${today()}.csv`,'text/csv;charset=utf-8');return;}
    if(action==='import'){document.querySelector('#import-file').click();return;}
    if(action==='import-confirm'){if(state)exportBackup();const next=pendingImport;if(!next)return;try{persist(next);state=next;loaded.warning=null;childId=state.children[0].id;generation++;lastSaved=new Date();if(cloudConfig?.enabled){cloudConfig.dirty=true;saveCloudConfig(cloudConfig);}pendingImport=null;dialog.close();render();scheduleSync();toast('백업 기록을 가져왔어요.');}catch(e){toast(e.message);}return;}
    if(action==='recover'){const raw=localStorage.getItem(BACKUP_KEY);if(!raw)throw new Error('이전 저장본이 없어요. 백업 파일을 불러와 주세요.');const recovered=validateState(JSON.parse(raw));localStorage.setItem(STORE_KEY,JSON.stringify(recovered));state=recovered;childId=state.children[0].id;loaded.warning=null;render();toast('이전 저장본을 복구했어요.');return;}
    if(action==='raw-export'){download(loaded.raw||'',`habit-builder-recovery-${today()}.txt`,'text/plain');return;}
    if(action==='connect'){connectDialog();return;}
    if(action==='disconnect'){confirmModal('이 기기의 연결을 해제할까요?','기기와 가족 저장소에 남긴 기록은 보관해요. 해제 후에는 이 기기에만 기록해요.','disconnect-confirm','연결 해제');return;}
    if(action==='disconnect-confirm'){cloud?.close();cloud=null;cloudConfig=null;localStorage.removeItem('habit-builder:cloud:v1');cloudMessage='';dialog.close();render();return;}
    if(action==='sync'){syncCloud();return;}
    if(action==='share-connection'){const code=encodeConnection(cloudConfig.url,cloudConfig.key);modal('다른 기기에서 이어 쓰기',`<p>아이패드에서 같은 앱을 열고 부모 메뉴 → 가족 연결 코드 입력에 아래 코드를 붙여넣으세요. 이 코드는 우리 가족만 보관해 주세요.</p><label class="field">가족 연결 코드<textarea readonly id="connection-code" rows="5">${esc(code)}</textarea></label>`,btn('copy-code','코드 복사','primary'));return;}
    if(action==='copy-code'){navigator.clipboard.writeText(dialog.querySelector('#connection-code').value).then(()=>toast('가족 연결 코드를 복사했어요.')).catch(()=>{dialog.querySelector('#connection-code').select();toast('코드를 길게 눌러 복사해 주세요.');});return;}
    if(action==='use-remote'){if(!pendingRemote)return;exportBackup();state=persist(validateState(pendingRemote.remote.state));cloud?.close();cloud=pendingRemote.bridge;cloudConfig=pendingRemote.config;saveCloudConfig(cloudConfig);childId=state.children[0].id;pendingRemote=null;generation++;dialog.close();setCloudMessage('가족 기록 연결됨');render();toast('가족 기록을 가져왔어요.');return;}
  }catch(error){toast(error.message);}
});
document.addEventListener('change',async event=>{
  if(event.target.name==='category')renderMaterial(event.target.value);
  if(event.target.name==='frequency')renderFrequency(event.target.value);
  if(event.target.id==='import-file'){
    const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>5_000_000)throw new Error('5MB 이하의 백업 파일을 선택해 주세요.');pendingImport=readBackup(await file.text());confirmModal('이 백업을 가져올까요?',`아이 ${pendingImport.children.length}명, 실천 ${Object.keys(pendingImport.entries).length}개가 들어 있어요. 현재 기록은 먼저 백업 파일로 내려받은 뒤 이 백업으로 바꿉니다.`,'import-confirm','백업하고 가져오기');}
    catch(error){toast(error.message);}event.target.value='';
  }
});
document.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();const data=new FormData(form),type=form.dataset.form,id=form.dataset.id;
  try{
    if(type==='category'){if(commit(s=>saveCategory(s,id,Object.fromEntries(data)),'상위 묶음을 저장했어요.'))dialog.close();}
    if(type==='delete-category'){if(commit(s=>deleteCategory(s,id,data.get('destination')),'묶음을 삭제했어요. 지난 기록과 별은 그대로예요.'))dialog.close();}
    if(type==='habit'){const values=Object.fromEntries(data);values.days=data.getAll('days').map(Number);if(commit(s=>saveHabit(s,childId,id,values),'구체적인 할 일을 저장했어요.'))dialog.close();}
    if(type==='child'){const name=String(data.get('name')).trim();if(!name)throw new Error('이름을 적어 주세요.');if(commit(s=>{Object.assign(s.children.find(c=>c.id===id),{name,avatar:selectedAvatar,style:data.get('style')});},'이름과 모습을 바꿨어요.'))dialog.close();}
    if(type==='reward'){const title=String(data.get('title')).trim(),cost=Number(data.get('cost'));if(!title||!Number.isInteger(cost)||cost<1||cost>9999)throw new Error('선물 이름과 별 개수를 확인해 주세요.');if(commit(s=>{if(id)Object.assign(s.rewards.find(r=>r.id===id),{title,cost});else s.rewards.push({id:uid(),title,cost,icon:'gift'});},'선물 약속을 저장했어요.'))dialog.close();}
    if(type==='note'){commit(s=>{s.notes[`${childId}/${weekStart(date)}`]=String(data.get('note')).trim();},'이번 주의 이야기를 남겼어요.');}
    if(type==='connect'){const code=String(data.get('connection')||'').trim(),url=String(data.get('url')||'').trim(),key=String(data.get('key')||'').trim();const config=code?decodeConnection(code):{url,key};if(!config.url||config.key.length<30)throw new Error('연결 코드 또는 주소와 가족 열쇠를 입력해 주세요.');form.querySelector('[type="submit"]').disabled=true;await connectCloud(config);}
  }catch(error){const target=form.querySelector('.form-error');if(target)target.textContent=error.message;else toast(error.message);}
  finally{const button=form.querySelector('[type="submit"]');if(button)button.disabled=false;}
});
window.addEventListener('storage',event=>{if(event.key===STORE_KEY&&event.newValue){try{state=validateState(JSON.parse(event.newValue));cloudConfig=readCloudConfig();generation++;render();toast('다른 창에서 바뀐 기록을 반영했어요.');}catch{toast('다른 창의 기록을 확인하지 못했어요.');}}});
window.addEventListener('online',()=>syncCloud());
setInterval(()=>{if(document.visibilityState==='visible'&&state)syncCloud();},30000);
dialog.addEventListener('close',()=>{if(pendingRemote){pendingRemote.bridge.close();pendingRemote=null;setCloudMessage('');}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state){if(date>today())date=today();syncCloud();}});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
let printFolds=[];
window.addEventListener('beforeprint',()=>{printFolds=[...root.querySelectorAll('details[data-fold]')].map(el=>[el,el.open]);printFolds.forEach(([el])=>el.open=true);});
window.addEventListener('afterprint',()=>printFolds.forEach(([el,open])=>el.open=open));
render();
if(state){
  try{if(!localStorage.getItem(STORE_KEY))state=persist(state);}catch{loaded.warning='기기에 저장하지 못했어요. 일반 Safari 창에서 열어 주세요.';render();}
  if(location.hash.startsWith('#connect=')){const code=location.hash.slice(9);history.replaceState(null,'',location.pathname+location.search);connectDialog(decodeURIComponent(code));}
  else if(cloudConfig?.enabled)connectCloud(cloudConfig,true).catch(()=>{});
}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
