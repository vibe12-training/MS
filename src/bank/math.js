// 수학 문항은 저장해 두지 않고 매번 새 숫자로 계산해서 만든다.
// 각 템플릿은 정답을 choices[0] 에 둔 문항을 돌려주고, 선택지 섞기는 호출하는 쪽에서 한다.
import { QUIZ_SIZE, shuffle } from '../util.js';

const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, arr) => arr[ri(r, 0, arr.length - 1)];
const until = (gen, ok) => {
  for (;;) {
    const v = gen();
    if (ok(v)) return v;
  }
};
const near = (n, ...deltas) => deltas.map((d) => n + d);
const tens = (n) => Math.floor(n / 10);

// 수를 소리 내어 읽었을 때 끝소리에 맞는 조사를 고른다. josa(3, '을/를') → '을'
// 분수는 분자를 마지막에 읽으므로 분자를 넘긴다. (2/5를 = "5분의 2를")
function josa(n, pair) {
  const last = n % 10;
  const [withFinal, withoutFinal] = pair.split('/');
  if (pair === '으로/로') return [0, 3, 6].includes(last) ? withFinal : withoutFinal;
  return [2, 4, 5, 9].includes(last) ? withoutFinal : withFinal;
}

function distinct(r, count, a, b, ok = () => true) {
  const out = [];
  while (out.length < count) {
    const v = ri(r, a, b);
    if (!out.includes(v) && ok(v)) out.push(v);
  }
  return out;
}

// 숫자 정답 문항. 오답 후보 가운데 정답과 다르고 서로 다른 값 3개를 고른다.
function num(r, question, answer, wrongValues, explanation, fmt = String) {
  const wrongs = [];
  for (const v of shuffle(r, wrongValues)) {
    if (wrongs.length < 3 && Number.isInteger(v) && v > 0 && v !== answer && !wrongs.includes(v)) wrongs.push(v);
  }
  for (let v = answer + 1; wrongs.length < 3; v++) {
    if (!wrongs.includes(v)) wrongs.push(v);
  }
  return { question, choices: [answer, ...wrongs].map(fmt), explanation };
}

const txt = (question, correct, wrongs, explanation) => ({ question, choices: [correct, ...wrongs], explanation });
const fixed = (...items) => items.map((item) => () => txt(...item));

// 가장 큰(작은) 것을 고르는 문항. values 는 서로 달라야 한다.
function extreme(question, values, fmt, wantMax, explanation) {
  const sorted = [...values].sort((x, y) => (wantMax ? y - x : x - y));
  return { question, choices: sorted.map(fmt), explanation: explanation(fmt(sorted[0])) };
}

const unit = (name) => (v) => `${v} ${name}`;
const counter = (name) => (v) => `${v}${name}`;
// 1000 m = 1 km 처럼 두 단위를 함께 쓰는 표기
const compound = (big, small, base) => (v) => {
  const q = Math.floor(v / base);
  const rem = v % base;
  if (q === 0) return `${rem}${small}`;
  return rem === 0 ? `${q}${big}` : `${q}${big} ${rem}${small}`;
};
const cm = unit('cm');
const kmM = compound(' km', ' m', 1000);
const cmMm = compound(' cm', ' mm', 10);
const minSec = compound('분', '초', 60);
const hourMin = compound('시', '분', 60);
const lMl = compound(' L', ' mL', 1000);
const kgG = compound(' kg', ' g', 1000);

/* ───────── 1학기 ───────── */

const digitWise = (a, b, f) => {
  while (a > 0 || b > 0) {
    if (f(a % 10, b % 10)) return true;
    a = tens(a);
    b = tens(b);
  }
  return false;
};
const hasCarry = (a, b) => digitWise(a, b, (x, y) => x + y > 9);
const hasBorrow = (a, b) => digitWise(a, b, (x, y) => x < y);

// 받아올림(받아내림)이 없는 세 자리 수 두 개
function plainPair(r, kind) {
  let a = 0;
  let b = 0;
  for (let i = 0; i < 3; i++) {
    const lead = i === 0;
    let x;
    let y;
    if (kind === 'add') {
      x = ri(r, lead ? 1 : 0, lead ? 8 : 9);
      y = ri(r, lead ? 1 : 0, 9 - x);
    } else {
      x = ri(r, lead ? 2 : 0, 9);
      y = ri(r, lead ? 1 : 0, lead ? x - 1 : x);
    }
    a = a * 10 + x;
    b = b * 10 + y;
  }
  return [a, b];
}

const addQ = (r, a, b) =>
  num(r, `${a} + ${b} = ?`, a + b, near(a + b, 10, -10, 100, -100, 1, -1), `같은 자리 수끼리 더하면 ${a} + ${b} = ${a + b}입니다.`);
const subQ = (r, a, b) =>
  num(r, `${a} − ${b} = ?`, a - b, near(a - b, 10, -10, 100, -100, 1, -1), `같은 자리 수끼리 빼면 ${a} − ${b} = ${a - b}입니다.`);

const addSub = {
  easy: [(r) => addQ(r, ...plainPair(r, 'add')), (r) => subQ(r, ...plainPair(r, 'sub'))],
  medium: [
    (r) => addQ(r, ...until(() => [ri(r, 101, 899), ri(r, 101, 899)], ([a, b]) => hasCarry(a, b))),
    (r) =>
      subQ(
        r,
        ...until(
          () => {
            const a = ri(r, 301, 999);
            return [a, ri(r, 101, a - 100)];
          },
          ([a, b]) => hasBorrow(a, b),
        ),
      ),
  ],
  hard: [
    (r) => {
      const b = ri(r, 125, 489);
      const x = ri(r, 136, 498);
      return num(r, `□ + ${b} = ${x + b}에서 □ 안에 알맞은 수는 얼마인가요?`, x, [x + 2 * b, ...near(x, 10, -10, 100, -100)], `□ = ${x + b} − ${b} = ${x}입니다.`);
    },
    (r) => {
      const b = ri(r, 125, 389);
      const d = ri(r, 136, 498);
      return num(r, `□ − ${b} = ${d}에서 □ 안에 알맞은 수는 얼마인가요?`, d + b, [d - b, ...near(d + b, 10, -10, 100, -100)], `□ = ${d} + ${b} = ${d + b}입니다.`);
    },
    (r) => {
      const a = ri(r, 300, 600);
      const b = ri(r, 120, 380);
      const c = ri(r, 105, 295);
      const ans = a + b - c;
      return num(
        r,
        `도서관에 책이 ${a}권 있었습니다. 오늘 ${b}권을 새로 들여오고 ${c}권을 빌려주었습니다. 지금 도서관에 있는 책은 몇 권인가요?`,
        ans,
        [a + b, a + b + c, ...near(ans, 10, -10, 100)],
        `${a} + ${b} = ${a + b}, ${a + b} − ${c} = ${ans}이므로 ${ans}권입니다.`,
        counter('권'),
      );
    },
  ],
};

// [가로, 세로] — 가로가 더 길다
const rectangle = (r) => distinct(r, 2, 3, 15).sort((x, y) => y - x);

const plane = {
  easy: fixed(
    ['두 점을 곧게 이은 선을 무엇이라고 하나요?', '선분', ['직선', '반직선', '곡선'], '두 점을 곧게 이은 선을 선분이라고 합니다.'],
    ['한 점에서 시작하여 한쪽으로 끝없이 늘인 곧은 선을 무엇이라고 하나요?', '반직선', ['선분', '직선', '각'], '한 점에서 시작하여 한쪽으로 끝없이 늘인 곧은 선은 반직선입니다.'],
    ['선분을 양쪽으로 끝없이 늘인 곧은 선을 무엇이라고 하나요?', '직선', ['선분', '반직선', '곡선'], '선분을 양쪽으로 끝없이 늘인 곧은 선은 직선입니다.'],
    ['한 점에서 그은 두 반직선으로 이루어진 도형을 무엇이라고 하나요?', '각', ['선분', '원', '삼각형'], '한 점에서 그은 두 반직선으로 이루어진 도형이 각입니다.'],
    ['한 각이 직각인 삼각형을 무엇이라고 하나요?', '직각삼각형', ['정사각형', '직사각형', '원'], '한 각이 직각인 삼각형을 직각삼각형이라고 합니다.'],
    ['네 각이 모두 직각이고 네 변의 길이가 모두 같은 사각형은 무엇인가요?', '정사각형', ['직각삼각형', '삼각형', '원'], '네 각이 모두 직각이고 네 변의 길이가 모두 같으면 정사각형입니다.'],
    ['직사각형에는 직각이 모두 몇 개 있나요?', '4개', ['1개', '2개', '3개'], '직사각형은 네 각이 모두 직각입니다.'],
  ),
  medium: [
    ...fixed(
      ['직각삼각형에는 직각이 몇 개 있나요?', '1개', ['2개', '3개', '4개'], '직각삼각형은 한 각만 직각입니다.'],
      ['각 ㄱㄴㄷ에서 각의 꼭짓점은 어느 점인가요?', '점 ㄴ', ['점 ㄱ', '점 ㄷ', '점 ㄹ'], '각을 읽을 때 가운데에 오는 점이 꼭짓점입니다.'],
      ['네 각이 모두 직각인 사각형을 무엇이라고 하나요?', '직사각형', ['직각삼각형', '삼각형', '원'], '네 각이 모두 직각인 사각형이 직사각형입니다.'],
      ['시계의 긴바늘과 짧은바늘이 이루는 각이 직각인 시각은 언제인가요?', '3시', ['2시', '6시', '12시'], '3시에는 두 바늘이 직각을 이룹니다.'],
      ['직사각형에 대한 설명으로 옳은 것은 어느 것인가요?', '네 각이 모두 직각이다', ['변이 3개이다', '직각이 1개뿐이다', '굽은 선으로 둘러싸여 있다'], '직사각형은 네 각이 모두 직각인 사각형입니다.'],
    ),
    (r) => {
      const n = ri(r, 3, 15);
      return num(r, `한 변의 길이가 ${n} cm인 정사각형의 네 변의 길이의 합은 몇 cm인가요?`, 4 * n, [2 * n, 3 * n, n + 4, 4 * n + 4], `${n} × 4 = ${4 * n}(cm)입니다.`, cm);
    },
    (r) => {
      const [a, b] = rectangle(r);
      const ans = 2 * (a + b);
      return num(r, `가로가 ${a} cm, 세로가 ${b} cm인 직사각형의 네 변의 길이의 합은 몇 cm인가요?`, ans, [a + b, a * b, ans + 2, ans - 2], `${a} + ${b} + ${a} + ${b} = ${ans}(cm)입니다.`, cm);
    },
  ],
  hard: [
    ...fixed(
      ['다음 중 옳은 설명은 어느 것인가요?', '정사각형은 직사각형이라고 할 수 있다', ['직사각형은 언제나 정사각형이다', '직각삼각형에는 직각이 2개 있다', '선분은 양쪽으로 끝이 없다'], '정사각형도 네 각이 모두 직각이므로 직사각형이라고 할 수 있습니다.'],
      ['점 ㄱ에서 시작하여 점 ㄴ을 지나는 반직선을 바르게 읽은 것은 어느 것인가요?', '반직선 ㄱㄴ', ['반직선 ㄴㄱ', '선분 ㄱㄴ', '직선 ㄱㄴ'], '반직선은 시작하는 점을 먼저 읽습니다.'],
      ['직사각형 모양의 종이를 마주 보는 두 꼭짓점을 잇는 선을 따라 잘랐습니다. 어떤 도형이 몇 개 생기나요?', '직각삼각형 2개', ['직사각형 2개', '정사각형 2개', '직각삼각형 4개'], '직사각형을 이렇게 자르면 직각이 하나씩 있는 삼각형 2개가 됩니다.'],
    ),
    (r) => {
      const n = ri(r, 3, 15);
      return num(r, `네 변의 길이의 합이 ${4 * n} cm인 정사각형이 있습니다. 한 변의 길이는 몇 cm인가요?`, n, [2 * n, 4 * n, n + 1, n - 1, n + 4], `네 변의 길이가 모두 같으므로 ${4 * n} ÷ 4 = ${n}(cm)입니다.`, cm);
    },
    (r) => {
      const [a, b] = rectangle(r);
      const p = 2 * (a + b);
      return num(r, `네 변의 길이의 합이 ${p} cm인 직사각형이 있습니다. 가로가 ${a} cm일 때 세로는 몇 cm인가요?`, b, [p - a, a + b, b + 1, b + 2, 2 * b], `가로와 세로의 합은 ${a + b} cm이므로 세로는 ${a + b} − ${a} = ${b}(cm)입니다.`, cm);
    },
    (r) => {
      const n = ri(r, 2, 12);
      return num(r, `한 변의 길이가 ${n} cm인 정사각형 2개를 겹치지 않게 이어 붙여 직사각형을 만들었습니다. 이 직사각형의 네 변의 길이의 합은 몇 cm인가요?`, 6 * n, [8 * n, 4 * n, 3 * n, 6 * n + 2], `가로 ${2 * n} cm, 세로 ${n} cm인 직사각형이므로 ${2 * n} + ${n} + ${2 * n} + ${n} = ${6 * n}(cm)입니다.`, cm);
    },
  ],
};

// [나누어지는 수, 나누는 수, 몫] — 곱셈구구 범위
const timesTable = (r) => {
  const b = ri(r, 2, 9);
  const q = ri(r, 2, 9);
  return [b * q, b, q];
};

const div1 = {
  easy: [
    (r) => {
      const [a, b, q] = timesTable(r);
      return num(r, `${a} ÷ ${b} = ?`, q, near(q, 1, -1, 2, -2, 3), `${b} × ${q} = ${a}이므로 ${a} ÷ ${b} = ${q}입니다.`);
    },
    (r) => {
      const [a, b, q] = timesTable(r);
      return num(r, `딸기 ${a}개를 접시 ${b}개에 똑같이 나누어 담으려고 합니다. 한 접시에 몇 개씩 담아야 하나요?`, q, near(q, 1, -1, 2, -2, 3), `${a} ÷ ${b} = ${q}이므로 ${q}개씩 담습니다.`, counter('개'));
    },
  ],
  medium: [
    (r) => {
      const [a, b, q] = timesTable(r);
      return num(r, `구슬 ${a}개를 한 봉지에 ${b}개씩 담으려고 합니다. 봉지는 몇 개 필요한가요?`, q, [a - b, ...near(q, 1, -1, 2, -2)], `${a} ÷ ${b} = ${q}이므로 봉지 ${q}개가 필요합니다.`, counter('개'));
    },
    (r) => {
      const [a, b, q] = timesTable(r);
      return txt(`다음 나눗셈식을 곱셈식으로 바르게 나타낸 것은 어느 것인가요?\n${a} ÷ ${b} = ${q}`, `${b} × ${q} = ${a}`, [`${a} × ${b} = ${q}`, `${b} × ${a} = ${q}`, `${b} × ${q} = ${a + b}`], `나누는 수와 몫을 곱하면 나누어지는 수가 되므로 ${b} × ${q} = ${a}입니다.`);
    },
    (r) => {
      const [a, b, q] = timesTable(r);
      return num(r, `□ × ${b} = ${a}에서 □ 안에 알맞은 수는 얼마인가요?`, q, [a - b, ...near(q, 1, -1, 2, -2)], `□ = ${a} ÷ ${b} = ${q}입니다.`);
    },
  ],
  hard: [
    (r) => {
      const [a, b, q] = timesTable(r);
      return num(r, `□ ÷ ${b} = ${q}에서 □ 안에 알맞은 수는 얼마인가요?`, a, [b + q, ...near(a, b, -b, q, -q, 1)], `□ = ${b} × ${q} = ${a}입니다.`);
    },
    (r) => {
      const [a, b, q] = timesTable(r);
      return num(r, `${a} ÷ □ = ${q}에서 □ 안에 알맞은 수는 얼마인가요?`, b, [a - q, ...near(b, 1, -1, 2, -2)], `${q} × ${b} = ${a}이므로 □ = ${b}입니다.`);
    },
    (r) => {
      const [a, b, q] = timesTable(r);
      const [c, d, p] = timesTable(r);
      return num(r, `${a} ÷ ${b}의 몫과 ${c} ÷ ${d}의 몫을 더하면 얼마인가요?`, q + p, [q * p, ...near(q + p, 1, -1, 2, -2)], `${a} ÷ ${b} = ${q}, ${c} ÷ ${d} = ${p}이므로 ${q} + ${p} = ${q + p}입니다.`);
    },
  ],
};

const mulQ = (r, a, b) => num(r, `${a} × ${b} = ?`, a * b, near(a * b, 10, -10, a, -a, b, -b), `${a} × ${b} = ${a * b}입니다.`);

const mul1 = {
  easy: [
    (r) => mulQ(r, ri(r, 1, 9) * 10, ri(r, 2, 9)),
    (r) => mulQ(r, ...until(() => [ri(r, 1, 4) * 10 + ri(r, 1, 4), ri(r, 2, 4)], ([a, b]) => tens(a) * b <= 9 && (a % 10) * b <= 9)),
  ],
  medium: [
    (r) => mulQ(r, ...until(() => [ri(r, 13, 99), ri(r, 2, 9)], ([a, b]) => a % 10 !== 0 && ((a % 10) * b > 9 || tens(a) * b > 9))),
  ],
  hard: [
    (r) => {
      const a = ri(r, 12, 48);
      const b = ri(r, 3, 9);
      const c = ri(r, 5, 25);
      const ans = a * b - c;
      return num(r, `한 상자에 귤이 ${a}개씩 들어 있습니다. ${b}상자에 든 귤 중에서 ${c}개를 먹었다면 남은 귤은 몇 개인가요?`, ans, [a * b, a * b + c, ...near(ans, 10, -10)], `${a} × ${b} = ${a * b}, ${a * b} − ${c} = ${ans}이므로 ${ans}개입니다.`, counter('개'));
    },
    (r) => {
      const a = ri(r, 12, 36);
      const b = ri(r, 3, 8);
      const c = ri(r, 11, 29);
      const d = ri(r, 2, 6);
      const ans = a * b + c * d;
      return num(r, `한 봉지에 ${a}개씩 든 사탕 ${b}봉지와 한 봉지에 ${c}개씩 든 초콜릿 ${d}봉지가 있습니다. 사탕과 초콜릿은 모두 몇 개인가요?`, ans, [a * b, c * d, ...near(ans, 10, -10)], `${a} × ${b} = ${a * b}, ${c} × ${d} = ${c * d}이므로 모두 ${ans}개입니다.`, counter('개'));
    },
    (r) => {
      const a = ri(r, 12, 28);
      const b = ri(r, 3, 7);
      const left = ri(r, 11, 45);
      const total = a * b + left;
      return num(r, `전체가 ${total}쪽인 책을 하루에 ${a}쪽씩 ${b}일 동안 읽었습니다. 남은 쪽수는 몇 쪽인가요?`, left, [a * b, total, ...near(left, 10, -10, 1)], `${a} × ${b} = ${a * b}, ${total} − ${a * b} = ${left}이므로 ${left}쪽입니다.`, counter('쪽'));
    },
  ],
};

const lengthTime = {
  easy: [
    (r) => {
      const a = ri(r, 2, 30);
      return num(r, `${a} cm는 몇 mm인가요?`, 10 * a, [100 * a, a, a + 10], `1 cm = 10 mm이므로 ${a} cm = ${10 * a} mm입니다.`, unit('mm'));
    },
    (r) => {
      const a = ri(r, 2, 9);
      return num(r, `${a} km는 몇 m인가요?`, 1000 * a, [100 * a, 10 * a, 10000 * a], `1 km = 1000 m이므로 ${a} km = ${1000 * a} m입니다.`, unit('m'));
    },
    (r) => {
      const a = ri(r, 2, 9);
      return num(r, `${a}분은 몇 초인가요?`, 60 * a, [100 * a, 10 * a, 60 * a + 60, 60 + a], `1분 = 60초이므로 ${a}분 = ${60 * a}초입니다.`, counter('초'));
    },
  ],
  medium: [
    (r) => {
      const a = ri(r, 2, 25);
      const b = ri(r, 1, 9);
      const ans = 10 * a + b;
      return num(r, `${a} cm ${b} mm는 몇 mm인가요?`, ans, [100 * a + b, a + b, ans + 10, 10 * b + a], `${a} cm = ${10 * a} mm이므로 ${10 * a} + ${b} = ${ans}(mm)입니다.`, unit('mm'));
    },
    (r) => {
      const a = ri(r, 1, 9);
      const b = ri(r, 2, 18) * 50;
      const ans = 1000 * a + b;
      return num(r, `${a} km ${b} m는 몇 m인가요?`, ans, [100 * a + b, 10000 * a + b, ans + 1000, a + b], `${a} km = ${1000 * a} m이므로 ${1000 * a} + ${b} = ${ans}(m)입니다.`, unit('m'));
    },
    (r) => {
      const a = ri(r, 1, 6);
      const b = ri(r, 5, 55);
      const ans = 60 * a + b;
      return num(r, `${a}분 ${b}초는 몇 초인가요?`, ans, [100 * a + b, ans + 60, a + b, 60 * a], `${a}분 = ${60 * a}초이므로 ${60 * a} + ${b} = ${ans}(초)입니다.`, counter('초'));
    },
    (r) => {
      const n = until(() => ri(r, 23, 198), (v) => v % 10 !== 0);
      return num(r, `${n} mm는 몇 cm 몇 mm인가요?`, n, near(n, 10, -10, 20, 30), `10 mm = 1 cm이므로 ${n} mm = ${cmMm(n)}입니다.`, cmMm);
    },
  ],
  hard: [
    (r) => {
      const [h, m, d] = until(() => [ri(r, 1, 9), ri(r, 7, 11) * 5, ri(r, 3, 10) * 5], ([, m, d]) => m + d >= 60);
      const ans = 60 * h + m + d;
      return num(r, `${h}시 ${m}분에서 ${d}분이 지난 시각은 몇 시 몇 분인가요?`, ans, near(ans, 60, -60, 10, -10, 5), `${m}분 + ${d}분 = ${m + d}분이고 60분은 1시간이므로 ${hourMin(ans)}입니다.`, hourMin);
    },
    (r) => {
      const [a, b, c, d] = until(() => [ri(r, 1, 6), ri(r, 25, 55), ri(r, 1, 6), ri(r, 15, 55)], ([, b, , d]) => b + d >= 60);
      const ans = 60 * (a + c) + b + d;
      return num(r, `${a}분 ${b}초 + ${c}분 ${d}초는 얼마인가요?`, ans, near(ans, 60, -60, 10, -10), `${b}초 + ${d}초 = ${b + d}초이고 60초는 1분이므로 ${minSec(ans)}입니다.`, minSec);
    },
    (r) => {
      const a = ri(r, 1, 5);
      const c = ri(r, 1, 4);
      const b = ri(r, 5, 9) * 100;
      const d = ri(r, 5, 9) * 100;
      const ans = 1000 * (a + c) + b + d;
      return num(r, `${a} km ${b} m + ${c} km ${d} m는 얼마인가요?`, ans, near(ans, 1000, -1000, 100, -100), `${b} m + ${d} m = ${b + d} m이고 1000 m는 1 km이므로 ${kmM(ans)}입니다.`, kmM);
    },
  ],
};

const tenth = (v) => (v / 10).toFixed(1);

const fracDec = {
  easy: [
    (r) => {
      const n = ri(r, 3, 9);
      const k = ri(r, 1, n - 1);
      return txt(`전체를 똑같이 ${n}${josa(n, '으로/로')} 나눈 것 중의 ${k}만큼을 분수로 바르게 나타낸 것은 어느 것인가요?`, `${k}/${n}`, [`${n}/${k}`, `${k}/${n + 1}`, `${k + 1}/${n}`], `전체를 나눈 수가 분모, 그중 고른 부분의 수가 분자이므로 ${k}/${n}입니다.`);
    },
    (r) => {
      const n = ri(r, 3, 9);
      const k = ri(r, 1, n - 1);
      return txt(`분수 ${k}/${n}${josa(k, '을/를')} 바르게 읽은 것은 어느 것인가요?`, `${n}분의 ${k}`, [`${k}분의 ${n}`, `${n}분의 ${k + 1}`, `${n}${josa(n, '과/와')} ${k}`], '분수는 분모를 먼저 읽어 "(분모)분의 (분자)"라고 읽습니다.');
    },
    (r) => {
      const k = ri(r, 2, 9);
      return txt(`0.1이 ${k}개인 수는 얼마인가요?`, `0.${k}`, [`${k}`, `1.${k}`, `0.${k === 9 ? 8 : k + 1}`], `0.1이 ${k}개이면 0.${k}입니다.`);
    },
    (r) => {
      const k = ri(r, 2, 9);
      return txt(`분수 ${k}/10${josa(k, '을/를')} 소수로 나타내면 얼마인가요?`, `0.${k}`, [`${k}.1`, `1.${k}`, `${k}`], `${k}/10 = 0.${k}입니다.`);
    },
  ],
  medium: [
    (r) => extreme('다음 중 가장 큰 분수는 어느 것인가요?', distinct(r, 4, 2, 12), (d) => `1/${d}`, false, (a) => `단위분수는 분모가 작을수록 크므로 가장 큰 분수는 ${a}입니다.`),
    (r) => extreme('다음 중 가장 작은 분수는 어느 것인가요?', distinct(r, 4, 2, 12), (d) => `1/${d}`, true, (a) => `단위분수는 분모가 클수록 작으므로 가장 작은 분수는 ${a}입니다.`),
    (r) => {
      const n = ri(r, 7, 12);
      return extreme('다음 중 가장 큰 분수는 어느 것인가요?', distinct(r, 4, 1, n - 1), (k) => `${k}/${n}`, true, (a) => `분모가 같으면 분자가 클수록 크므로 가장 큰 분수는 ${a}입니다.`);
    },
    (r) => extreme('다음 중 가장 큰 소수는 어느 것인가요?', distinct(r, 4, 1, 49), tenth, true, (a) => `자연수 부분부터 차례로 비교하면 가장 큰 수는 ${a}입니다.`),
    (r) => extreme('다음 중 가장 작은 소수는 어느 것인가요?', distinct(r, 4, 1, 49), tenth, false, (a) => `자연수 부분부터 차례로 비교하면 가장 작은 수는 ${a}입니다.`),
  ],
  hard: [
    (r) => {
      const [a, b] = distinct(r, 2, 1, 9);
      return txt(`${a}${josa(a, '과/와')} 0.${b}만큼인 수는 얼마인가요?`, `${a}.${b}`, [`${b}.${a}`, `${a}${b}`, `0.${b}`], `${a}보다 0.${b}만큼 더 큰 수는 ${a}.${b}입니다.`);
    },
    (r) => {
      const [t, o] = distinct(r, 2, 1, 5);
      const n = 10 * t + o;
      return txt(`0.1이 ${n}개인 수는 얼마인가요?`, `${t}.${o}`, [`${n}`, `${o}.${t}`, `${t + 1}.${o}`], `0.1이 10개이면 1이므로 0.1이 ${n}개이면 ${t}.${o}입니다.`);
    },
    (r) => {
      const [a, b] = distinct(r, 2, 1, 9);
      return txt(`${a} cm ${b} mm는 몇 cm인지 소수로 나타내면 얼마인가요?`, `${a}.${b} cm`, [`${a}${b} cm`, `${b}.${a} cm`, `0.${b} cm`], `${b} mm = 0.${b} cm이므로 ${a}.${b} cm입니다.`);
    },
    (r) => {
      const [n, k] = until(() => [ri(r, 5, 10), ri(r, 1, 9)], ([n, k]) => k < n && n !== 2 * k);
      return txt(`피자 한 판을 똑같이 ${n}조각으로 나누어 ${k}조각을 먹었습니다. 남은 피자는 전체의 얼마인가요?`, `${n - k}/${n}`, [`${k}/${n}`, `${n}/${n - k}`, `${n - k}/${k}`], `남은 조각은 ${n} − ${k} = ${n - k}(조각)이므로 전체의 ${n - k}/${n}입니다.`);
    },
  ],
};

/* ───────── 2학기 ───────── */

const mul2 = {
  easy: [
    (r) => {
      const [a, b] = until(
        () => [ri(r, 1, 4) * 100 + ri(r, 0, 4) * 10 + ri(r, 1, 4), ri(r, 2, 4)],
        ([a, b]) => [tens(tens(a)), tens(a) % 10, a % 10].every((d) => d * b <= 9),
      );
      return num(r, `${a} × ${b} = ?`, a * b, near(a * b, 10, -10, 100, -100, b), `${a} × ${b} = ${a * b}입니다.`);
    },
    (r) => {
      const a = ri(r, 2, 9);
      const b = ri(r, 2, 9);
      const ans = a * b * 100;
      return num(r, `${a * 10} × ${b * 10} = ?`, ans, [a * b, a * b * 10, a * b * 1000], `${a} × ${b} = ${a * b}에 0을 2개 붙이면 ${ans}입니다.`);
    },
  ],
  medium: [
    (r) => {
      const [a, b] = until(() => [ri(r, 112, 987), ri(r, 2, 9)], ([a, b]) => a % 10 !== 0 && (a % 10) * b > 9);
      return num(r, `${a} × ${b} = ?`, a * b, near(a * b, 10, -10, 100, -100, b, -b), `${a} × ${b} = ${a * b}입니다.`);
    },
    (r) => {
      const a = ri(r, 12, 49);
      const b = ri(r, 12, 39);
      return num(r, `${a} × ${b} = ?`, a * b, near(a * b, 10, -10, 100, -100, a, -a), `${a} × ${b} = ${a * b}입니다.`);
    },
  ],
  hard: [
    (r) => {
      const a = ri(r, 12, 36);
      const b = ri(r, 12, 25);
      const c = ri(r, 11, 60);
      const ans = a * b - c;
      return num(r, `한 상자에 사과가 ${a}개씩 들어 있습니다. ${b}상자에 든 사과 중에서 ${c}개를 팔았다면 남은 사과는 몇 개인가요?`, ans, [a * b, a * b + c, ...near(ans, 10, -10, 100)], `${a} × ${b} = ${a * b}, ${a * b} − ${c} = ${ans}이므로 ${ans}개입니다.`, counter('개'));
    },
    (r) => {
      const a = ri(r, 25, 45);
      const b = ri(r, 11, 19);
      const c = ri(r, 12, 24);
      const d = ri(r, 11, 16);
      const ans = a * b + c * d;
      return num(r, `${a}명씩 탈 수 있는 버스 ${b}대와 ${c}명씩 탈 수 있는 버스 ${d}대가 있습니다. 모두 몇 명이 탈 수 있나요?`, ans, [a * b, c * d, ...near(ans, 10, -10, 100)], `${a} × ${b} = ${a * b}, ${c} × ${d} = ${c * d}이므로 모두 ${ans}명입니다.`, counter('명'));
    },
    (r) => {
      const a = pick(r, [350, 450, 550, 650, 750, 850]);
      const b = ri(r, 2, 5);
      const ans = 5000 - a * b;
      return num(r, `한 권에 ${a}원인 공책을 ${b}권 사고 5000원을 냈습니다. 거스름돈은 얼마인가요?`, ans, [a * b, ...near(ans, 100, -100, 50, -50, 1000)], `${a} × ${b} = ${a * b}, 5000 − ${a * b} = ${ans}이므로 ${ans}원입니다.`, counter('원'));
    },
  ],
};

const div2 = {
  easy: [
    (r) => {
      const [a, b] = until(() => [ri(r, 2, 9) * 10, ri(r, 2, 9)], ([a, b]) => a % (b * 10) === 0);
      return num(r, `${a} ÷ ${b} = ?`, a / b, near(a / b, 1, -1, 10, -10, 5), `${a} ÷ ${b} = ${a / b}입니다.`);
    },
    (r) => {
      const [q, b] = until(() => [ri(r, 1, 4) * 10 + ri(r, 1, 4), ri(r, 2, 4)], ([q, b]) => tens(q) * b <= 9 && (q % 10) * b <= 9);
      return num(r, `${q * b} ÷ ${b} = ?`, q, near(q, 1, -1, 10, -10, 2), `${b} × ${q} = ${q * b}이므로 ${q * b} ÷ ${b} = ${q}입니다.`);
    },
  ],
  medium: [
    (r) => {
      const b = ri(r, 3, 9);
      const q = ri(r, 3, 9);
      const rem = ri(r, 1, b - 1);
      return txt(`${b * q + rem} ÷ ${b}의 몫과 나머지를 바르게 구한 것은 어느 것인가요?`, `몫 ${q}, 나머지 ${rem}`, [`몫 ${q + 1}, 나머지 ${rem}`, `몫 ${q}, 나머지 ${rem + 1}`, `몫 ${q - 1}, 나머지 ${rem}`], `${b} × ${q} = ${b * q}, ${b * q} + ${rem} = ${b * q + rem}이므로 몫은 ${q}, 나머지는 ${rem}입니다.`);
    },
    (r) => {
      const [q, b] = until(() => [ri(r, 12, 49), ri(r, 2, 7)], ([q, b]) => q * b <= 98 && tens(q * b) % b !== 0);
      return num(r, `${q * b} ÷ ${b} = ?`, q, near(q, 1, -1, 10, -10, 2, -2), `${b} × ${q} = ${q * b}이므로 ${q * b} ÷ ${b} = ${q}입니다.`);
    },
  ],
  hard: [
    (r) => {
      const [q, b] = until(() => [ri(r, 23, 320), ri(r, 2, 9)], ([q, b]) => q * b >= 100 && q * b <= 999);
      return num(r, `${q * b} ÷ ${b} = ?`, q, near(q, 1, -1, 10, -10, b), `${b} × ${q} = ${q * b}이므로 ${q * b} ÷ ${b} = ${q}입니다.`);
    },
    (r) => {
      const b = ri(r, 3, 9);
      const q = ri(r, 11, 25);
      const rem = ri(r, 1, b - 1);
      const ans = b * q + rem;
      return num(r, `어떤 수를 ${b}${josa(b, '으로/로')} 나누면 몫은 ${q}이고 나머지는 ${rem}입니다. 어떤 수는 얼마인가요?`, ans, [b * q, b + q + rem, ...near(ans, b, -b, 1)], `${b} × ${q} = ${b * q}, ${b * q} + ${rem} = ${ans}입니다.`);
    },
    (r) => {
      const b = ri(r, 3, 8);
      const q = ri(r, 11, Math.floor(95 / b));
      const rem = ri(r, 1, b - 1);
      return txt(`구슬 ${b * q + rem}개를 한 주머니에 ${b}개씩 담으려고 합니다. 주머니는 몇 개가 되고, 구슬은 몇 개가 남나요?`, `주머니 ${q}개, 남는 구슬 ${rem}개`, [`주머니 ${q + 1}개, 남는 구슬 ${rem}개`, `주머니 ${q}개, 남는 구슬 ${rem + 1}개`, `주머니 ${q - 1}개, 남는 구슬 ${rem}개`], `${b * q + rem} ÷ ${b}의 몫은 ${q}, 나머지는 ${rem}입니다.`);
    },
  ],
};

const circle = {
  easy: [
    ...fixed(
      ['원을 그릴 때 누름 못이 꽂혔던 점처럼, 원의 한가운데에 있는 점을 무엇이라고 하나요?', '원의 중심', ['원의 반지름', '원의 지름', '꼭짓점'], '원의 한가운데에 있는 점을 원의 중심이라고 합니다.'],
      ['원의 중심과 원 위의 한 점을 이은 선분을 무엇이라고 하나요?', '반지름', ['지름', '원의 중심', '변'], '원의 중심과 원 위의 한 점을 이은 선분이 반지름입니다.'],
      ['원 위의 두 점을 이은 선분 중에서 원의 중심을 지나는 선분을 무엇이라고 하나요?', '지름', ['반지름', '원의 중심', '꼭짓점'], '원의 중심을 지나도록 원 위의 두 점을 이은 선분이 지름입니다.'],
      ['한 원에는 원의 중심이 몇 개 있나요?', '1개', ['2개', '4개', '셀 수 없이 많다'], '한 원에서 원의 중심은 1개뿐입니다.'],
    ),
    (r) => {
      const n = ri(r, 2, 15);
      return num(r, `반지름이 ${n} cm인 원의 지름은 몇 cm인가요?`, 2 * n, [n, 4 * n, n + 2, 3 * n], `지름은 반지름의 2배이므로 ${n} × 2 = ${2 * n}(cm)입니다.`, cm);
    },
    (r) => {
      const n = ri(r, 2, 15);
      return num(r, `지름이 ${2 * n} cm인 원의 반지름은 몇 cm인가요?`, n, [2 * n, 4 * n, n + 1, n + 2], `반지름은 지름의 반이므로 ${2 * n} ÷ 2 = ${n}(cm)입니다.`, cm);
    },
  ],
  medium: [
    ...fixed(
      ['한 원에서 지름의 길이는 반지름의 길이의 몇 배인가요?', '2배', ['1배', '3배', '4배'], '지름은 반지름 2개를 이은 길이와 같으므로 2배입니다.'],
      ['한 원에는 반지름을 몇 개 그을 수 있나요?', '셀 수 없이 많이 그을 수 있다', ['1개', '2개', '4개'], '원 위의 점은 셀 수 없이 많으므로 반지름도 셀 수 없이 많이 그을 수 있습니다.'],
      ['원에 대한 설명으로 옳은 것은 어느 것인가요?', '한 원에서 지름의 길이는 모두 같다', ['한 원에서 반지름은 1개만 그을 수 있다', '지름은 반지름보다 짧다', '원의 중심은 원 위에 있다'], '한 원에서 지름은 어디에 그어도 길이가 모두 같습니다.'],
    ),
    (r) => {
      const n = ri(r, 2, 12);
      return num(r, `컴퍼스를 ${n} cm만큼 벌려서 원을 그렸습니다. 이 원의 지름은 몇 cm인가요?`, 2 * n, [n, 4 * n, n + 2, 3 * n], `컴퍼스를 벌린 길이가 반지름이므로 지름은 ${n} × 2 = ${2 * n}(cm)입니다.`, cm);
    },
    (r) => {
      const values = distinct(r, 4, 2, 12).map((v) => 2 * v);
      const asRadius = new Set(shuffle(r, values).slice(0, 2));
      const fmt = (d) => (asRadius.has(d) ? `반지름이 ${d / 2} cm인 원` : `지름이 ${d} cm인 원`);
      return extreme('다음 중 크기가 가장 큰 원은 어느 것인가요?', values, fmt, true, (a) => `모두 지름으로 바꾸어 비교하면 가장 큰 원은 ${a}입니다.`);
    },
  ],
  hard: [
    (r) => {
      const n = ri(r, 2, 6);
      const k = ri(r, 3, 6);
      const ans = 2 * n * k;
      return num(r, `반지름이 ${n} cm인 원 ${k}개를 서로 맞닿게 한 줄로 나란히 그렸습니다. 첫째 원의 왼쪽 끝에서 마지막 원의 오른쪽 끝까지의 길이는 몇 cm인가요?`, ans, [n * k, ans - 2 * n, ans + n, ans + 2 * n], `원 1개의 지름이 ${2 * n} cm이므로 ${2 * n} × ${k} = ${ans}(cm)입니다.`, cm);
    },
    (r) => {
      const n = ri(r, 2, 12);
      return num(r, `정사각형 안에 꼭 맞게 원을 그렸더니 원의 반지름이 ${n} cm였습니다. 정사각형의 한 변의 길이는 몇 cm인가요?`, 2 * n, [n, 4 * n, 8 * n, 3 * n], `정사각형의 한 변의 길이는 원의 지름과 같으므로 ${n} × 2 = ${2 * n}(cm)입니다.`, cm);
    },
    (r) => {
      const n = ri(r, 2, 9);
      return num(r, `정사각형 안에 꼭 맞게 원을 그렸더니 원의 반지름이 ${n} cm였습니다. 정사각형의 네 변의 길이의 합은 몇 cm인가요?`, 8 * n, [2 * n, 4 * n, 6 * n, 16 * n], `한 변의 길이는 원의 지름인 ${2 * n} cm이므로 ${2 * n} × 4 = ${8 * n}(cm)입니다.`, cm);
    },
    (r) => {
      const n = ri(r, 3, 12);
      return num(r, `크기가 같은 원 2개를 서로 맞닿게 그렸더니 두 원의 중심을 이은 선분의 길이가 ${2 * n} cm였습니다. 원 1개의 지름은 몇 cm인가요?`, 2 * n, [n, 4 * n, 2 * n + 2, 3 * n], `두 원의 중심을 이은 선분은 반지름 2개의 길이와 같으므로 지름도 ${2 * n} cm입니다.`, cm);
    },
  ],
};

const proper = (r) => {
  const b = ri(r, 3, 9);
  return `${ri(r, 1, b - 1)}/${b}`;
};
const improper = (r) => {
  const d = ri(r, 2, 7);
  return `${ri(r, d + 1, 2 * d + 3)}/${d}`;
};
const mixed = (w, x, y) => `${w}${josa(w, '과/와')} ${x}/${y}`;
// [자연수, 분자, 분모] — 분자는 분모보다 작다
const mixedParts = (r) => {
  const y = ri(r, 3, 7);
  return [ri(r, 1, 4), ri(r, 1, y - 1), y];
};
const mixedRandom = (r) => mixed(...mixedParts(r));

const frac = {
  easy: [
    (r) => {
      const k = ri(r, 2, 6);
      const m = ri(r, 2, 9);
      const n = k * m;
      return num(r, `${n}의 1/${k}은 얼마인가요?`, m, [k, n - k, ...near(m, 1, -1, 2)], `${n}${josa(n, '을/를')} 똑같이 ${k}묶음으로 나누면 한 묶음은 ${m}입니다.`);
    },
    (r) => {
      const same = ri(r, 2, 9);
      return txt('다음 중 진분수는 어느 것인가요?', proper(r), [improper(r), `${same}/${same}`, mixedRandom(r)], '진분수는 분자가 분모보다 작은 분수입니다.');
    },
    (r) => {
      const [p1, p2] = until(() => [proper(r), proper(r)], ([a, b]) => a !== b);
      return txt('다음 중 가분수는 어느 것인가요?', improper(r), [p1, p2, mixedRandom(r)], '가분수는 분자가 분모와 같거나 분모보다 큰 분수입니다.');
    },
    (r) => txt('다음 중 대분수는 어느 것인가요?', mixedRandom(r), [proper(r), improper(r), `${ri(r, 1, 9)}`], '대분수는 자연수와 진분수로 이루어진 분수입니다.'),
  ],
  medium: [
    (r) => {
      const k = ri(r, 3, 6);
      const j = ri(r, 2, k - 1);
      const m = ri(r, 2, 8);
      const n = k * m;
      return num(r, `${n}의 ${j}/${k}${josa(j, '은/는')} 얼마인가요?`, j * m, [m, n - j * m, k * j, ...near(j * m, 1, -1)], `${n}의 1/${k}이 ${m}이므로 ${j}/${k}${josa(j, '은/는')} ${m} × ${j} = ${j * m}입니다.`);
    },
    (r) => {
      const [w, x, y] = mixedParts(r);
      const n = w * y + x;
      return num(r, `대분수 ${mixed(w, x, y)}${josa(x, '을/를')} 가분수로 나타내면 얼마인가요?`, n, [w + x, w * y, n + y, n - 1, n + 1], `자연수 ${w}${josa(w, '은/는')} ${w * y}/${y}${josa(w * y, '과/와')} 같으므로, 여기에 ${x}/${y}${josa(x, '을/를')} 더하면 ${n}/${y}입니다.`, (v) => `${v}/${y}`);
    },
    (r) => {
      const [w, x, y] = mixedParts(r);
      const n = w * y + x;
      const other = x < y - 1 ? x + 1 : x - 1;
      return txt(`가분수 ${n}/${y}${josa(n, '을/를')} 대분수로 나타내면 얼마인가요?`, mixed(w, x, y), [mixed(w + 1, x, y), mixed(w, other, y), mixed(w + 2, x, y)], `${n} ÷ ${y}의 몫은 ${w}, 나머지는 ${x}이므로 ${mixed(w, x, y)}입니다.`);
    },
  ],
  hard: [
    (r) => {
      const y = ri(r, 4, 7);
      const values = distinct(r, 4, y + 1, 4 * y - 1, (v) => v % y !== 0);
      const asMixed = new Set(shuffle(r, values).slice(0, 2));
      const fmt = (v) => (asMixed.has(v) ? mixed(Math.floor(v / y), v % y, y) : `${v}/${y}`);
      return extreme('다음 중 가장 큰 분수는 어느 것인가요?', values, fmt, true, (a) => `대분수를 가분수로 고쳐 분자의 크기를 비교하면 가장 큰 분수는 ${a}입니다.`);
    },
    (r) => {
      const k = ri(r, 3, 6);
      const j = ri(r, 1, k - 1);
      const m = ri(r, 2, 8);
      const n = k * m;
      const ans = n - j * m;
      return num(r, `귤 ${n}개 중에서 전체의 ${j}/${k}만큼을 먹었습니다. 남은 귤은 몇 개인가요?`, ans, [j * m, m, n - m, ans + 1, ans + 2], `먹은 귤은 ${n}개의 ${j}/${k}인 ${j * m}개이므로 남은 귤은 ${n} − ${j * m} = ${ans}(개)입니다.`, counter('개'));
    },
    (r) => {
      const k = ri(r, 3, 8);
      const m = ri(r, 3, 9);
      return num(r, `어떤 수의 1/${k}이 ${m}입니다. 어떤 수는 얼마인가요?`, k * m, [k + m, m, k * m + k, k * m - k, k * m + m], `어떤 수는 ${m}씩 ${k}묶음이므로 ${m} × ${k} = ${k * m}입니다.`);
    },
  ],
};

const volWeight = {
  easy: [
    ...fixed(['1 t은 몇 kg인가요?', '1000 kg', ['100 kg', '10 kg', '10000 kg'], '1 t = 1000 kg입니다.']),
    (r) => {
      const a = ri(r, 2, 9);
      return num(r, `${a} L는 몇 mL인가요?`, 1000 * a, [100 * a, 10 * a, 10000 * a], `1 L = 1000 mL이므로 ${a} L = ${1000 * a} mL입니다.`, unit('mL'));
    },
    (r) => {
      const a = ri(r, 2, 9);
      return num(r, `${a} kg은 몇 g인가요?`, 1000 * a, [100 * a, 10 * a, 10000 * a], `1 kg = 1000 g이므로 ${a} kg = ${1000 * a} g입니다.`, unit('g'));
    },
    (r) => {
      const a = ri(r, 2, 9);
      return num(r, `${1000 * a} mL는 몇 L인가요?`, a, [10 * a, 100 * a, 1000 * a], `1000 mL = 1 L이므로 ${1000 * a} mL = ${a} L입니다.`, unit('L'));
    },
  ],
  medium: [
    (r) => {
      const a = ri(r, 1, 9);
      const b = ri(r, 2, 18) * 50;
      const ans = 1000 * a + b;
      return num(r, `${a} L ${b} mL는 몇 mL인가요?`, ans, [100 * a + b, 10000 * a + b, ans + 1000, a + b], `${a} L = ${1000 * a} mL이므로 ${1000 * a} + ${b} = ${ans}(mL)입니다.`, unit('mL'));
    },
    (r) => {
      const a = ri(r, 1, 9);
      const b = ri(r, 2, 18) * 50;
      const ans = 1000 * a + b;
      return num(r, `${a} kg ${b} g은 몇 g인가요?`, ans, [100 * a + b, 10000 * a + b, ans + 1000, a + b], `${a} kg = ${1000 * a} g이므로 ${1000 * a} + ${b} = ${ans}(g)입니다.`, unit('g'));
    },
    (r) => {
      const n = 1000 * ri(r, 2, 9) + ri(r, 2, 18) * 50;
      return num(r, `${n} mL는 몇 L 몇 mL인가요?`, n, near(n, 1000, -1000, 100, -100), `1000 mL = 1 L이므로 ${n} mL = ${lMl(n)}입니다.`, lMl);
    },
    (r) => {
      const n = 1000 * ri(r, 2, 9) + ri(r, 2, 18) * 50;
      return num(r, `${n} g은 몇 kg 몇 g인가요?`, n, near(n, 1000, -1000, 100, -100), `1000 g = 1 kg이므로 ${n} g = ${kgG(n)}입니다.`, kgG);
    },
  ],
  hard: [
    (r) => {
      const a = ri(r, 1, 5);
      const c = ri(r, 1, 4);
      const b = ri(r, 5, 9) * 100;
      const d = ri(r, 5, 9) * 100;
      const ans = 1000 * (a + c) + b + d;
      return num(r, `${a} L ${b} mL + ${c} L ${d} mL는 얼마인가요?`, ans, near(ans, 1000, -1000, 100, -100), `${b} mL + ${d} mL = ${b + d} mL이고 1000 mL는 1 L이므로 ${lMl(ans)}입니다.`, lMl);
    },
    (r) => {
      const c = ri(r, 1, 4);
      const a = c + ri(r, 2, 4);
      const b = ri(r, 1, 4) * 100;
      const d = ri(r, 5, 9) * 100;
      const ans = 1000 * (a - c) + b - d;
      return num(r, `${a} kg ${b} g − ${c} kg ${d} g은 얼마인가요?`, ans, near(ans, 1000, -1000, 100, -100, 200), `1 kg을 1000 g으로 바꾸어 계산하면 ${kgG(ans)}입니다.`, kgG);
    },
    (r) => {
      const a = ri(r, 1, 4);
      const b = ri(r, 6, 9) * 100;
      const c = ri(r, 5, 9) * 100;
      const ans = 1000 * a + b + c;
      return num(r, `무게가 ${a} kg ${b} g인 가방에 ${c} g인 책을 넣었습니다. 책을 넣은 가방의 무게는 얼마인가요?`, ans, near(ans, 1000, -1000, 100, -100), `${b} g + ${c} g = ${b + c} g이고 1000 g은 1 kg이므로 ${kgG(ans)}입니다.`, kgG);
    },
  ],
};

// 그래프 주제마다 조사와 표현이 달라서 질문 문장을 주제별로 적어 둔다.
const GRAPHS = [
  {
    title: '마을별 사과 생산량',
    names: ['햇살 마을', '바람 마을', '구름 마을', '별빛 마을'],
    unit: '상자',
    object: '상자를',
    most: '사과 생산량이 가장 많은 마을은 어디인가요?',
    sum: (a, b) => `${a}, ${b} 두 마을의 사과 생산량을 더하면 모두 몇 상자인가요?`,
    diff: (a, b) => `${a}의 사과 생산량은 ${b}보다 몇 상자 더 많은가요?`,
    range: '사과 생산량이 가장 많은 마을은 가장 적은 마을보다 몇 상자 더 많은가요?',
    missing: (total, a) => `네 마을의 사과 생산량을 모두 더하면 ${total}상자입니다. ${a}의 사과 생산량은 몇 상자인가요?`,
  },
  {
    title: '반별 읽은 책 수',
    names: ['1반', '2반', '3반', '4반'],
    unit: '권',
    object: '권을',
    most: '책을 가장 많이 읽은 반은 어느 반인가요?',
    sum: (a, b) => `${a}, ${b} 두 반이 읽은 책을 더하면 모두 몇 권인가요?`,
    diff: (a, b) => `${a}이 읽은 책은 ${b}이 읽은 책보다 몇 권 더 많은가요?`,
    range: '책을 가장 많이 읽은 반은 가장 적게 읽은 반보다 몇 권 더 많이 읽었나요?',
    missing: (total, a) => `네 반이 읽은 책을 모두 더하면 ${total}권입니다. ${a}이 읽은 책은 몇 권인가요?`,
  },
  {
    title: '종류별 심은 나무 수',
    names: ['소나무', '단풍나무', '은행나무', '벚나무'],
    unit: '그루',
    object: '그루를',
    most: '가장 많이 심은 나무는 무엇인가요?',
    sum: (a, b) => `${a}, ${b} 두 종류를 합하면 모두 몇 그루를 심었나요?`,
    diff: (a, b) => `${a}는 ${b}보다 몇 그루 더 많이 심었나요?`,
    range: '가장 많이 심은 나무는 가장 적게 심은 나무보다 몇 그루 더 많은가요?',
    missing: (total, a) => `심은 나무는 모두 ${total}그루입니다. ${a}는 몇 그루 심었나요?`,
  },
];
const pictures = (v) => '◎'.repeat(tens(v)) + '○'.repeat(v % 10);

// 항목 4개짜리 그림그래프. hidden 번째 항목은 그림 대신 ? 로 보여 준다.
function graph(r, hidden = -1) {
  const g = pick(r, GRAPHS);
  const values = distinct(r, 4, 10, 46, (v) => v % 10 <= 6);
  const rows = g.names.map((name, i) => `${name}: ${i === hidden ? '?' : pictures(values[i])}`);
  return {
    g,
    values,
    text: `[${g.title}] 그림그래프 (◎ = 10${g.unit}, ○ = 1${g.unit})\n${rows.join('\n')}\n\n`,
    list: g.names.map((name, i) => `${name} ${values[i]}${g.unit}`).join(', '),
    fmt: counter(g.unit),
  };
}

const pictograph = {
  easy: [
    (r) => {
      const g = pick(r, GRAPHS);
      const v = ri(r, 1, 5) * 10 + ri(r, 0, 6);
      return num(
        r,
        `그림그래프에서 ◎는 10${g.unit}, ○는 1${g.object} 나타냅니다.\n${pictures(v)}\n위 그림이 나타내는 수는 얼마인가요?`,
        v,
        [tens(v) + (v % 10), (v % 10) * 10 + tens(v), ...near(v, 10, -10, 1)],
        `◎ ${tens(v)}개는 ${tens(v) * 10}, ○ ${v % 10}개는 ${v % 10}이므로 ${v}${g.unit}입니다.`,
        counter(g.unit),
      );
    },
    (r) => {
      const [t, o] = distinct(r, 2, 1, 6);
      const n = 10 * t + o;
      return txt(`그림그래프에서 ◎는 10명, ○는 1명을 나타냅니다. ${n}명을 나타내려면 ◎와 ○를 각각 몇 개 그려야 하나요?`, `◎ ${t}개, ○ ${o}개`, [`◎ ${o}개, ○ ${t}개`, `◎ ${t + 1}개, ○ ${o}개`, `◎ ${t}개, ○ ${o + 1}개`], `${n}${josa(n, '은/는')} 10이 ${t}개, 1이 ${o}개인 수입니다.`);
    },
  ],
  medium: [
    (r) => {
      const { g, values, text, list } = graph(r);
      const top = values.indexOf(Math.max(...values));
      return txt(`${text}${g.most}`, g.names[top], g.names.filter((_, i) => i !== top), `${list}이므로 가장 많은 것은 ${g.names[top]}입니다.`);
    },
    (r) => {
      const { g, values, text, fmt } = graph(r);
      const [i, j] = distinct(r, 2, 0, 3);
      const ans = values[i] + values[j];
      return num(r, `${text}${g.sum(g.names[i], g.names[j])}`, ans, [Math.abs(values[i] - values[j]), ...near(ans, 10, -10, 1, -1)], `${values[i]} + ${values[j]} = ${ans}(${g.unit})입니다.`, fmt);
    },
    (r) => {
      const { g, values, text, fmt } = graph(r);
      const [i, j] = distinct(r, 2, 0, 3).sort((x, y) => values[y] - values[x]);
      const ans = values[i] - values[j];
      return num(r, `${text}${g.diff(g.names[i], g.names[j])}`, ans, [values[i] + values[j], ...near(ans, 10, 1, -1, 2)], `${values[i]} − ${values[j]} = ${ans}(${g.unit})입니다.`, fmt);
    },
  ],
  hard: [
    (r) => {
      const h = ri(r, 1, 3);
      const t = ri(r, 0, 5);
      const o = ri(r, 1, 5);
      const ans = 100 * h + 10 * t + o;
      return num(
        r,
        `그림그래프에서 ◎는 100, ○는 10, △는 1을 나타냅니다.\n${'◎'.repeat(h)}${'○'.repeat(t)}${'△'.repeat(o)}\n위 그림이 나타내는 수는 얼마인가요?`,
        ans,
        [h + t + o, 10 * h + 10 * t + o, ...near(ans, 100, -100, 10, 1)],
        `◎ ${h}개는 ${100 * h}, ○ ${t}개는 ${10 * t}, △ ${o}개는 ${o}이므로 ${ans}입니다.`,
      );
    },
    (r) => {
      const { g, values, text, fmt } = graph(r, 3);
      const total = values.reduce((s, v) => s + v, 0);
      const shown = total - values[3];
      return num(r, `${text}${g.missing(total, g.names[3])}`, values[3], [shown, ...near(values[3], 10, -10, 1, -1)], `그래프에 나타난 세 항목의 합은 ${shown}${g.unit}이므로 ${total} − ${shown} = ${values[3]}(${g.unit})입니다.`, fmt);
    },
    (r) => {
      const { g, values, text, list, fmt } = graph(r);
      const max = Math.max(...values);
      const min = Math.min(...values);
      return num(r, `${text}${g.range}`, max - min, [max + min, ...near(max - min, 10, -10, 1, -1)], `${list}이므로 ${max} − ${min} = ${max - min}(${g.unit})입니다.`, fmt);
    },
  ],
};

const UNITS = {
  'add-sub': addSub,
  plane,
  div1,
  mul1,
  'length-time': lengthTime,
  'frac-dec': fracDec,
  mul2,
  div2,
  circle,
  frac,
  'vol-weight': volWeight,
  pictograph,
};

// 템플릿을 돌아가며 써서 서로 다른 문항 QUIZ_SIZE 개를 만든다.
export function mathQuestions(unitId, level, rng) {
  const templates = shuffle(rng, UNITS[unitId][level]);
  const out = [];
  const seen = new Set();
  for (let i = 0; out.length < QUIZ_SIZE && i < 500; i++) {
    const q = templates[i % templates.length](rng);
    const key = `${q.question}|${q.choices[0]}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ ...q, answerIndex: 0 });
    }
  }
  return out;
}
