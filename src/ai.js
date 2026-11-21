// OpenAI 호환 Chat Completions API 로 문항을 만든다. (OpenAI, Azure AI Foundry 등)
import { CHOICE_COUNT, QUIZ_SIZE, shuffleChoices } from './util.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const TIMEOUT_MS = 45_000;
const MAX_QUESTION_LENGTH = 600;
const MAX_CHOICE_LENGTH = 200;

// 키와 모델이 모두 설정되어 있을 때만 AI 를 쓴다.
export function aiConfig(env = process.env) {
  const apiKey = env.AI_API_KEY?.trim();
  const model = env.AI_MODEL?.trim();
  if (!apiKey || !model) return null;
  return { apiKey, model, baseUrl: (env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '') };
}

function buildMessages({ subject, unit, difficulty }) {
  const unitName = unit.group ? `${unit.group} ${unit.label}` : unit.label;
  const system = [
    '당신은 대한민국 초등학교 3학년 담임 교사를 돕는 평가 문항 출제자입니다.',
    '2022 개정 교육과정의 초등학교 3학년 수준에 맞는 4지선다 문항을 만듭니다.',
    '',
    '반드시 지킬 규칙:',
    `- 문항은 정확히 ${QUIZ_SIZE}개이고, 문항마다 서로 다른 내용을 묻습니다.`,
    `- 선택지는 정확히 ${CHOICE_COUNT}개이고 서로 달라야 하며, 정답은 하나뿐입니다.`,
    '- 사실이 정확해야 하고, 정답이 둘 이상으로 볼 수 있는 문항은 만들지 않습니다.',
    '- 선택지에 번호나 기호를 붙이지 않습니다. "모두 정답", "정답 없음", "위의 것 모두"처럼 순서에 기대는 선택지는 쓰지 않습니다.',
    '- 그림이나 표 없이 글만 읽고 풀 수 있어야 합니다.',
    '- 3학년 학생이 읽을 수 있는 쉬운 낱말과 짧은 문장으로 씁니다.',
    '- 분수는 2/5 와 같이 씁니다.',
    '- 해설은 정답인 까닭을 한두 문장으로 씁니다.',
    '',
    '다음 JSON 형식으로만 답합니다. answerIndex 는 정답 선택지의 위치(0부터 시작)입니다.',
    '{"questions":[{"question":"문제","choices":["선택지","선택지","선택지","선택지"],"answerIndex":0,"explanation":"해설"}]}',
  ].join('\n');
  const user = [`교과: ${subject.label}`, `단원: ${unitName}`, `난이도: ${difficulty.label} (${difficulty.guide})`].join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

const clean = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');

function toQuestion(raw, index) {
  const fail = (reason) => {
    throw new Error(`AI 응답의 ${index + 1}번 문항: ${reason}`);
  };
  const question = clean(raw?.question);
  if (!question || question.length > MAX_QUESTION_LENGTH) fail('문제가 비어 있거나 너무 깁니다.');
  if (!Array.isArray(raw.choices) || raw.choices.length !== CHOICE_COUNT) fail(`선택지가 ${CHOICE_COUNT}개가 아닙니다.`);
  const choices = raw.choices.map((choice) => clean(choice).replace(/^[①②③④]\s*/, ''));
  if (choices.some((choice) => !choice || choice.length > MAX_CHOICE_LENGTH)) fail('선택지가 비어 있거나 너무 깁니다.');
  if (new Set(choices).size !== CHOICE_COUNT) fail('같은 선택지가 있습니다.');
  const { answerIndex } = raw;
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= CHOICE_COUNT) fail('정답 위치가 올바르지 않습니다.');
  return { question, choices, answerIndex, explanation: clean(raw.explanation).slice(0, MAX_QUESTION_LENGTH) };
}

// 모델이 돌려준 글을 검증된 문항 목록으로 바꾼다. 형식이 하나라도 어긋나면 오류를 낸다.
export function parseQuiz(content) {
  const text = clean(content).replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('AI 응답이 JSON 형식이 아닙니다.');
  }
  const list = Array.isArray(data) ? data : data?.questions;
  if (!Array.isArray(list) || list.length < QUIZ_SIZE) throw new Error(`AI 응답의 문항이 ${QUIZ_SIZE}개보다 적습니다.`);
  const questions = list.slice(0, QUIZ_SIZE).map(toQuestion);
  if (new Set(questions.map((q) => q.question)).size !== QUIZ_SIZE) throw new Error('AI 응답에 같은 문제가 있습니다.');
  return questions;
}

export async function fromAI(selection, config, { fetchImpl = fetch, rng = Math.random } = {}) {
  const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      // Azure 는 api-key 헤더로도 인증한다. 같은 서버에 같은 키를 보내므로 함께 넣어 둔다.
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      model: config.model,
      messages: buildMessages(selection),
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`AI 서버가 ${response.status} 응답을 보냈습니다.`);
  const data = await response.json();
  return parseQuiz(data?.choices?.[0]?.message?.content).map((q) => shuffleChoices(rng, q));
}
