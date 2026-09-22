/** Habit Builder. Deploy as a web app executing as the owner, with Anyone access.
 * The spreadsheet stays private. Every read/write requires the family secret.
 * Only setup() creates a spreadsheet; subsequent requests use its saved ID.
 */
var APP_ORIGIN = 'https://wishjosh.github.io';
function setup() {
  var p=PropertiesService.getScriptProperties();
  if(p.getProperty('SHEET_ID'))throw new Error('이미 초기화했습니다. 기존 연결 설정을 사용하세요.');
  var sheet=SpreadsheetApp.create('습관 형성 시스템 · Habit Builder');
  sheet.getSheets()[0].setName('State');
  sheet.getSheetByName('State').getRange('A1:B1').setValues([['revision',0]]);
  sheet.insertSheet('실천 기록').appendRow(['날짜','아이','활동','완료 기준','별']);
  sheet.insertSheet('아이와 활동').appendRow(['아이','활동','완료 기준','반복','목표 횟수','별']);
  sheet.insertSheet('이전 저장');
  var key=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  p.setProperties({SHEET_ID:sheet.getId(),KEY_HASH:hash_(key)});
  console.log('SHEET_URL='+sheet.getUrl());
  console.log('FAMILY_KEY='+key);
  return {url:sheet.getUrl(),key:key};
}
function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function authenticate_(key){var expected=PropertiesService.getScriptProperties().getProperty('KEY_HASH');if(!expected||typeof key!=='string'||key.length<30||hash_(key)!==expected)throw new Error('가족 연결 코드가 맞지 않아요.');}
function spreadsheet_(){var id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');if(!id)throw new Error('먼저 setup 함수를 실행해 주세요.');return SpreadsheetApp.openById(id);}
function readSnapshot_(sheet){var rows=sheet.getDataRange().getValues();var revision=Number(rows[0][1])||0;var raw=rows.slice(1).map(function(r){return r[0]?String(r[0]).slice(1):'';}).join('');return {revision:revision,state:raw?JSON.parse(raw):null};}
function validate_(state){
  if(!state||state.schema!==1||!Array.isArray(state.children)||!state.children.length||state.children.length>8||!Array.isArray(state.habits)||state.habits.length>500||!state.entries||typeof state.entries!=='object'||Array.isArray(state.entries)||!Array.isArray(state.rewards)||!Array.isArray(state.redemptions)||Object.keys(state.entries).length>50000)throw new Error('올바른 기록 형식이 아니에요.');
  var raw=JSON.stringify(state);if(raw.length>1500000)throw new Error('기록이 너무 커서 저장할 수 없어요. 백업한 뒤 확인해 주세요.');return raw;
}
function cell_(value){var s=String(value==null?'':value);return /^[=+@\-\t\r]/.test(s)?"'"+s:s;}
function bridge(request){
  authenticate_(request&&request.key);
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var ss=spreadsheet_(),sheet=ss.getSheetByName('State'),current=readSnapshot_(sheet);
    if(request.action==='read')return current;
    if(request.action!=='write')throw new Error('지원하지 않는 요청이에요.');
    if(!Number.isInteger(request.revision)||request.revision!==current.revision)return {conflict:true,revision:current.revision};
    var raw=validate_(request.state),chunks=[];
    for(var i=0;i<raw.length;i+=25000)chunks.push(['#'+raw.slice(i,i+25000),'']);
    var backup=ss.getSheetByName('이전 저장');backup.clearContents();
    var previous=sheet.getDataRange().getValues();backup.getRange(1,1,previous.length,2).setValues(previous);
    // One setValues publishes the revision and all chunks together. Extra old rows are blanked in the same write.
    var rows=[['revision',current.revision+1]].concat(chunks);
    while(rows.length<previous.length)rows.push(['','']);
    sheet.getRange(1,1,rows.length,2).setValues(rows);SpreadsheetApp.flush();
    try{updateViews_(ss,request.state);}catch(viewError){console.warn('읽기용 표 갱신: '+viewError.message);}
    return {revision:current.revision+1,updatedAt:request.state.updatedAt};
  }finally{lock.releaseLock();}
}
function updateViews_(ss,state){
  var names={};state.children.forEach(function(c){names[c.id]=c.name;});
  var records=[['날짜','아이','활동','완료 기준','별']];
  Object.keys(state.entries).map(function(k){return state.entries[k];}).sort(function(a,b){return a.date.localeCompare(b.date);}).forEach(function(e){records.push([e.date,cell_(names[e.childId]),cell_(e.snapshot.title),cell_(e.snapshot.detail),e.points]);});
  var logs=ss.getSheetByName('실천 기록');logs.clearContents();logs.getRange(1,1,records.length,5).setValues(records);logs.setFrozenRows(1);
  var plans=[['아이','활동','완료 기준','반복','목표 횟수','별']];
  state.habits.forEach(function(h){if(h.archivedFrom)return;var versions=h.versions.slice().sort(function(a,b){return b.effectiveFrom.localeCompare(a.effectiveFrom);}),v=versions[0];plans.push([cell_(names[h.childId]),cell_(v.title),cell_(v.detail),v.frequency,v.target,v.points]);});
  var activities=ss.getSheetByName('아이와 활동');activities.clearContents();activities.getRange(1,1,plans.length,6).setValues(plans);activities.setFrozenRows(1);
}
function doGet(e){
  var nonce=e&&e.parameter&&e.parameter.nonce||'';
  if(!/^[a-zA-Z0-9-]{20,80}$/.test(nonce))return HtmlService.createHtmlOutput('습관 형성 시스템의 부모 메뉴에서 연결해 주세요.');
  var html='<!doctype html><html><head><meta name="referrer" content="no-referrer"></head><body><script>'+
    'var origin='+JSON.stringify(APP_ORIGIN)+',nonce='+JSON.stringify(nonce)+';'+
    'function send(m){window.top.postMessage(Object.assign({channel:"habit-builder",nonce:nonce},m),origin);}'+
    'window.addEventListener("message",function(e){var m=e.data;if(e.origin!==origin||e.source!==window.top||!m||m.channel!=="habit-builder"||m.nonce!==nonce)return;'+
    'google.script.run.withSuccessHandler(function(result){send({type:"response",id:m.id,result:result});}).withFailureHandler(function(error){send({type:"response",id:m.id,error:error.message||"저장 연결 오류"});}).bridge({key:m.key,action:m.action,revision:m.revision,state:m.state});});'+
    'send({type:"ready"});<\/script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL).setTitle('Habit Builder 연결');
}
