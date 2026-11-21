// 화면에 보이는 교과·단원 목록. 학교에서 쓰는 교과서에 맞게 label 을 고쳐도 된다.
// id 는 문제은행(src/bank)과 연결되므로 바꾸지 않는다.

export const DIFFICULTIES = [
  { id: 'easy', label: '쉬움', guide: '교과서의 기본 개념과 낱말을 그대로 확인하는 문제' },
  { id: 'medium', label: '보통', guide: '배운 개념을 이해하고 간단한 상황에 적용하는 문제' },
  { id: 'hard', label: '어려움', guide: '두 단계 이상 생각하거나 까닭을 따져 보아야 하는 문제' },
];

export const SUBJECTS = [
  {
    id: 'korean',
    label: '국어',
    units: [
      { id: 'dictionary', label: '국어사전에서 낱말 찾기' },
      { id: 'words', label: '낱말의 뜻과 관계' },
      { id: 'paragraph', label: '문단과 중심 문장' },
      { id: 'honorific', label: '높임 표현' },
    ],
  },
  {
    id: 'math',
    label: '수학',
    units: [
      { id: 'add-sub', label: '덧셈과 뺄셈', group: '1학기' },
      { id: 'plane', label: '평면도형', group: '1학기' },
      { id: 'div1', label: '나눗셈', group: '1학기' },
      { id: 'mul1', label: '곱셈', group: '1학기' },
      { id: 'length-time', label: '길이와 시간', group: '1학기' },
      { id: 'frac-dec', label: '분수와 소수', group: '1학기' },
      { id: 'mul2', label: '곱셈', group: '2학기' },
      { id: 'div2', label: '나눗셈', group: '2학기' },
      { id: 'circle', label: '원', group: '2학기' },
      { id: 'frac', label: '분수', group: '2학기' },
      { id: 'vol-weight', label: '들이와 무게', group: '2학기' },
      { id: 'pictograph', label: '그림그래프', group: '2학기' },
    ],
  },
  {
    id: 'social',
    label: '사회',
    units: [
      { id: 'place', label: '우리가 사는 곳' },
      { id: 'past', label: '옛날과 오늘날의 생활 모습' },
      { id: 'transport', label: '교통과 통신 수단의 변화' },
      { id: 'environment', label: '환경에 따른 생활 모습' },
    ],
  },
  {
    id: 'science',
    label: '과학',
    units: [
      { id: 'force', label: '힘과 우리 생활', group: '1학기' },
      { id: 'animals', label: '동물의 생활', group: '1학기' },
      { id: 'plants', label: '식물의 생활', group: '1학기' },
      { id: 'lifecycle', label: '생물의 한살이', group: '1학기' },
      { id: 'matter', label: '물체와 물질', group: '2학기' },
      { id: 'earth', label: '지구와 바다', group: '2학기' },
      { id: 'sound', label: '소리의 성질', group: '2학기' },
      { id: 'health', label: '감염병과 건강한 생활', group: '2학기' },
    ],
  },
];
