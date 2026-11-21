import { QUIZ_SIZE, shuffle, shuffleChoices } from '../util.js';
import korean from './korean.js';
import { mathQuestions } from './math.js';
import science from './science.js';
import social from './social.js';

const STORED = { korean, social, science };

function storedQuestions(subjectId, unitId, level, rng) {
  return shuffle(rng, STORED[subjectId][unitId][level])
    .slice(0, QUIZ_SIZE)
    .map(([question, correct, wrongs, explanation]) => ({
      question,
      choices: [correct, ...wrongs],
      answerIndex: 0,
      explanation,
    }));
}

export function fromBank(subjectId, unitId, level, rng = Math.random) {
  const questions = subjectId === 'math' ? mathQuestions(unitId, level, rng) : storedQuestions(subjectId, unitId, level, rng);
  return questions.map((q) => shuffleChoices(rng, q));
}
