import { aiConfig, fromAI } from './ai.js';
import { fromBank } from './bank/index.js';
import { DIFFICULTIES, SUBJECTS } from './curriculum.js';

export class InputError extends Error {}

// 화면에서 온 값은 목록에 있는 것만 받는다.
function resolveSelection(input) {
  const { subject, unit, difficulty } = input && typeof input === 'object' ? input : {};
  const foundSubject = SUBJECTS.find((s) => s.id === subject);
  if (!foundSubject) throw new InputError('교과를 선택해 주세요.');
  const foundUnit = foundSubject.units.find((u) => u.id === unit);
  if (!foundUnit) throw new InputError('단원을 선택해 주세요.');
  const foundDifficulty = DIFFICULTIES.find((d) => d.id === difficulty);
  if (!foundDifficulty) throw new InputError('난이도를 선택해 주세요.');
  return { subject: foundSubject, unit: foundUnit, difficulty: foundDifficulty };
}

// AI 설정이 있으면 AI 로 만들고, 없거나 실패하면 내장 문제은행으로 만든다.
export async function generateQuiz(input, { env = process.env, fetchImpl = fetch, rng = Math.random } = {}) {
  const selection = resolveSelection(input);
  const { subject, unit, difficulty } = selection;
  const result = { subject: subject.label, unit: unit.label, difficulty: difficulty.label };

  const config = aiConfig(env);
  if (config) {
    try {
      const questions = await fromAI(selection, config, { fetchImpl, rng });
      return { ...result, source: 'ai', questions };
    } catch (error) {
      console.error(`[AI 생성 실패] ${error.message}`);
      result.notice = 'AI 생성에 실패하여 내장 문제은행의 문항으로 대신 만들었습니다.';
    }
  }
  return { ...result, source: 'bank', questions: fromBank(subject.id, unit.id, difficulty.id, rng) };
}
