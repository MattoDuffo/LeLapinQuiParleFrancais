import { answerSide, type Dir } from '../data';
import { checkAnswer, type CheckResult } from '../answer';
import { formatInterval, t } from '../i18n';
import { nextDue, Session, type SessionItem } from '../session';
import { GRADES, previewDue, type GradeValue } from '../srs';
import { sounds } from '../sound';
import { speakFrench, stopSpeech } from '../speech';
import { saveProgress, state } from '../store';
import { h, icon, ICONS, prefersReducedMotion } from './dom';
import { nav } from './nav';

/** Height / width of a card image. */
const ASPECT = 1019 / 727;
const ACCENTS = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'œ'];
const EASE = 'cubic-bezier(.2,.8,.2,1)';

type Phase = 'entering' | 'faceDown' | 'flipping' | 'prompt' | 'revealing' | 'answer' | 'leaving' | 'done';

export function studyScreen(items: SessionItem[]): HTMLElement {
  const session = new Session(items, state.progress);
  const settings = state.settings;
  const reduceMotion = prefersReducedMotion();
  let phaseValue: Phase = 'entering';
  const root = h('div', { class: 'study', 'data-phase': 'entering' });
  const setPhase = (p: Phase) => {
    phaseValue = p;
    root.dataset.phase = p;
  };
  let rotZ = 0;
  let typed: CheckResult | undefined;

  // ---------- elements ----------
  const backImg = h('img', { class: 'face back', alt: '', draggable: 'false' });
  const frontImg = h('img', { class: 'face front', alt: '', draggable: 'false' });
  const flip = h('div', { class: 'card-flip' }, backImg, frontImg);
  const rot = h('div', { class: 'card-rot' }, flip);
  const pos = h('div', { class: 'card-pos', role: 'button', 'aria-label': t('tapToFlip') }, rot);
  const hint = h('div', { class: 'hint' });
  const stage = h('div', { class: 'stage', onclick: () => onCardTap() }, pos, hint);

  const left = h('span', { class: 'left' });
  const undoBtn = h('button', { class: 'icon-btn', 'aria-label': t('undo'), onclick: () => undo() }, icon(ICONS.undo));
  const speakBtn = h(
    'button',
    { class: 'icon-btn', 'aria-label': t('readAloud'), onclick: () => speak(true) },
    icon(ICONS.speaker),
  );
  const closeBtn = h('button', { class: 'icon-btn', 'aria-label': t('close'), onclick: () => exit() }, icon(ICONS.close));
  const bar = h('header', { class: 'study-bar' }, closeBtn, left, h('span', { class: 'spacer' }), speakBtn, undoBtn);

  const badge = h('span', { class: 'badge' }, t('pronunciation'));
  const promptText = h('p', { class: 'prompt-text' });
  const input = h('input', {
    class: 'answer-input',
    type: 'text',
    placeholder: t('typeAnswer'),
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'done',
  }) as HTMLInputElement;
  input.setAttribute('autocorrect', 'off');
  const accentBar = h(
    'div',
    { class: 'accents' },
    ...ACCENTS.map((ch) =>
      h('button', { type: 'button', class: 'accent', onpointerdown: (e: Event) => insertAccent(e, ch) }, ch),
    ),
  );
  const form = h(
    'form',
    { class: 'type-form', onsubmit: (e: Event) => (e.preventDefault(), submitTyped()) },
    h('div', { class: 'type-row' }, input, h('button', { class: 'check-btn', type: 'submit' }, t('check'))),
    accentBar,
  );
  const promptArea = h('div', { class: 'prompt-area' }, badge, promptText, form);

  const gradeButtons = GRADES.map((g) =>
    h(
      'button',
      { class: `grade g${g}`, onclick: () => grade(g) },
      h('span', { class: 'grade-label' }, t(`g${g}` as 'g1')),
      h('span', { class: 'grade-when' }),
    ),
  );
  const grades = h('div', { class: 'grades', 'aria-label': t('howWell') }, ...gradeButtons);

  form.hidden = true;
  root.append(bar, promptArea, stage, grades);

  // ---------- layout ----------
  let W = 300;
  let H = W * ASPECT;
  let stageH = 600;
  let left0 = 0;

  function layout(): void {
    const rect = stage.getBoundingClientRect();
    const vv = window.visualViewport;
    stageH = Math.max(200, Math.min(rect.height, (vv ? vv.height + vv.offsetTop : window.innerHeight) - rect.top));
    const gradesH = grades.offsetHeight || 96;
    // Size the card from the space it has once revealed (prompt line only, no answer box),
    // so it keeps the same size in typing mode and doesn't jump when the box hides.
    const revealH = root.clientHeight - bar.offsetHeight - 60;
    W = Math.min(rect.width - 32, 420, (revealH - gradesH - 20) / ASPECT);
    H = W * ASPECT;
    left0 = (rect.width - W) / 2;
    pos.style.width = `${W}px`;
    pos.style.height = `${H}px`;
  }

  const yHidden = () => stageH + 24;
  const yPrompt = () => stageH - H / 2;
  /** Face down: the whole card in view, leaving room for the "Tap to flip" note under it. */
  const yFull = () => Math.max(4, (stageH - H - 36) / 2);
  const yReveal = () => {
    const gradesH = grades.offsetHeight || 96;
    return Math.max(4, (stage.getBoundingClientRect().height - gradesH - H) / 2);
  };
  const posAt = (y: number) => `translate(${left0}px, ${y}px)`;
  // Keep the hint just above the card while it waits at the bottom.
  const placeHint = () => {
    hint.style.top =
      phaseValue === 'faceDown' ? `${yFull() + H + 8}px` : `${Math.max(8, yPrompt() - 40)}px`;
  };

  function animate(el: HTMLElement, to: string, ms: number): Promise<void> {
    const from = el.style.transform || 'none';
    el.style.transform = to;
    if (reduceMotion || ms === 0) return Promise.resolve();
    const anim = el.animate([{ transform: from }, { transform: to }], { duration: ms, easing: EASE });
    return anim.finished.then(
      () => undefined,
      () => undefined,
    );
  }

  function fade(to: number, ms: number): Promise<void> {
    const from = getComputedStyle(pos).opacity;
    pos.style.opacity = String(to);
    if (ms === 0) return Promise.resolve();
    return pos
      .animate([{ opacity: from }, { opacity: String(to) }], { duration: ms })
      .finished.then(
        () => undefined,
        () => undefined,
      );
  }

  const onResize = () => {
    layout();
    if (phaseValue === 'faceDown') pos.style.transform = posAt(yFull());
    if (phaseValue === 'prompt') pos.style.transform = posAt(yPrompt());
    placeHint();
    if (phaseValue === 'answer') pos.style.transform = posAt(yReveal());
  };

  // ---------- flow ----------
  const current = () => session.current!;
  const isTypable = (item: SessionItem) =>
    settings.mode === 'type' && item.card.type !== 'pronunciation' && item.card.answerLanguage !== 'zh';
  const frenchVisible = () =>
    (phaseValue === 'prompt' && current().dir === 'fr-en') || phaseValue === 'answer' || phaseValue === 'revealing';

  function speak(force = false): void {
    if (!session.current) return;
    if (!force && !settings.autoSpeak) return;
    speakFrench(current().card.french, settings.voice);
  }

  function updateBar(): void {
    left.textContent = t('left', { n: session.queue.length });
    undoBtn.disabled = session.history.length === 0;
    speakBtn.hidden = !frenchVisible();
  }

  function preload(item?: SessionItem): void {
    if (!item) return;
    const img = new Image();
    img.src = item.card.frontImage;
  }

  async function showCard(): Promise<void> {
    const item = session.current;
    if (!item) return finish();
    setPhase('entering');
    typed = undefined;
    grades.classList.remove('show');
    gradeButtons.forEach((b) => b.classList.remove('suggested'));
    form.hidden = true; // the answer box appears once the card is flipped
    hint.textContent = '';
    input.value = '';
    badge.hidden = item.card.type !== 'pronunciation';
    promptText.textContent =
      item.card.type === 'pronunciation' ? t('promptPron') : item.dir === 'fr-en' ? t('promptFrEn') : t('promptEnFr');
    promptText.classList.remove('result', 'correct', 'accent', 'wrong');
    updateBar();

    backImg.src = item.card.backImage;
    frontImg.src = item.card.frontImage;
    preload(session.queue[1]);
    await Promise.all([backImg.decode(), frontImg.decode()].map((p) => p.catch(() => undefined)));
    layout();

    rotZ = 0;
    rot.style.transform = 'rotate(0deg)';
    flip.style.transform = 'rotateY(0deg)';
    pos.style.transform = posAt(yHidden());
    pos.style.opacity = '1';

    if (reduceMotion) {
      await fade(0, 0);
      pos.style.transform = posAt(yFull());
      await fade(1, 200);
    } else {
      await animate(pos, posAt(yFull()), 600);
    }

    // Rest face down, fully in view, until the player taps.
    setPhase('faceDown');
    placeHint();
    input.disabled = true;
    hint.textContent = t('tapToFlip');
    pos.setAttribute('aria-label', t('tapToFlip'));
    updateBar();
  }

  async function flipUp(): Promise<void> {
    if (phaseValue !== 'faceDown') return;
    const item = current();
    setPhase('flipping');
    hint.textContent = '';
    if (settings.sounds) sounds.flip();
    // Show the answer box first so the half-card position accounts for it.
    if (isTypable(item)) form.hidden = false;
    layout();
    if (item.dir === 'en-fr') rotZ = 180;
    if (reduceMotion) {
      await fade(0, 100);
      flip.style.transform = 'rotateY(180deg)';
      rot.style.transform = `rotate(${rotZ}deg)`;
      pos.style.transform = posAt(yPrompt());
      await fade(1, 150);
    } else {
      // Flip over while sliding down so only the prompt half stays on screen.
      await Promise.all([
        animate(flip, 'rotateY(180deg)', 600),
        animate(rot, `rotate(${rotZ}deg)`, 600),
        animate(pos, posAt(yPrompt()), 600),
      ]);
    }

    setPhase('prompt');
    placeHint();
    updateBar();
    if (item.dir === 'fr-en') speak();
    if (isTypable(item)) {
      input.disabled = false;
      input.lang = item.dir === 'fr-en' ? 'en' : 'fr';
      input.focus({ preventScroll: true });
    } else {
      hint.textContent = t('tapToReveal');
      pos.setAttribute('aria-label', t('tapToReveal'));
    }
  }

  async function reveal(): Promise<void> {
    if (phaseValue !== 'prompt') return;
    const item = current();
    setPhase('revealing');
    hint.textContent = '';
    form.hidden = true;
    input.blur();
    updateBar();
    if (settings.sounds) sounds.flip();

    const now = new Date();
    const due = previewDue(state.progress[item.key], now);
    gradeButtons.forEach((b, i) => {
      b.querySelector('.grade-when')!.textContent = formatInterval(due[GRADES[i]].getTime() - now.getTime());
    });

    // Wait for the keyboard to close so the layout is final.
    await new Promise((r) => setTimeout(r, form.contains(document.activeElement) ? 250 : 0));
    layout();
    rotZ += 180;
    if (reduceMotion) {
      await fade(0, 120);
      pos.style.transform = posAt(yReveal());
      rot.style.transform = `rotate(${rotZ}deg)`;
      await fade(1, 160);
    } else {
      await Promise.all([animate(pos, posAt(yReveal()), 650), animate(rot, `rotate(${rotZ}deg)`, 650)]);
    }

    setPhase('answer');
    grades.classList.add('show');
    if (typed) {
      promptText.textContent = t(typed);
      promptText.classList.add('result', typed);
      const suggested = typed === 'correct' ? 3 : typed === 'accent' ? 2 : 1;
      gradeButtons[suggested - 1].classList.add('suggested');
    } else {
      promptText.textContent = t('howWell');
    }
    updateBar();
    if (item.dir === 'en-fr') speak();
  }

  function submitTyped(): void {
    if (phaseValue !== 'prompt') return;
    const item = current();
    typed = checkAnswer(input.value, answerSide(item.card, item.dir), item.dir === 'fr-en' ? 'en' : 'fr');
    void reveal();
  }

  function insertAccent(e: Event, ch: string): void {
    e.preventDefault(); // keep focus (and the keyboard) on the input
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    input.value = input.value.slice(0, start) + ch + input.value.slice(end);
    input.setSelectionRange(start + 1, start + 1);
    input.focus();
  }

  async function grade(g: GradeValue): Promise<void> {
    if (phaseValue !== 'answer') return;
    setPhase('leaving');
    stopSpeech();
    const item = current();
    session.answer(g, new Date());
    state.log.push({ k: item.key, g, t: Date.now() });
    void saveProgress();
    if (settings.sounds) (g === 1 ? sounds.forgot : sounds.good)();
    grades.classList.remove('show');
    if (reduceMotion) await fade(0, 150);
    else await Promise.all([animate(pos, posAt(-H - 40), 380), fade(0, 380)]);
    void showCard();
  }

  function undo(): void {
    if (['entering', 'flipping', 'revealing', 'leaving'].includes(phaseValue)) return;
    if (!session.undo()) return;
    state.log.pop();
    void saveProgress();
    stopSpeech();
    void showCard();
  }

  function onCardTap(): void {
    if (phaseValue === 'faceDown') return void flipUp();
    if (phaseValue !== 'prompt') return;
    if (isTypable(current())) return; // typing mode: use the Check button
    void reveal();
  }

  function finish(): void {
    setPhase('done');
    cleanup();
    const next = nextDue(state.progress, new Date());
    const wait = next ? next.getTime() - Date.now() : 0;
    const when = next
      ? t('nextDue', { when: wait < 60000 ? t('now') : t('in', { t: formatInterval(wait) }) })
      : t('nextNone');
    root.replaceChildren(
      h(
        'div',
        { class: 'summary screen' },
        h('img', { class: 'summary-art', src: 'icons/bunny-512.png', alt: '' }),
        h('h1', {}, t('doneTitle')),
        h('p', { class: 'big' }, t('reviewed', { n: session.reviewed })),
        h(
          'div',
          { class: 'grade-summary' },
          ...GRADES.map((g) =>
            h('span', { class: `chip g${g}` }, `${t(`g${g}` as 'g1')} · ${session.gradeCounts[g]}`),
          ),
        ),
        h('p', { class: 'muted' }, when),
        h('button', { class: 'primary', onclick: () => nav.home() }, t('backHome')),
      ),
    );
  }

  function exit(): void {
    cleanup();
    nav.home();
  }

  function onKey(e: KeyboardEvent): void {
    if (e.target === input) return;
    if ((e.key === ' ' || e.key === 'Enter') && phaseValue === 'faceDown') {
      e.preventDefault();
      void flipUp();
    } else if ((e.key === ' ' || e.key === 'Enter') && phaseValue === 'prompt') {
      e.preventDefault();
      if (isTypable(current())) input.focus();
      else void reveal();
    } else if (phaseValue === 'answer' && ['1', '2', '3', '4'].includes(e.key)) {
      void grade(Number(e.key) as GradeValue);
    } else if (e.key === 'Escape') exit();
  }

  function cleanup(): void {
    stopSpeech();
    window.removeEventListener('resize', onResize);
    window.visualViewport?.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onKey);
  }

  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKey);
  requestAnimationFrame(() => void showCard());
  return root;
}

export const directionLabel = (dir: Dir) => t(`dir_${dir}` as 'dir_fr-en');
