export function esc(value='') {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const paths={
  home:'<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  book:'<path d="M12 6C9 3 4 4 3 4v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-1 0-6-1-9 2Zm0 0v15"/>',
  pencil:'<path d="m15 4 5 5M4 20l1-6L16 3a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3L10 19z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  move:'<circle cx="15" cy="4" r="2"/><path d="m8 10 4-3 4 3 4 1m-8-4-2 7 5 3 1 5M10 14l-4 6H2"/>',
  music:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
  star:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/>',
  chart:'<path d="M4 3v17h17M9 15v-4m5 4V6m5 9V9"/>',
  gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3zm0 0h4a3 3 0 1 0-3-3z"/>',
  settings:'<path d="M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z"/><circle cx="12" cy="12" r="3"/>',
  check:'<path d="m5 12 4 4L19 6"/>', plus:'<path d="M12 5v14M5 12h14"/>',
  left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  cloud:'<path d="M7 19H6a5 5 0 1 1 .5-10 6 6 0 0 1 11-3A5 5 0 1 1 19 19h-2M12 13v8m-3-3 3 3 3-3"/>',
  leaf:'<path d="M20 3c1 10-3 16-9 16S2 12 6 8s9-2 14-5ZM6 21l9-11"/>',
  game:'<path d="M7 7h10c3 0 5 9 4 12s-4 1-6-2H9c-2 3-5 5-6 2S4 7 7 7ZM7 10v5m-2-2.5h4m7-1h.01m2 3h.01"/>',
  sparkles:'<path d="m12 3 2 6 6 3-6 3-2 6-2-6-6-3 6-3ZM20 2v4m-2-2h4"/>',
  undo:'<path d="M4 10h10a6 6 0 1 1 0 12M4 10l5-5m-5 5 5 5"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 11h18m-13 4h.01m4 0h.01m4 0h.01"/>'
};
export function icon(name,cls='') {return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.star}</svg>`;}
export function avatar(type,cls='') {
  const faces={fox:'<path d="m10 25-3-19 21 11L49 6l-3 19" fill="#c87543"/><path d="M7 26c0-13 42-13 42 0S43 49 28 49 7 39 7 26" fill="#e8a26a"/><path d="M8 29c8-3 14 2 20 10 6-8 12-13 20-10-2 12-8 19-20 19S10 41 8 29" fill="#fff4df"/>',bunny:'<ellipse cx="18" cy="16" rx="7" ry="15" fill="#d8c6d9"/><ellipse cx="38" cy="16" rx="7" ry="15" fill="#d8c6d9"/><ellipse cx="18" cy="14" rx="3" ry="10" fill="#e8afba"/><ellipse cx="38" cy="14" rx="3" ry="10" fill="#e8afba"/><ellipse cx="28" cy="34" rx="23" ry="20" fill="#f1e3e9"/>',bear:'<circle cx="10" cy="14" r="9" fill="#ae9375"/><circle cx="46" cy="14" r="9" fill="#ae9375"/><circle cx="28" cy="31" r="24" fill="#c6aa89"/><ellipse cx="28" cy="40" rx="12" ry="9" fill="#f4e4cc"/>',cat:'<path d="M6 26V5l18 13h8L50 5v21" fill="#afbdac"/><ellipse cx="28" cy="32" rx="24" ry="21" fill="#c3cfba"/><path d="m4 36 12 2m-10 5 10-2m24-3 12-2m-12 5 10 2" stroke="#667f66" stroke-width="2"/>'};
  return `<svg class="avatar ${cls}" viewBox="0 0 56 56" aria-hidden="true">${faces[type]||faces.fox}<circle cx="19" cy="31" r="2" fill="#424638"/><circle cx="37" cy="31" r="2" fill="#424638"/><path d="m25 39 3 2 3-2" fill="none" stroke="#735e53" stroke-width="2" stroke-linecap="round"/><ellipse cx="12" cy="37" rx="4" ry="2" fill="#e9aaa0" opacity=".7"/><ellipse cx="44" cy="37" rx="4" ry="2" fill="#e9aaa0" opacity=".7"/></svg>`;
}
export function garden(count=0) {
  return `<svg class="garden" viewBox="0 0 300 230" role="img" aria-label="작은 실천과 함께 자라는 화분"><circle cx="220" cy="50" r="27" fill="#ead58a"/><path d="M219 12v-7m0 89v-7m-39-37h-7m88 0h-7m-9-26 6-6m-57 57 6-6" stroke="#ead58a" stroke-width="3" stroke-linecap="round"/><ellipse cx="152" cy="211" rx="97" ry="10" fill="#c8d3bb"/><path d="M92 159h115l-14 43c-2 8-84 8-87 0z" fill="#d99776"/><rect x="85" y="147" width="130" height="19" rx="8" fill="#e8b193"/><path d="M149 148V65" stroke="#648260" stroke-width="6" stroke-linecap="round"/><path d="M147 122c-37 2-51-21-46-39 35-6 49 14 46 39" fill="#839f6c"/><path d="M153 100c37 4 53-19 50-35-35-9-52 8-50 35" fill="#55784f"/><path d="M148 76c-24-10-23-37-9-49 27 16 28 35 9 49" fill="#a7bb83"/><path d="m119 101 28 21m6-22 30-21" stroke="#e2e9d2" stroke-width="2" opacity=".7"/><circle cx="65" cy="125" r="4" fill="#fff9e7"/><path d="m245 133 3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#fff9e7"/>${count>0?'<circle cx="152" cy="46" r="14" fill="#f2d67e"/><circle cx="152" cy="46" r="6" fill="#dbb46b"/>':''}<path d="M137 181h.01m23 0h.01" stroke="#845b48" stroke-width="4" stroke-linecap="round"/><path d="M142 190q7 6 14 0" fill="none" stroke="#845b48" stroke-width="2" stroke-linecap="round"/></svg>`;
}
