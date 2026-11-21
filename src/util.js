export const QUIZ_SIZE = 5;
export const CHOICE_COUNT = 4;

export function shuffle(rng, items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 선택지 순서를 섞고 정답 위치를 다시 계산한다.
export function shuffleChoices(rng, { question, choices, answerIndex, explanation }) {
  const order = shuffle(rng, choices.map((_, i) => i));
  return {
    question,
    choices: order.map((i) => choices[i]),
    answerIndex: order.indexOf(answerIndex),
    explanation,
  };
}
