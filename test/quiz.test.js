import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuiz } from '../src/ai.js';
import { fromBank } from '../src/bank/index.js';
import korean from '../src/bank/korean.js';
import science from '../src/bank/science.js';
import social from '../src/bank/social.js';
import { DIFFICULTIES, SUBJECTS } from '../src/curriculum.js';
import { generateQuiz, InputError } from '../src/generate.js';

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const keyOf = (question, choices) => `${question}|${[...choices].sort().join('|')}`;

function assertValidQuiz(questions, where) {
  assert.equal(questions.length, 5, `${where}: 문항 수`);
  for (const q of questions) {
    const detail = `${where}: ${q.question} / ${q.choices.join(', ')}`;
    assert.ok(q.question.trim(), detail);
    assert.equal(q.choices.length, 4, detail);
    assert.ok(q.choices.every((c) => typeof c === 'string' && c.trim()), detail);
    assert.equal(new Set(q.choices).size, 4, `선택지 중복 — ${detail}`);
    assert.ok(Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4, detail);
    assert.ok(q.explanation.trim(), detail);
    assert.doesNotMatch(`${q.question}${q.choices.join('')}${q.explanation}`, /undefined|NaN/, detail);
  }
  assert.equal(new Set(questions.map((q) => keyOf(q.question, q.choices))).size, 5, `${where}: 같은 문항 반복`);
}

test('모든 교과·단원·난이도에서 올바른 형식의 문항 5개를 만든다', () => {
  for (const subject of SUBJECTS) {
    for (const unit of subject.units) {
      for (const { id: level } of DIFFICULTIES) {
        for (let seed = 1; seed <= (subject.id === 'math' ? 60 : 3); seed++) {
          assertValidQuiz(fromBank(subject.id, unit.id, level, seeded(seed)), `${subject.id}/${unit.id}/${level}#${seed}`);
        }
      }
    }
  }
});

test('수학 계산 문항의 정답이 실제 계산 결과와 같다', () => {
  const operate = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };
  let checked = 0;
  for (const unitId of ['add-sub', 'mul1', 'mul2', 'div1', 'div2']) {
    for (const { id: level } of DIFFICULTIES) {
      for (let seed = 1; seed <= 60; seed++) {
        for (const q of fromBank('math', unitId, level, seeded(seed))) {
          const found = q.question.match(/^(\d+) ([+−×÷]) (\d+) = \?$/);
          if (!found) continue;
          const expected = operate[found[2]](Number(found[1]), Number(found[3]));
          assert.equal(Number(q.choices[q.answerIndex]), expected, q.question);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 500, `검사한 계산 문항 수: ${checked}`);
});

test('선택지를 섞은 뒤에도 정답 위치가 원래 정답을 가리킨다', () => {
  const stored = { korean, social, science };
  for (const [subjectId, units] of Object.entries(stored)) {
    for (const [unitId, levels] of Object.entries(units)) {
      for (const [level, items] of Object.entries(levels)) {
        const answers = new Map(items.map(([question, correct, wrongs]) => [keyOf(question, [correct, ...wrongs]), correct]));
        for (const q of fromBank(subjectId, unitId, level, seeded(7))) {
          assert.equal(q.choices[q.answerIndex], answers.get(keyOf(q.question, q.choices)), q.question);
        }
      }
    }
  }
});

const aiQuestion = (n, overrides = {}) => ({
  question: `문제 ${n}`,
  choices: ['가', '나', '다', '라'],
  answerIndex: 2,
  explanation: '해설',
  ...overrides,
});
const aiQuiz = (overrides = {}) => JSON.stringify({ questions: [1, 2, 3, 4, 5].map((n) => aiQuestion(n, n === 1 ? overrides : {})) });

test('AI 응답을 검증한다', () => {
  assert.equal(parseQuiz(aiQuiz()).length, 5);
  assert.equal(parseQuiz(`\`\`\`json\n${aiQuiz()}\n\`\`\``).length, 5);
  assert.deepEqual(parseQuiz(aiQuiz({ choices: ['① 가', '② 나', '③ 다', '④ 라'] }))[0].choices, ['가', '나', '다', '라']);

  assert.throws(() => parseQuiz('문제를 만들었습니다.'), /JSON/);
  assert.throws(() => parseQuiz(JSON.stringify({ questions: [aiQuestion(1)] })), /5개/);
  assert.throws(() => parseQuiz(aiQuiz({ choices: ['가', '나', '다'] })), /선택지/);
  assert.throws(() => parseQuiz(aiQuiz({ choices: ['가', '가', '다', '라'] })), /같은 선택지/);
  assert.throws(() => parseQuiz(aiQuiz({ answerIndex: 4 })), /정답 위치/);
  assert.throws(() => parseQuiz(aiQuiz({ answerIndex: '2' })), /정답 위치/);
  assert.throws(() => parseQuiz(aiQuiz({ question: '문제 2' })), /같은 문제/);
});

const selection = { subject: 'science', unit: 'sound', difficulty: 'easy' };
const aiEnv = { AI_API_KEY: 'test-key', AI_MODEL: 'test-model', AI_BASE_URL: 'https://ai.example/v1/' };
const respondWith = (status, body) => async () => new Response(JSON.stringify(body), { status });

test('AI 설정이 있으면 AI 로 만들고 정답을 유지한 채 선택지를 섞는다', async () => {
  let request;
  const fetchImpl = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ choices: [{ message: { content: aiQuiz() } }] }));
  };
  const quiz = await generateQuiz(selection, { env: aiEnv, fetchImpl, rng: seeded(3) });

  assert.equal(quiz.source, 'ai');
  assert.equal(request.url, 'https://ai.example/v1/chat/completions');
  assert.equal(request.init.headers.Authorization, 'Bearer test-key');
  assert.equal(JSON.parse(request.init.body).model, 'test-model');
  assertValidQuiz(quiz.questions, 'ai');
  for (const q of quiz.questions) assert.equal(q.choices[q.answerIndex], '다');
});

test('AI 가 실패하면 내장 문제은행으로 대신 만들고 알려 준다', async (t) => {
  t.mock.method(console, 'error', () => {});
  const failures = [
    respondWith(401, { error: 'unauthorized' }),
    respondWith(200, { choices: [{ message: { content: '죄송합니다.' } }] }),
    async () => {
      throw new Error('network down');
    },
  ];
  for (const fetchImpl of failures) {
    const quiz = await generateQuiz(selection, { env: aiEnv, fetchImpl });
    assert.equal(quiz.source, 'bank');
    assert.match(quiz.notice, /AI 생성에 실패/);
    assertValidQuiz(quiz.questions, 'fallback');
  }
});

test('AI 설정이 없으면 AI 를 호출하지 않는다', async () => {
  const fetchImpl = async () => assert.fail('AI 를 호출하면 안 됩니다.');
  for (const env of [{}, { AI_API_KEY: 'test-key' }, { AI_MODEL: 'test-model' }]) {
    const quiz = await generateQuiz(selection, { env, fetchImpl });
    assert.equal(quiz.source, 'bank');
    assert.equal(quiz.notice, undefined);
  }
});

test('목록에 없는 입력은 거부한다', async () => {
  const invalid = [null, {}, { ...selection, subject: 'art' }, { ...selection, unit: 'circle' }, { ...selection, difficulty: 'extreme' }];
  for (const input of invalid) {
    await assert.rejects(generateQuiz(input, { env: {} }), InputError);
  }
});
