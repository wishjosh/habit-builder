import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
for(const name of ['app.js','planner-ui.js','index.html','sw.js']){
  const content=readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
  const found=[...content.matchAll(/\b0\.\d+\.\d+\b/g)].map(match=>match[0]);
  assert.ok(found.length,`${name}: 앱 버전 표기가 없습니다.`);
  assert.ok(found.every(value=>value===version),`${name}: ${version}과 다른 버전 표기가 있습니다: ${[...new Set(found)].join(', ')}`);
}
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
assert.ok(worker.includes(`habit-builder-v${version}`),'서비스 워커 캐시 번호가 앱 버전과 다릅니다.');
console.log(`앱·화면 파일·캐시 버전 일치: ${version}`);
