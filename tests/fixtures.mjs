import {freshState} from '../engine.js';
export function sampleState(date){
  const state=freshState(date);
  const seeds=[
    ['child-1','1~2장 읽기','읽은 내용을 한 문장으로 이야기해요','reading','once',1,'톰 소여의 모험'],
    ['child-1','A1권 1~2쪽 풀기','푼 문제를 함께 확인해요','math','once',1,'눈높이 수학'],
    ['child-1','내일을 준비해요','가방과 준비물을 챙겨요','life','weekdays',1],
    ['child-1','신나게 움직여요','밖에서 놀거나 몸을 움직여요','movement','weekly',3],
    ['child-2','한 권 함께 읽기','마음에 드는 그림을 찾아 이야기해요','reading','once',1,'아주 배고픈 애벌레'],
    ['child-2','놀이 뒤 정리','놀던 장난감을 제자리에 놓아요','life','daily',1],
    ['child-2','마음껏 그려요','그리기나 만들기를 즐겨요','art','weekly',3]
  ];
  seeds.forEach((s,i)=>state.habits.push({id:`habit-${i+1}`,childId:s[0],versions:[{effectiveFrom:date,title:s[1],detail:s[2],category:s[3],frequency:s[4],days:[1,2,3,4,5],target:s[5],points:1,material:s[6]||'',...(s[4]==='once'?{dueDate:date}:{})}]}));
  return state;
}
