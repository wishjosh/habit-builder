// The bridge uses an authenticated Apps Script iframe; keys never appear in request URLs.
export class SheetBridge {
  constructor(url,key) { this.url=url;this.key=key;this.pending=new Map();this.nonce=crypto.randomUUID();this.source=null;this.origin=null; }
  async open() {
    const u=new URL(this.url);
    if(u.origin!=='https://script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname))throw new Error('Apps Script 웹앱 연결 주소를 확인해 주세요.');
    u.searchParams.set('nonce',this.nonce);
    this.listener=e=>{
      const m=e.data;
      if(!m||m.channel!=='habit-builder'||m.nonce!==this.nonce||!/^https:\/\/([a-z0-9-]+\.)?googleusercontent\.com$/.test(e.origin))return;
      if(m.type==='ready'&&!this.source){this.source=e.source;this.origin=e.origin;this.ready?.();}
      if(e.source!==this.source||e.origin!==this.origin)return;
      const p=this.pending.get(m.id);
      if(p&&m.type==='response'){clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.result);}
    };
    window.addEventListener('message',this.listener);
    this.frame=document.createElement('iframe');this.frame.hidden=true;this.frame.title='가족 기록 저장 연결';
    const ready=new Promise((resolve,reject)=>{this.ready=resolve;this.openTimer=setTimeout(()=>reject(new Error('저장소에 연결하지 못했어요. 인터넷과 연결 주소를 확인해 주세요.')),25000);});
    this.frame.src=u.toString();document.body.append(this.frame);
    try{await ready;clearTimeout(this.openTimer);return await this.request('read');}catch(error){this.close();throw error;}
  }
  request(action,payload={}) {
    if(!this.source)return Promise.reject(new Error('저장소에 먼저 연결해 주세요.'));
    const id=crypto.randomUUID();
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('저장소 응답을 기다리는 중이에요. 이 기기의 기록은 보관되어 있어요.'));},30000);this.pending.set(id,{resolve,reject,timer});this.source.postMessage({channel:'habit-builder',nonce:this.nonce,id,action,key:this.key,...payload},this.origin);});
  }
  close() {clearTimeout(this.openTimer);window.removeEventListener('message',this.listener);this.frame?.remove();this.source=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('연결이 종료됐어요.'));}this.pending.clear();}
}
export const CLOUD_KEY='habit-builder:cloud:v1';
export function readCloudConfig(){try{return JSON.parse(localStorage.getItem(CLOUD_KEY))||null;}catch{return null;}}
export function saveCloudConfig(config){localStorage.setItem(CLOUD_KEY,JSON.stringify(config));}
export function encodeConnection(url,key){return btoa(JSON.stringify({url,key}));}
export function decodeConnection(text){let source=text.trim();if(source.includes('#connect='))source=source.split('#connect=')[1];const value=JSON.parse(atob(decodeURIComponent(source)));if(!value.url||!value.key||value.key.length<30)throw new Error('가족 연결 코드를 확인해 주세요.');return value;}
