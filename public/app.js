const CHOICE_MARKS = ['①', '②', '③', '④'];
const SOURCE_LABELS = { ai: 'AI 생성', bank: '내장 문제은행' };
const AI_REVIEW_NOTICE = 'AI가 만든 문항입니다. 수업에 쓰기 전에 정답과 내용을 꼭 확인해 주세요.';

const $ = (selector) => document.querySelector(selector);
const form = $('#quiz-form');
const subjectSelect = $('#subject');
const unitSelect = $('#unit');
const difficultyBox = $('#difficulty');
const submitButton = $('#submit');
const statusLine = $('#status');
const resultSection = $('#result');
const cardList = $('#cards');
const revealAllButton = $('#reveal-all');

let meta;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'class') node.className = value;
    else node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

// 글 속의 2/5 는 세로 분수로, "1과 2/5" 는 대분수 표기로 바꾸어 넣는다.
function mathText(text) {
  const fragment = document.createDocumentFragment();
  let last = 0;
  for (const match of text.matchAll(/(?:(\d+)([과와]) )?(\d+)\/(\d+)/g)) {
    const [, whole, particle, top, bottom] = match;
    const label = `${whole ? `${whole}${particle} ` : ''}${bottom}분의 ${top}`;
    const fraction = el('span', { class: 'frac' }, el('span', {}, top), el('span', {}, bottom));
    fragment.append(text.slice(last, match.index));
    fragment.append(el('span', { class: 'math', role: 'img', 'aria-label': label }, whole ?? '', fraction));
    last = match.index + match[0].length;
  }
  fragment.append(text.slice(last));
  return fragment;
}

function setStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.classList.toggle('error', isError);
}

function fillUnits() {
  const subject = meta.subjects.find((s) => s.id === subjectSelect.value);
  unitSelect.replaceChildren();
  const groups = new Map();
  for (const unit of subject.units) {
    const option = el('option', { value: unit.id }, unit.label);
    if (!unit.group) {
      unitSelect.append(option);
      continue;
    }
    if (!groups.has(unit.group)) {
      groups.set(unit.group, el('optgroup', { label: unit.group }));
      unitSelect.append(groups.get(unit.group));
    }
    groups.get(unit.group).append(option);
  }
}

function showDifficultyGuide() {
  const chosen = new FormData(form).get('difficulty');
  $('#difficulty-guide').textContent = meta.difficulties.find((d) => d.id === chosen)?.guide ?? '';
}

function fillForm() {
  subjectSelect.replaceChildren(...meta.subjects.map((s) => el('option', { value: s.id }, s.label)));
  fillUnits();
  difficultyBox.replaceChildren(
    ...meta.difficulties.map((d) => {
      const input = el('input', { type: 'radio', name: 'difficulty', value: d.id });
      input.checked = d.id === 'medium';
      return el('label', {}, input, el('span', {}, d.label));
    }),
  );
  showDifficultyGuide();
  $('#source-hint').textContent = meta.aiEnabled
    ? '문항 출처: AI 생성 (실패하면 내장 문제은행으로 대신 만듭니다)'
    : '문항 출처: 내장 문제은행 (AI 키를 설정하면 AI로 만듭니다)';
}

function setRevealed(card, revealed) {
  card.classList.toggle('revealed', revealed);
  const button = card.querySelector('button');
  button.textContent = revealed ? '정답 숨기기' : '정답 보기';
  button.setAttribute('aria-expanded', String(revealed));
}

function syncRevealAll() {
  const cards = [...cardList.children];
  const allRevealed = cards.length > 0 && cards.every((card) => card.classList.contains('revealed'));
  revealAllButton.textContent = allRevealed ? '정답 모두 숨기기' : '정답 모두 보기';
  revealAllButton.setAttribute('aria-pressed', String(allRevealed));
}

function buildCard(question, index) {
  const choices = question.choices.map((choice, i) =>
    el(
      'li',
      { class: i === question.answerIndex ? 'choice correct' : 'choice' },
      el('span', { class: 'choice-no' }, CHOICE_MARKS[i]),
      el('span', { class: 'choice-text' }, mathText(choice)),
      el('span', { class: 'choice-mark' }, '정답'),
    ),
  );
  const toggle = el('button', { type: 'button', class: 'secondary', 'aria-expanded': 'false' }, '정답 보기');
  const card = el(
    'li',
    { class: 'card' },
    el('p', { class: 'card-no' }, `문제 ${index + 1}`),
    el('p', { class: 'question' }, mathText(question.question)),
    el('ol', { class: 'choices' }, ...choices),
    el('p', { class: 'explanation' }, el('strong', {}, `정답 ${CHOICE_MARKS[question.answerIndex]} `), mathText(question.explanation)),
    toggle,
  );
  toggle.addEventListener('click', () => {
    setRevealed(card, !card.classList.contains('revealed'));
    syncRevealAll();
  });
  return card;
}

function render(quiz) {
  $('#result-title').textContent = `${quiz.subject} · ${quiz.unit} · ${quiz.difficulty}`;
  $('#source').textContent = SOURCE_LABELS[quiz.source] ?? '';
  const notice = quiz.notice ?? (quiz.source === 'ai' ? AI_REVIEW_NOTICE : '');
  $('#notice').textContent = notice;
  $('#notice').hidden = !notice;
  cardList.replaceChildren(...quiz.questions.map(buildCard));
  syncRevealAll();
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('서버에 연결할 수 없습니다. 프로그램이 실행 중인지 확인해 주세요.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? '요청을 처리하지 못했습니다.');
  return data;
}

subjectSelect.addEventListener('change', fillUnits);
difficultyBox.addEventListener('change', showDifficultyGuide);

revealAllButton.addEventListener('click', () => {
  const reveal = revealAllButton.getAttribute('aria-pressed') !== 'true';
  for (const card of cardList.children) setRevealed(card, reveal);
  syncRevealAll();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  setStatus('문제를 만들고 있어요…');
  try {
    const quiz = await requestJson('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    render(quiz);
    setStatus('');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

try {
  meta = await requestJson('/api/meta');
  fillForm();
} catch (error) {
  submitButton.disabled = true;
  setStatus(error.message, true);
}
