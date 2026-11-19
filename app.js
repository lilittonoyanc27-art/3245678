import { EXAM1_DATA } from './data_exam1.js';
import { RESUMEN_DATA } from './data_resumen.js';
import { COMPLETO_DATA } from './data_completo.js';

const STORAGE_KEY = 'lengua_1eso_state_v1';

const state = {
  activeModule: 'exam1',
  showAllHy: false,
  oralIdx: 0,
  oralHelpOpen: false,
  oralAnsOpen: false,
  rapidIdx: 0,
  rapidAnsOpen: false,
  inputs: {},
  checks: {},
  quizzes: {
    cultaPopular: {},
    impSec: {},
    genLit: {},
    funcLang: {},
    catGram: {},
  },
  openAnswers: {},
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.activeModule) state.activeModule = parsed.activeModule;
    if (parsed.inputs) state.inputs = parsed.inputs;
    if (parsed.checks) state.checks = parsed.checks;
    if (parsed.quizzes) state.quizzes = { ...state.quizzes, ...parsed.quizzes };
  } catch {
    // ignore storage errors
  }
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeModule: state.activeModule,
        inputs: state.inputs,
        checks: state.checks,
        quizzes: state.quizzes,
      })
    );
  } catch {
    // ignore storage errors
  }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-shown');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove('is-shown'), 2200);
}

function countWords(text) {
  const clean = (text || '').trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

/**
 * Clickable Spanish block: clicking toggles Armenian translation underneath.
 */
function esBlock(esHtml, hyText, options = {}) {
  const { tag = 'div', esClass = 'text-stone-900', allowHtml = false, compact = false } = options;
  const content = allowHtml ? esHtml : esc(esHtml).replace(/\n/g, '<br>');
  if (!hyText) {
    return `<${tag} class="${esClass}">${content}</${tag}>`;
  }
  return `
    <div class="es-block ${compact ? 'py-1.5' : ''}" role="button" tabindex="0" data-toggle-hy aria-expanded="false">
      <${tag} class="${esClass}">
        <span>${content}</span>
        <span class="es-hint-mark" aria-hidden="true">HY</span>
      </${tag}>
      <div class="hy-reveal">
        <span class="font-mono-num text-sm font-bold text-orange-900 mr-2">HY</span>
        <span>${esc(hyText)}</span>
      </div>
    </div>
  `;
}

/**
 * Clickable inline Spanish cell (for tables).
 */
function esCell(esText, hyText, allowHtml = false) {
  const content = allowHtml ? esText : esc(esText).replace(/\n/g, '<br>');
  if (!hyText) return `<span>${content}</span>`;
  return `
    <div class="es-click-wrap">
      <span class="es-click-inline text-stone-900" role="button" tabindex="0" data-toggle-hy-inline aria-expanded="false">${content}</span>
      <div class="hy-inline-reveal">${esc(hyText)}</div>
    </div>
  `;
}

/**
 * Per-question "Show Answer" button + collapsible answer box.
 */
function answerControl(id, answerEs, answerHy = '', extraHy = '') {
  const isOpen = !!state.openAnswers[id];
  return `
    <div class="mt-3.5">
      <button
        type="button"
        data-toggle-answer="${esc(id)}"
        aria-expanded="${isOpen ? 'true' : 'false'}"
        class="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          isOpen
            ? 'bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800'
            : 'bg-[#fbf3e8] text-orange-900 border-[#bd6b3a] hover:bg-[#f3e1ca] hover:border-orange-900'
        }"
      >
        <span>${isOpen ? 'Թաքցնել պատասխանը · Ocultar respuesta' : 'Ցույց տալ պատասխանը · Ver respuesta'}</span>
      </button>
      <div id="ans-${esc(id)}" class="answer-panel ${isOpen ? 'is-visible' : ''}">
        <div class="text-sm font-mono-num font-bold text-emerald-800 mb-2">RESPUESTA MODELO · ՕՐԻՆԱԿԵԼԻ ՊԱՏԱՍԽԱՆ</div>
        ${
          answerEs
            ? `<div class="text-base text-emerald-950 font-medium leading-relaxed"><span class="font-mono-num text-sm font-bold text-emerald-700 mr-2">ES</span>${esc(answerEs)}</div>`
            : ''
        }
        ${
          answerHy
            ? `<div class="text-base text-stone-800 mt-2.5 pt-2.5 border-t border-emerald-300/70 leading-relaxed"><span class="font-mono-num text-sm font-bold text-emerald-700 mr-2">HY</span>${esc(answerHy)}</div>`
            : ''
        }
        ${extraHy ? `<div class="text-sm text-stone-700 mt-2">${esc(extraHy)}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Standard open question card with Spanish click-to-translate, textarea/input, and individual Show Answer.
 */
function openQuestionCard(q, opts = {}) {
  const { shortInput = false, showHyBelow = false, labelPrefix = '' } = opts;
  const val = state.inputs[q.id] || '';
  const headingEs = `${labelPrefix}${q.label ? q.label + ' ' : q.num ? q.num + '. ' : ''}${q.es || ''}`;
  const pointsMeta = q.points ? `<span class="font-mono-num text-sm font-semibold text-orange-900 ml-2">(${esc(q.points)})</span>` : '';

  return `
    <div class="py-5 border-b border-[#e7d1b6] last:border-b-0">
      <div class="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
        <div class="flex-1 min-w-[240px]">
          ${
            q.esHtml
              ? esBlock(`${q.num ? q.num + '. ' : ''}${q.esHtml}`, q.hy, {
                  esClass: 'text-lg font-medium text-stone-900',
                  allowHtml: true,
                })
              : esBlock(headingEs, q.hy, {
                  esClass: 'text-lg font-medium text-stone-900',
                })
          }
          ${showHyBelow && q.hy ? `<p class="text-base text-stone-700 mt-1.5">${esc(q.hy)}</p>` : ''}
        </div>
        ${pointsMeta}
      </div>
      ${
        shortInput
          ? `<input type="text" data-input-id="${esc(q.id)}" value="${esc(val)}" placeholder="Գրի՛ր պատասխանդ իսպաներենով / Escribe tu respuesta..." class="w-full mt-2 px-4 py-3 text-base bg-white border border-[#c99e72] rounded-lg text-stone-900 placeholder:text-stone-400" />`
          : `<textarea rows="3" data-input-id="${esc(q.id)}" placeholder="Գրի՛ր պատասխանդ իսպաներենով / Escribe tu respuesta..." class="w-full mt-2 px-4 py-3 text-base bg-white border border-[#c99e72] rounded-lg text-stone-900 placeholder:text-stone-400 resize-y leading-relaxed">${esc(val)}</textarea>`
      }
      ${answerControl(
        q.id,
        q.answerEs || q.answer || '',
        q.answerHy || q.explainHy || q.justHy || '',
        q.justEs ? `Justificación (ES): ${q.justEs}` : q.explainEs ? `Explicación (ES): ${q.explainEs}` : ''
      )}
    </div>
  `;
}

/**
 * Theory Q&A item (Spanish clickable for HY + individual Show Answer).
 */
function theoryQaItem(qa) {
  return `
    <div class="py-4 border-b border-[#e7d1b6] last:border-b-0">
      ${esBlock(`${qa.num}. ${qa.qEs}`, qa.qHy, { esClass: 'text-base font-semibold text-stone-900' })}
      ${answerControl(qa.id, qa.aEs, qa.aHy)}
    </div>
  `;
}

/**
 * Interactive Multiple-Choice Quiz Renderer
 */
function renderChoiceQuiz(quizKey, titleEs, titleHy, items, options, scoreSuffix = '') {
  const answers = state.quizzes[quizKey] || {};
  let correctCount = 0;
  items.forEach((it) => {
    if (answers[it.id] === it.correct) correctCount++;
  });

  return `
    <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-7 mt-6">
      <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e7d1b6]">
        <div>
          ${esBlock(titleEs, titleHy, { tag: 'h4', esClass: 'text-xl font-semibold text-stone-900' })}
        </div>
        <div class="flex items-center gap-4 shrink-0">
          <span class="font-mono-num text-base font-bold text-orange-900">${correctCount} / ${items.length}${scoreSuffix ? ' ' + scoreSuffix : ''}</span>
          <button type="button" data-reset-quiz="${esc(quizKey)}" class="min-h-[44px] px-4 py-2 text-sm font-semibold text-orange-950 bg-[#ead5bb] hover:bg-[#dfc3a0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer">
            Repetir · Կրկնել
          </button>
        </div>
      </div>

      <div class="divide-y divide-[#e7d1b6] mt-2">
        ${items
          .map((item) => {
            const chosen = answers[item.id];
            const isCorrect = chosen === item.correct;
            return `
              <div class="py-5">
                ${esBlock(`${item.num}. ${item.es}`, item.hy, { esClass: 'text-base font-medium text-stone-900' })}
                <div class="flex flex-wrap items-center gap-2.5 mt-3">
                  ${options
                    .map((opt) => {
                      let cls = 'quiz-opt';
                      if (chosen === opt) {
                        cls += opt === item.correct ? ' is-correct' : ' is-wrong';
                      }
                      return `<button type="button" class="${cls}" data-quiz-key="${esc(quizKey)}" data-quiz-item="${esc(item.id)}" data-quiz-val="${esc(opt)}">${esc(opt)}</button>`;
                    })
                    .join('')}
                  ${
                    chosen
                      ? `<span class="text-sm font-bold ml-2 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}">${
                          isCorrect ? '✓ Ճիշտ է · Correcto' : '✕ Փորձի՛ր կրկին · Incorrecto'
                        }</span>`
                      : ''
                  }
                </div>
                ${answerControl(`q-${quizKey}-${item.id}`, item.correct, item.explainHy || '', item.explainEs ? `ES: ${item.explainEs}` : '')}
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

/**
 * Full Armenian translation collapsible / viewable block
 */
function renderFullHyTranslation(title, noteHy, paragraphs) {
  return `
    <details class="mt-8 bg-[#fffdf9] border border-[#d6b692] rounded-xl group">
      <summary class="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none select-none hover:bg-[#f7ece0] rounded-xl transition-colors">
        <div>
          <div class="text-base font-semibold text-stone-900">${esc(title)}</div>
          ${noteHy ? `<p class="text-sm text-stone-600 mt-1">${esc(noteHy)}</p>` : ''}
        </div>
        <span class="text-sm font-bold text-orange-900 whitespace-nowrap shrink-0">Բացել / Փակել</span>
      </summary>
      <div class="px-6 pb-6 pt-3 border-t border-[#e7d1b6] space-y-4 text-base text-stone-800 leading-relaxed">
        ${paragraphs.map((p) => `<p>${esc(p.hy)}</p>`).join('')}
      </div>
    </details>
  `;
}

/* ============================================================================
   MODULE 1: EXAMEN DE PRÁCTICA (PARTE 1 - 5)
============================================================================ */
function renderModule1() {
  const d = EXAM1_DATA;
  const p1 = d.parte1;
  const p2 = d.parte2;
  const p3 = d.parte3;
  const p5 = d.parte5;

  const chkCount = p5.checklist.filter((c) => state.checks[c.id]).length;
  const oralItem = p5.oralQuestions[state.oralIdx];

  return `
    <!-- Header Intro -->
    <section id="m1-intro" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-8">
      <div class="text-sm font-mono-num font-semibold text-orange-900 mb-2">1.º ESO · 7-րդ դասարան · B1–B2</div>
      ${esBlock(d.titleEs, d.titleHy, { tag: 'h1', esClass: 'font-display text-3xl sm:text-4xl font-semibold text-stone-900 leading-tight' })}
      <p class="text-base text-stone-700 mt-4 leading-relaxed">${esc(d.introHy)}</p>
      <p class="text-base font-semibold text-stone-900 mt-4">${esc(d.overviewTitleHy)}</p>
      <ul class="mt-3 space-y-2.5 text-base text-stone-800">
        ${d.overviewItems
          .map(
            (item) => `
            <li class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1.5 border-b border-[#e7d1b6]/80 last:border-b-0">
              <span class="font-bold text-orange-900 shrink-0">${esc(item.es)}</span>
              <span class="hidden sm:inline text-orange-700">—</span>
              <span>${esc(item.hy)}</span>
            </li>
          `
          )
          .join('')}
      </ul>
    </section>

    <!-- PARTE 1 -->
    <section id="m1-parte1" class="mb-10">
      <div class="mb-4">
        ${esBlock(p1.headingEs, p1.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
      </div>

      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        <div class="border-b border-[#e7d1b6] pb-5 mb-6">
          <div class="text-base font-bold text-stone-900">${esc(p1.examTitleEs)}</div>
          <div class="text-sm text-orange-900 mt-1">${esc(p1.examSubtitleEs)}</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <label class="block">
              <span class="text-sm font-medium text-stone-700">Nombre · Անուն</span>
              <input type="text" data-input-id="m1-nombre" value="${esc(state.inputs['m1-nombre'] || '')}" class="w-full mt-1 px-3.5 py-2.5 text-base border border-[#c99e72] rounded-lg bg-white" placeholder="Nombre y apellidos..." />
            </label>
            <label class="block">
              <span class="text-sm font-medium text-stone-700">Fecha · Ամսաթիվ</span>
              <input type="text" data-input-id="m1-fecha" value="${esc(state.inputs['m1-fecha'] || '')}" class="w-full mt-1 px-3.5 py-2.5 text-base border border-[#c99e72] rounded-lg bg-white" placeholder="Fecha..." />
            </label>
          </div>
        </div>

        <!-- Story -->
        <div class="mb-6">
          ${esBlock(p1.readingInstructionEs, p1.readingInstructionHy, { tag: 'h3', esClass: 'text-lg font-bold text-orange-900 mb-4' })}
          <div class="bg-[#faf2e7] border border-[#dfc3a3] rounded-xl p-5 sm:p-7">
            <div class="mb-4 pb-3 border-b border-[#dfc3a3]">
              ${esBlock(p1.storyTitleEs, p1.storyTitleHy, { tag: 'h4', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
              <p class="text-sm text-orange-900 mt-1">Սեղմի՛ր ցանկացած իսպաներեն պարբերության վրա՝ հայերեն թարգմանությունը տեսնելու համար։</p>
            </div>
            <div class="space-y-4 text-[18px] leading-8">
              ${p1.paragraphs.map((p) => esBlock(p.es, p.hy, { tag: 'p', allowHtml: true, esClass: 'text-stone-900 leading-8' })).join('')}
            </div>
            <div class="mt-4 pt-3 border-t border-[#dfc3a3]">
              ${esBlock(p1.storyNoteEs, p1.storyNoteHy, { esClass: 'text-sm italic text-stone-600', compact: true })}
            </div>
          </div>
        </div>

        <!-- Questions A-F -->
        <div class="mt-8">
          <h3 class="text-xl font-bold text-stone-900 pb-3 border-b border-[#e7d1b6]">Preguntas del examen — Քննական հարցեր</h3>
          ${p1.questions.map((q) => openQuestionCard(q)).join('')}
        </div>

        <!-- 2. Six Figuras -->
        <div class="mt-10 pt-8 border-t border-[#e7d1b6]">
          ${esBlock(p1.figurasTitleEs, p1.figurasTitleHy, { tag: 'h3', esClass: 'text-xl font-bold text-stone-900 mb-2' })}
          <div class="divide-y divide-[#e7d1b6]">
            ${p1.figurasItems.map((f) => openQuestionCard(f, { shortInput: true })).join('')}
          </div>
        </div>
      </div>

      <!-- Full Armenian translation section -->
      ${renderFullHyTranslation(`Հայերեն թարգմանություն — ${p1.storyTitleEs} (${p1.storyTitleHy})`, p1.translationNoteHy, p1.paragraphs)}
    </section>

    <!-- PARTE 2: TEORÍA -->
    <section id="m1-parte2" class="mb-10 space-y-6">
      <div>
        ${esBlock(p2.headingEs, p2.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
      </div>

      <!-- A. Resumen -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-5">
        ${esBlock(p2.secA.titleEs, p2.secA.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        ${esBlock(p2.secA.defEs, p2.secA.defHy, { esClass: 'text-base text-stone-800' })}

        <div>
          <h4 class="text-base font-bold text-stone-900 mb-3">${esc(p2.secA.stepsTitleEs)} — ${esc(p2.secA.stepsTitleHy)}</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${p2.secA.steps
              .map(
                (st) => `
              <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
                <div class="font-mono-num text-sm font-bold text-orange-900 mb-1">0${st.num}</div>
                ${esBlock(st.titleEs, st.titleHy, { esClass: 'text-base font-semibold text-stone-900', compact: true })}
                <div class="mt-1">${esBlock(st.descEs, st.descHy, { esClass: 'text-base text-stone-700', compact: true })}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="p-5 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg">
          <div class="text-sm font-bold text-orange-900 mb-2">${esc(p2.secA.exampleTitleEs)} — ${esc(p2.secA.exampleTitleHy)}</div>
          ${esBlock(p2.secA.exampleEs, p2.secA.exampleHy, { esClass: 'text-base text-stone-900 leading-relaxed' })}
        </div>

        <div>
          <h4 class="text-base font-bold text-stone-900 mb-3">${esc(p2.secA.errorsTitleEs)} — ${esc(p2.secA.errorsTitleHy)}</h4>
          <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
            <table class="w-full text-left text-base border-collapse">
              <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
                <tr>
                  <th class="px-4 py-3 font-bold">Incorrecto — Սխալ</th>
                  <th class="px-4 py-3 font-bold">Correcto — Ճիշտ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e7d1b6] bg-white">
                ${p2.secA.errorsRows
                  .map(
                    (r) => `
                  <tr>
                    <td class="px-4 py-3.5 align-top">${esCell(r.wrongEs, r.wrongHy)}</td>
                    <td class="px-4 py-3.5 align-top">${esCell(r.rightEs, r.rightHy)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="p-5 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
          <div class="text-sm font-bold text-orange-900 mb-1">${esc(p2.secA.formulaTitleEs)} — ${esc(p2.secA.formulaTitleHy)}</div>
          ${esBlock(p2.secA.formulaEs, p2.secA.formulaHy, { esClass: 'text-lg font-bold text-stone-900' })}
          <p class="text-sm text-stone-700 mt-2">${esc(p2.secA.formulaNoteHy)}</p>
        </div>
      </div>

      <!-- B. Culta y popular -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-5">
        ${esBlock(p2.secB.titleEs, p2.secB.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        <p class="text-base text-stone-700">${esc(p2.secB.introHy)}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${[p2.secB.culta, p2.secB.popular]
            .map(
              (box) => `
            <div class="p-5 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg space-y-2">
              ${esBlock(box.titleEs, box.titleHy, { tag: 'h4', esClass: 'text-lg font-bold text-stone-900', compact: true })}
              ${esBlock(box.defEs, box.defHy, { esClass: 'text-base text-stone-800', compact: true })}
              ${esBlock(box.exampleEs, box.exampleHy, { esClass: 'text-sm italic text-orange-900', compact: true })}
            </div>
          `
            )
            .join('')}
        </div>
        <div class="space-y-3">
          <h4 class="text-base font-bold text-stone-900">${esc(p2.secB.justifyTitleEs)} — ${esc(p2.secB.justifyTitleHy)}</h4>
          <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
            <div class="text-sm font-bold text-orange-900 mb-1">${esc(p2.secB.modelCultaTitleEs)}</div>
            ${esBlock(p2.secB.modelCultaEs, p2.secB.modelCultaHy, { esClass: 'text-base text-stone-900' })}
          </div>
          <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
            <div class="text-sm font-bold text-orange-900 mb-1">${esc(p2.secB.modelPopularTitleEs)}</div>
            ${esBlock(p2.secB.modelPopularEs, p2.secB.modelPopularHy, { esClass: 'text-base text-stone-900' })}
          </div>
        </div>
        <p class="text-base text-orange-950 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg p-4">${esc(p2.secB.noteHy)}</p>
      </div>

      <!-- C. Explicar expresiones -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-5">
        ${esBlock(p2.secC.titleEs, p2.secC.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        ${esBlock(p2.secC.defEs, p2.secC.defHy, { esClass: 'text-base text-stone-800' })}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${p2.secC.examples
            .map(
              (ex) => `
            <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg space-y-2">
              <div class="text-sm font-mono-num font-bold text-orange-900">${esc(ex.label)}</div>
              ${esBlock(ex.exprEs, ex.exprHy, { esClass: 'text-base font-bold text-stone-900', compact: true })}
              ${esBlock(ex.explainEs, ex.explainHy, { esClass: 'text-base text-stone-800', compact: true })}
            </div>
          `
            )
            .join('')}
        </div>
        <div>
          <h4 class="text-base font-bold text-stone-900 mb-2">${esc(p2.secC.diffTitleEs)}</h4>
          <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
            <table class="w-full text-left text-base border-collapse">
              <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
                <tr>
                  <th class="px-4 py-3 font-bold">Pregunta C</th>
                  <th class="px-4 py-3 font-bold">Pregunta D</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e7d1b6] bg-white">
                ${p2.secC.diffRows
                  .map(
                    (r) => `
                  <tr>
                    <td class="px-4 py-3.5">${esCell(r.cEs, r.cHy)}</td>
                    <td class="px-4 py-3.5">${esCell(r.dEs, r.dHy)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
          <p class="text-sm text-stone-700 mt-3">${esc(p2.secC.noteHy)}</p>
        </div>
      </div>

      <!-- D. Figuras literarias -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-5">
        ${esBlock(p2.secD.titleEs, p2.secD.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        <p class="text-base text-stone-700">${esc(p2.secD.introHy)}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${p2.secD.list
            .map(
              (f) => `
            <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg space-y-2">
              ${esBlock(`${f.num}. ${f.nameEs}`, f.nameHy, { tag: 'h4', esClass: 'text-lg font-bold text-stone-900', compact: true })}
              ${esBlock(f.defEs, f.defHy, { esClass: 'text-base text-stone-800', compact: true })}
              ${esBlock(`Ejemplo: ${f.exEs}`, f.exHy, { esClass: 'text-base italic text-orange-900 font-medium', compact: true })}
              ${f.extraHy ? `<p class="text-sm text-stone-700">${esc(f.extraHy)}</p>` : ''}
            </div>
          `
            )
            .join('')}
        </div>

        <div>
          <h4 class="text-base font-bold text-stone-900 mb-3">${esc(p2.secD.quickTableTitleEs)} — ${esc(p2.secD.quickTableTitleHy)}</h4>
          <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
            <table class="w-full text-left text-base border-collapse">
              <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
                <tr>
                  <th class="px-4 py-3 font-bold">Pista — Հուշում</th>
                  <th class="px-4 py-3 font-bold">Figura</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#e7d1b6] bg-white">
                ${p2.secD.quickRows
                  .map(
                    (r) => `
                  <tr>
                    <td class="px-4 py-3.5">${esCell(r.clueEs, r.clueHy)}</td>
                    <td class="px-4 py-3.5 font-bold text-orange-900">${esc(r.fig)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="p-4 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg">
          ${esBlock(p2.secD.detailNoteEs, p2.secD.detailNoteHy, { esClass: 'text-base text-stone-900', compact: true })}
        </div>
      </div>

      <!-- E. Géneros literarios -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-5">
        ${esBlock(p2.secE.titleEs, p2.secE.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        <p class="text-base text-stone-700">${esc(p2.secE.introHy)}</p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${p2.secE.genres
            .map(
              (g) => `
            <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg space-y-2">
              ${esBlock(g.nameEs, g.nameHy, { tag: 'h4', esClass: 'text-lg font-bold text-stone-900', compact: true })}
              ${esBlock(g.defEs, g.defHy, { esClass: 'text-base text-stone-800', compact: true })}
              ${esBlock(g.exEs, g.exHy, { esClass: 'text-sm italic text-orange-900', compact: true })}
            </div>
          `
            )
            .join('')}
        </div>
        <div class="p-5 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg">
          <div class="text-sm font-bold text-orange-900 mb-1">${esc(p2.secE.modelTitleEs)} — ${esc(p2.secE.modelTitleHy)}</div>
          ${esBlock(p2.secE.modelEs, p2.secE.modelHy, { esClass: 'text-base text-stone-900' })}
        </div>
        <div class="p-5 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
          <div class="text-base font-bold text-stone-900 mb-1">${esc(p2.secE.ruleTitleEs)} — ${esc(p2.secE.ruleTitleHy)}</div>
          <p class="text-sm text-stone-700 mb-2">${esc(p2.secE.ruleIntroHy)}</p>
          <div class="space-y-1.5">
            ${p2.secE.rules.map((r) => esBlock(r.es, r.hy, { esClass: 'text-base text-stone-900 font-semibold', compact: true })).join('')}
          </div>
        </div>
      </div>

      <!-- F. Lenguaje literario -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-5">
        ${esBlock(p2.secF.titleEs, p2.secF.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        ${esBlock(p2.secF.defEs, p2.secF.defHy, { esClass: 'text-base text-stone-800' })}
        <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
          <table class="w-full text-left text-base border-collapse">
            <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
              <tr>
                <th class="px-4 py-3 font-bold">Lenguaje habitual — Սովորական լեզու</th>
                <th class="px-4 py-3 font-bold">Lenguaje literario — Գեղարվեստական լեզու</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e7d1b6] bg-white">
              ${p2.secF.compRows
                .map(
                  (r) => `
                <tr>
                  <td class="px-4 py-3.5">${esCell(r.habEs, r.habHy)}</td>
                  <td class="px-4 py-3.5 font-semibold">${esCell(r.litEs, r.litHy)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <div class="p-5 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg">
          <div class="text-sm font-bold text-orange-900 mb-1">${esc(p2.secF.modelTitleEs)} — ${esc(p2.secF.modelTitleHy)}</div>
          ${esBlock(p2.secF.modelEs, p2.secF.modelHy, { esClass: 'text-base text-stone-900' })}
        </div>
        <p class="text-base text-orange-950 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg p-4">${esc(p2.secF.tipHy)}</p>
      </div>
    </section>

    <!-- PARTE 3: TEXTOS CORTOS -->
    <section id="m1-parte3" class="mb-10 space-y-6">
      <div>
        ${esBlock(p3.headingEs, p3.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
        <p class="text-base text-stone-700 mt-2">${esc(p3.introHy)}</p>
      </div>

      ${p3.shortTexts
        .map(
          (st) => `
        <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
          ${esBlock(st.titleEs, st.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900 mb-4' })}
          <div class="bg-[#faf2e7] border border-[#dfc3a3] rounded-xl p-5 sm:p-7 ${st.isPoem ? 'space-y-1.5 italic' : 'space-y-3'}">
            ${st.paragraphs.map((p) => esBlock(p.es, p.hy, { tag: 'p', allowHtml: true, esClass: 'text-[18px] text-stone-900 leading-8', compact: st.isPoem })).join('')}
          </div>
          ${renderFullHyTranslation(`Հայերեն թարգմանություն — ${st.titleEs}`, '', st.paragraphs)}
          <div class="mt-6">
            <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Preguntas — Հարցեր</h4>
            ${st.questions.map((q) => openQuestionCard(q)).join('')}
          </div>
          <p class="mt-4 text-sm text-stone-800 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg p-4">${esc(st.reminderHy)}</p>
        </div>
      `
        )
        .join('')}

      ${renderChoiceQuiz('cultaPopular', p3.cultaPopularQuiz.titleEs, p3.cultaPopularQuiz.titleHy, p3.cultaPopularQuiz.items, ['Culta', 'Popular'])}
    </section>

    <!-- PARTE 4: RESPUESTAS MODELO -->
    <section id="m1-parte4" class="mb-10">
      <div class="mb-4">
        ${esBlock(d.parte4.headingEs, d.parte4.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
        <p class="text-base text-orange-950 bg-[#f5e7d5] border border-[#c79a6b] rounded-lg px-4 py-3.5 mt-3">${esc(d.parte4.warningHy)}</p>
      </div>

      <details class="bg-[#fffdf9] border border-[#d6b692] rounded-xl">
        <summary class="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none hover:bg-[#f7ece0] rounded-xl">
          <span class="text-base font-bold text-stone-900">Բացել բոլոր պատրաստի պատասխանները (Մաս 4) · Ver todas las respuestas modelo</span>
          <span class="text-sm font-bold text-orange-900 whitespace-nowrap shrink-0">Բացել / Փակել</span>
        </summary>
        <div class="px-6 pb-8 pt-4 border-t border-[#e7d1b6] space-y-8">
          <div>
            <h3 class="text-lg font-bold text-stone-900 mb-3">Respuestas del examen principal — Հիմնական քննության պատասխանները</h3>
            <div class="space-y-4">
              ${p1.questions
                .map(
                  (q) => `
                <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
                  <div class="text-sm font-bold text-orange-900 mb-1">${esc(q.label)} ${esc(q.es)}</div>
                  ${esBlock(q.answerEs, q.answerHy, { esClass: 'text-base text-stone-900', compact: true })}
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-stone-900 mb-3">Soluciones de las seis figuras literarias</h3>
            <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
              <table class="w-full text-left text-base border-collapse">
                <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
                  <tr>
                    <th class="px-4 py-3 font-bold">Nº</th>
                    <th class="px-4 py-3 font-bold">Respuesta</th>
                    <th class="px-4 py-3 font-bold">Explicación — Բացատրություն</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#e7d1b6] bg-white">
                  ${p1.figurasItems
                    .map(
                      (f) => `
                    <tr>
                      <td class="px-4 py-3 font-mono-num font-semibold">${f.num}</td>
                      <td class="px-4 py-3 font-bold text-orange-900">${esc(f.answer)}</td>
                      <td class="px-4 py-3">${esCell(f.explainEs, f.explainHy)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          ${p3.shortTexts
            .map(
              (st) => `
            <div>
              <h3 class="text-lg font-bold text-stone-900 mb-3">Respuestas — ${esc(st.titleEs)}</h3>
              <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
                <table class="w-full text-left text-base border-collapse">
                  <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
                    <tr>
                      <th class="px-4 py-3 font-bold w-20">Pregunta</th>
                      <th class="px-4 py-3 font-bold">Respuesta en español (սեղմի՛ր՝ HY)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#e7d1b6] bg-white">
                    ${st.questions
                      .map(
                        (q) => `
                      <tr>
                        <td class="px-4 py-3 font-mono-num font-bold text-orange-900">${esc(q.label.replace(')', ''))}</td>
                        <td class="px-4 py-3">${esCell(q.answerEs, q.answerHy)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
              <p class="text-sm text-stone-700 mt-2">${esc(st.reminderHy)}</p>
            </div>
          `
            )
            .join('')}
        </div>
      </details>
    </section>

    <!-- PARTE 5: PRÁCTICA ORAL -->
    <section id="m1-parte5" class="mb-10 space-y-6">
      <div>
        ${esBlock(p5.headingEs, p5.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
        <p class="text-base text-stone-700 mt-2">${esc(p5.introHy)}</p>
      </div>

      <!-- Oral Flashcard Widget -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        <div class="flex items-center justify-between gap-4 pb-4 border-b border-[#e7d1b6]">
          <div class="text-sm font-mono-num font-bold text-orange-900">PREGUNTAS PARA RESPONDER EN VOZ ALTA</div>
          <div class="font-mono-num text-base font-bold text-orange-900">${state.oralIdx + 1} / ${p5.oralQuestions.length}</div>
        </div>

        <div class="py-6">
          ${esBlock(oralItem.es, oralItem.hy, { tag: 'h3', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-stone-900' })}
          ${
            state.oralHelpOpen
              ? `<div class="mt-4 p-4 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg text-base">
                  <div class="font-semibold text-orange-950">${esc(oralItem.helpEs)}</div>
                  <div class="text-stone-800 mt-1.5">${esc(oralItem.helpHy)}</div>
                 </div>`
              : ''
          }
          ${
            state.oralAnsOpen
              ? `<div class="mt-4 p-4 bg-emerald-50 border border-emerald-400 rounded-lg text-base">
                  <div class="font-semibold text-emerald-950">${esc(oralItem.answerEs)}</div>
                  <div class="text-stone-800 mt-2 pt-2 border-t border-emerald-300/70">${esc(oralItem.answerHy)}</div>
                 </div>`
              : ''
          }
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#e7d1b6]">
          <div class="flex flex-wrap items-center gap-2.5">
            <button type="button" data-oral-action="help" class="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg border border-[#c79a6b] bg-[#faf2e7] text-orange-950 hover:bg-[#f0dec8] whitespace-nowrap shrink-0 cursor-pointer">
              ${state.oralHelpOpen ? 'Թաքցնել օգնությունը · Ocultar ayuda' : 'Mostrar ayuda · Օգնություն'}
            </button>
            <button type="button" data-oral-action="answer" class="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg border border-orange-800 bg-[#f2dcc2] text-orange-950 hover:bg-[#e7c9a6] whitespace-nowrap shrink-0 cursor-pointer">
              ${state.oralAnsOpen ? 'Թաքցնել պատասխանը' : 'Ցույց տալ պատասխանը'}
            </button>
          </div>
          <div class="flex items-center gap-2.5">
            <button type="button" data-oral-action="prev" class="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg border border-[#c99e72] bg-white text-stone-800 hover:bg-[#f7ece0] whitespace-nowrap shrink-0 cursor-pointer">
              Anterior
            </button>
            <button type="button" data-oral-action="next" class="min-h-[44px] px-5 py-2 text-sm font-semibold rounded-lg bg-orange-800 text-white hover:bg-orange-900 whitespace-nowrap shrink-0 cursor-pointer">
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <!-- Class schedule -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        ${esBlock(p5.scheduleTitleEs, p5.scheduleTitleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900 mb-4' })}
        <div class="divide-y divide-[#e7d1b6]">
          ${p5.schedule
            .map(
              (s) => `
            <div class="py-4 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-5">
              <div class="font-mono-num text-sm font-bold text-orange-900 w-20 shrink-0">${esc(s.time)}</div>
              <div class="flex-1">
                <div class="text-base font-bold text-stone-900">${esc(s.titleEs)} — ${esc(s.titleHy)}</div>
                <p class="text-base text-stone-700 mt-1">${esc(s.descHy)}</p>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Checklist -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e7d1b6]">
          <div>
            ${esBlock(p5.checklistTitleEs, p5.checklistTitleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <span class="font-mono-num text-base font-bold text-orange-900">${chkCount} / ${p5.checklist.length}</span>
            <button type="button" data-reset-checks="m1" class="min-h-[44px] px-4 py-2 text-sm font-semibold text-orange-950 bg-[#ead5bb] hover:bg-[#dfc3a0] rounded-lg whitespace-nowrap shrink-0 cursor-pointer">
              Reiniciar · Մաքրել
            </button>
          </div>
        </div>
        <div class="divide-y divide-[#efe0cb] mt-2">
          ${p5.checklist
            .map(
              (c) => `
            <label class="flex items-start gap-3.5 py-4 cursor-pointer hover:bg-[#f7ece0] rounded-lg px-2.5 -mx-2.5">
              <input type="checkbox" data-check-id="${esc(c.id)}" ${state.checks[c.id] ? 'checked' : ''} class="mt-1.5 w-5 h-5 rounded border-[#c99e72] accent-orange-800" />
              <div class="flex-1">
                <div class="text-base font-semibold ${state.checks[c.id] ? 'line-through text-stone-400' : 'text-stone-900'}">${esc(c.es)}</div>
                <div class="text-sm text-stone-600 mt-0.5">${esc(c.hy)}</div>
              </div>
            </label>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Qué debe recordar el alumno -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-4">
        ${esBlock(p5.rememberTitleEs, p5.rememberTitleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        <p class="text-base text-stone-800">${esc(p5.rememberIntroHy)}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          ${p5.starters
            .map(
              (st) => `
            <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
              ${esBlock(st.es, st.hy, { esClass: 'text-base font-bold text-stone-900', compact: true })}
            </div>
          `
            )
            .join('')}
        </div>
        <div class="pt-4 border-t border-[#e7d1b6] space-y-2.5 text-base text-stone-800">
          ${p5.teacherAdviceHy.map((t) => `<p>${esc(t)}</p>`).join('')}
        </div>
      </div>
    </section>
  `;
}

/* ============================================================================
   MODULE 2: CÓMO HACER UN RESUMEN
============================================================================ */
function renderModule2() {
  const d = RESUMEN_DATA;
  const autoChecked = d.sec4.ex5Checks.filter((c) => state.checks[c.id]).length;
  const myResumenText = state.inputs['res-ex4-summary'] || '';
  const myResumenWords = countWords(myResumenText);
  const wordTargetColor =
    myResumenWords === 0
      ? 'text-stone-600'
      : myResumenWords >= 45 && myResumenWords <= 65
      ? 'text-emerald-700 font-bold'
      : 'text-orange-900 font-bold';

  const martinSummary = state.inputs['mar-summary'] || '';
  const luciaSummary = state.inputs['luc-summary'] || '';

  return `
    <!-- Header -->
    <section id="m2-intro" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-8">
      <div class="text-sm font-mono-num font-semibold text-orange-900 mb-2">${esc(d.subtitleEs)}</div>
      ${esBlock(d.titleEs, d.titleHy, { tag: 'h1', esClass: 'font-display text-3xl sm:text-4xl font-semibold text-stone-900 leading-tight' })}
      <div class="mt-4 space-y-2.5 text-base text-stone-800 leading-relaxed">
        ${d.introHy.map((p) => `<p>${esc(p)}</p>`).join('')}
      </div>
    </section>

    <!-- 1. TEORÍA -->
    <section id="m2-sec1" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-8 space-y-6">
      ${esBlock(d.sec1.headingEs, d.sec1.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-stone-900' })}
      ${esBlock(d.sec1.defEs, d.sec1.defHy, { esClass: 'text-base text-stone-800' })}

      <div>
        <h3 class="text-base font-bold text-stone-900 mb-3">${esc(d.sec1.rememberTitleEs)} — ${esc(d.sec1.rememberTitleHy)}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-5 bg-emerald-50 border border-emerald-300 rounded-lg">
            <div class="text-sm font-bold text-emerald-800 mb-1">${esc(d.sec1.doTitleEs)} — ${esc(d.sec1.doTitleHy)}</div>
            ${esBlock(d.sec1.doEs, d.sec1.doHy, { esClass: 'text-base text-stone-900', compact: true })}
          </div>
          <div class="p-5 bg-red-50 border border-red-300 rounded-lg">
            <div class="text-sm font-bold text-red-800 mb-1">${esc(d.sec1.dontTitleEs)} — ${esc(d.sec1.dontTitleHy)}</div>
            ${esBlock(d.sec1.dontEs, d.sec1.dontHy, { esClass: 'text-base text-stone-900', compact: true })}
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-bold text-stone-900 mb-3">${esc(d.sec1.stepsTitleEs)} — ${esc(d.sec1.stepsTitleHy)}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${d.sec1.steps
            .map(
              (s) => `
            <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
              <div class="font-mono-num text-sm font-bold text-orange-900 mb-1">0${s.num}</div>
              ${esBlock(s.titleEs, s.titleHy, { esClass: 'text-base font-bold text-stone-900', compact: true })}
              <div class="mt-1">${esBlock(s.descEs, s.descHy, { esClass: 'text-base text-stone-700', compact: true })}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </section>

    <!-- 2. EJEMPLO GUIADO -->
    <section id="m2-sec2" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-8 space-y-6">
      ${esBlock(d.sec2.headingEs, d.sec2.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-stone-900' })}

      <div class="p-6 bg-[#faf2e7] border border-[#dfc3a3] rounded-xl">
        ${esBlock(d.sec2.textTitleEs, d.sec2.textTitleHy, { tag: 'h3', esClass: 'font-display text-xl font-semibold text-stone-900 mb-2' })}
        ${esBlock(d.sec2.textEs, d.sec2.textHy, { tag: 'p', esClass: 'text-[18px] text-stone-900 leading-8' })}
      </div>

      <div>
        <h3 class="text-lg font-bold text-stone-900 mb-3">${esc(d.sec2.qaTitleEs)} — ${esc(d.sec2.qaTitleHy)}</h3>
        <div class="divide-y divide-[#e7d1b6] border border-[#dfc3a3] rounded-xl px-5 bg-white">
          ${d.sec2.qaRows
            .map(
              (r) => `
            <div class="py-4">
              ${esBlock(r.qEs, r.qHy, { esClass: 'text-base font-semibold text-stone-900', compact: true })}
              ${answerControl(r.id, r.aEs, r.aHy)}
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="p-5 bg-[#f5e7d5] border border-[#d4b28c] rounded-xl space-y-3">
        <div class="text-sm font-mono-num font-bold text-orange-900">RESUMEN MODELO · ${esc(d.sec2.buildTitleEs)}</div>
        ${esBlock(d.sec2.modelEs, d.sec2.modelHy, { esClass: 'text-base text-stone-900 leading-relaxed' })}
        <div class="pt-3 border-t border-[#dfc3a3]">
          <div class="text-sm font-bold text-stone-900 mb-1">${esc(d.sec2.whyCorrectTitleEs)} — ${esc(d.sec2.whyCorrectTitleHy)}</div>
          <p class="text-base text-stone-800">${esc(d.sec2.whyCorrectHy)}</p>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-bold text-stone-900 mb-1">${esc(d.sec2.ruleTitleEs)} — ${esc(d.sec2.ruleTitleHy)}</h3>
        <p class="text-sm text-stone-700 mb-3">${esc(d.sec2.ruleIntroHy)}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          ${d.sec2.phrases
            .map(
              (ph) => `
            <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
              <div class="text-sm font-medium text-orange-900 mb-1">${esc(ph.labelEs)} — ${esc(ph.labelHy)}</div>
              ${esBlock(ph.es, ph.hy, { esClass: 'text-base font-bold text-stone-900', compact: true })}
            </div>
          `
            )
            .join('')}
        </div>
        <p class="text-sm text-stone-700 mt-3">${esc(d.sec2.ruleNoteHy)}</p>
      </div>
    </section>

    <!-- 3. LECTURA PRINCIPAL -->
    <section id="m2-sec3" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-8 space-y-6">
      <div>
        <div class="text-sm font-mono-num font-semibold text-orange-900 mb-1">${esc(d.sec3.metaEs)}</div>
        ${esBlock(d.sec3.headingEs, d.sec3.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-stone-900' })}
      </div>

      <div class="bg-[#faf2e7] border border-[#dfc3a3] rounded-xl p-5 sm:p-7">
        <div class="pb-3 mb-4 border-b border-[#dfc3a3]">
          ${esBlock(d.sec3.storyTitleEs, d.sec3.storyTitleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
          <p class="text-sm text-orange-900 mt-1">Սեղմի՛ր յուրաքանչյուր իսպաներեն պարբերության վրա՝ հայերեն թարգմանությունը տեսնելու համար։</p>
        </div>
        <div class="space-y-4 text-[18px] leading-8">
          ${d.sec3.paragraphs.map((p) => esBlock(p.es, p.hy, { tag: 'p', esClass: 'text-stone-900 leading-8' })).join('')}
        </div>
        <div class="mt-4 pt-3 border-t border-[#dfc3a3]">
          ${esBlock(d.sec3.storyNoteEs, d.sec3.storyNoteHy, { esClass: 'text-sm italic text-stone-600', compact: true })}
        </div>
      </div>

      <!-- Vocabulario -->
      <div>
        <h3 class="text-lg font-bold text-stone-900 mb-3">Vocabulario — Բառապաշար</h3>
        <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
          <table class="w-full text-left text-base border-collapse">
            <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
              <tr>
                <th class="px-4 py-3 font-bold">Español (սեղմի՛ր թարգմանության համար)</th>
                <th class="px-4 py-3 font-bold">Հայերեն</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e7d1b6] bg-white">
              ${d.sec3.vocab
                .map(
                  (v) => `
                <tr>
                  <td class="px-4 py-3 font-semibold">${esCell(v.es, v.hy)}</td>
                  <td class="px-4 py-3 text-stone-800">${esc(v.hy)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- 4. EJERCICIOS PASO A PASO -->
    <section id="m2-sec4" class="mb-8 space-y-6">
      <div>
        ${esBlock(d.sec4.headingEs, d.sec4.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
        <p class="text-base text-stone-800 mt-2">${esc(d.sec4.introHy)}</p>
      </div>

      <!-- Ejercicio 1 -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        <h3 class="text-xl font-bold text-stone-900">${esc(d.sec4.ex1TitleEs)}</h3>
        <p class="text-base text-stone-700 mt-1 pb-4 border-b border-[#e7d1b6]">${esc(d.sec4.ex1SubHy)}</p>
        ${d.sec4.ex1Questions.map((q) => openQuestionCard(q, { shortInput: true })).join('')}
      </div>

      <!-- Ejercicio 2 -->
      ${renderChoiceQuiz('impSec', `${d.sec4.ex2TitleEs} — ${d.sec4.ex2DescEs}`, d.sec4.ex2DescHy, d.sec4.ex2Items, ['Principal', 'Secundaria'], 'correctas')}

      <!-- Ejercicio 3 -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e7d1b6]">
          <div>
            <h3 class="text-xl font-bold text-stone-900">${esc(d.sec4.ex3TitleEs)}</h3>
            <p class="text-base text-stone-700 mt-1">${esc(d.sec4.ex3SubHy)}</p>
          </div>
          <button type="button" data-copy-esquema class="min-h-[44px] px-4 py-2 text-sm font-semibold bg-orange-800 text-white hover:bg-orange-900 rounded-lg whitespace-nowrap shrink-0 cursor-pointer">
            Copiar mis respuestas · Պատճենել
          </button>
        </div>
        <div class="divide-y divide-[#e7d1b6] mt-2">
          ${d.sec4.ex3Fields
            .map(
              (f) => `
            <div class="py-5">
              ${esBlock(f.labelEs, f.labelHy, { esClass: 'text-base font-bold text-stone-900', compact: true })}
              <textarea rows="2" data-input-id="${esc(f.id)}" placeholder="Escribe aquí..." class="w-full mt-2 px-4 py-3 text-base border border-[#c99e72] rounded-lg bg-white">${esc(state.inputs[f.id] || '')}</textarea>
              ${answerControl(f.id, f.answerEs, f.answerHy)}
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Ejercicio 4 -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        ${esBlock(d.sec4.ex4TitleEs, 'Վարժություն 4 — Այժմ գրի՛ր ՔՈ ամփոփումը', { tag: 'h3', esClass: 'text-xl font-bold text-stone-900 mb-2' })}
        ${esBlock(d.sec4.ex4DescEs, d.sec4.ex4DescHy, { esClass: 'text-base text-stone-800 mb-4' })}

        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span class="text-base font-bold text-stone-900">Mi resumen — Իմ ամփոփումը</span>
          <span id="wc-res-ex4-summary" class="font-mono-num text-sm ${wordTargetColor}">${myResumenWords} palabras · Objetivo: 45–65 palabras</span>
        </div>
        <textarea rows="5" data-input-id="res-ex4-summary" data-wordcount-target="wc-res-ex4-summary" placeholder="Escribe tu resumen aquí en 3 o 4 frases..." class="w-full px-4 py-3 text-base border border-[#c99e72] rounded-lg bg-white leading-relaxed">${esc(myResumenText)}</textarea>
        <div class="flex flex-wrap items-center gap-3 mt-3">
          <button type="button" data-copy-input="res-ex4-summary" class="min-h-[44px] px-4 py-2 text-sm font-semibold bg-orange-800 text-white hover:bg-orange-900 rounded-lg whitespace-nowrap shrink-0 cursor-pointer">
            Copiar resumen · Պատճենել
          </button>
        </div>
        ${answerControl('res-ex4-model', d.sec6.mainModelEs, d.sec6.mainModelHy)}
      </div>

      <!-- Ejercicio 5 -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e7d1b6]">
          <div>
            <h3 class="text-xl font-bold text-stone-900">${esc(d.sec4.ex5TitleEs)}</h3>
            <p class="text-base text-stone-700 mt-1">${esc(d.sec4.ex5SubHy)}</p>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <span class="font-mono-num text-base font-bold text-orange-900">Autoevaluación · ${autoChecked} / ${d.sec4.ex5Checks.length}</span>
            <button type="button" data-reset-checks="m2" class="min-h-[44px] px-4 py-2 text-sm font-semibold text-orange-950 bg-[#ead5bb] hover:bg-[#dfc3a0] rounded-lg whitespace-nowrap shrink-0 cursor-pointer">
              Reiniciar
            </button>
          </div>
        </div>
        <div class="divide-y divide-[#efe0cb] mt-2">
          ${d.sec4.ex5Checks
            .map(
              (c) => `
            <label class="flex items-start gap-3.5 py-3.5 cursor-pointer hover:bg-[#f7ece0] rounded-lg px-2.5 -mx-2.5">
              <input type="checkbox" data-check-id="${esc(c.id)}" ${state.checks[c.id] ? 'checked' : ''} class="mt-1.5 w-5 h-5 rounded border-[#c99e72] accent-orange-800" />
              <div>
                <div class="text-base font-semibold ${state.checks[c.id] ? 'line-through text-stone-400' : 'text-stone-900'}">${esc(c.es)}</div>
                <div class="text-sm text-stone-600 mt-0.5">${esc(c.hy)}</div>
              </div>
            </label>
          `
            )
            .join('')}
        </div>
      </div>
    </section>

    <!-- 5. PRÁCTICA CON TEXTOS CORTOS -->
    <section id="m2-sec5" class="mb-8 space-y-6">
      ${esBlock(d.sec5.headingEs, d.sec5.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}

      <!-- Texto 1: Martín -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-5">
        ${esBlock(d.sec5.texto1.titleEs, d.sec5.texto1.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        <div class="p-5 sm:p-6 bg-[#faf2e7] border border-[#dfc3a3] rounded-xl">
          ${esBlock(d.sec5.texto1.es, d.sec5.texto1.hy, { tag: 'p', esClass: 'text-[18px] text-stone-900 leading-8' })}
        </div>
        <div>
          <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Preguntas — Հարցեր</h4>
          ${d.sec5.texto1.questions.map((q) => openQuestionCard(q, { shortInput: true })).join('')}
        </div>
        <div class="pt-4 border-t border-[#e7d1b6]">
          ${esBlock(d.sec5.texto1.summaryPromptEs, d.sec5.texto1.summaryPromptHy, { esClass: 'text-base font-bold text-stone-900 mb-2' })}
          <div class="flex items-center justify-between text-sm text-stone-600 mb-1.5">
            <span class="font-semibold">Mi resumen</span>
            <span id="wc-mar-summary" class="font-mono-num font-semibold text-orange-900">${countWords(martinSummary)} palabras</span>
          </div>
          <textarea rows="3" data-input-id="mar-summary" data-wordcount-target="wc-mar-summary" class="w-full px-4 py-3 text-base border border-[#c99e72] rounded-lg bg-white" placeholder="Escribe tu resumen en dos frases...">${esc(martinSummary)}</textarea>
          <div class="mt-2.5">
            <button type="button" data-copy-input="mar-summary" class="min-h-[44px] px-4 py-2 text-sm font-semibold bg-orange-800 text-white hover:bg-orange-900 rounded-lg whitespace-nowrap shrink-0 cursor-pointer">Copiar · Պատճենել</button>
          </div>
          ${answerControl('mar-model', d.sec5.texto1.modelEs, d.sec5.texto1.modelHy)}
        </div>
      </div>

      <!-- Texto 2: Lucía -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-5">
        ${esBlock(d.sec5.texto2.titleEs, d.sec5.texto2.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        <div class="p-5 sm:p-6 bg-[#faf2e7] border border-[#dfc3a3] rounded-xl">
          ${esBlock(d.sec5.texto2.es, d.sec5.texto2.hy, { tag: 'p', esClass: 'text-[18px] text-stone-900 leading-8' })}
        </div>
        <div>
          <h4 class="text-lg font-bold text-stone-900 mb-1">Ejercicio — Վարժություն</h4>
          <p class="text-sm text-stone-700 mb-3">Completa estas ideas y después escribe el resumen. — Լրացրո՛ւ մտքերը և հետո գրի՛ր ամփոփումը։</p>
          <div class="divide-y divide-[#e7d1b6] border border-[#dfc3a3] rounded-xl px-5 bg-white">
            ${d.sec5.texto2.fields
              .map(
                (f) => `
              <div class="py-4">
                ${esBlock(`${f.labelEs}:`, f.labelHy, { esClass: 'text-base font-bold text-stone-900', compact: true })}
                <input type="text" data-input-id="${esc(f.id)}" value="${esc(state.inputs[f.id] || '')}" class="w-full mt-2 px-4 py-2.5 text-base border border-[#c99e72] rounded-lg bg-white" placeholder="Escribe aquí..." />
                ${answerControl(f.id, f.answerEs, f.answerHy)}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
        <div class="pt-4 border-t border-[#e7d1b6]">
          ${esBlock(d.sec5.texto2.summaryPromptEs, d.sec5.texto2.summaryPromptHy, { esClass: 'text-base font-bold text-stone-900 mb-2' })}
          <div class="flex items-center justify-between text-sm text-stone-600 mb-1.5">
            <span class="font-semibold">Mi resumen</span>
            <span id="wc-luc-summary" class="font-mono-num font-semibold text-orange-900">${countWords(luciaSummary)} palabras</span>
          </div>
          <textarea rows="3" data-input-id="luc-summary" data-wordcount-target="wc-luc-summary" class="w-full px-4 py-3 text-base border border-[#c99e72] rounded-lg bg-white" placeholder="Escribe tu resumen en dos o tres frases...">${esc(luciaSummary)}</textarea>
          <div class="mt-2.5">
            <button type="button" data-copy-input="luc-summary" class="min-h-[44px] px-4 py-2 text-sm font-semibold bg-orange-800 text-white hover:bg-orange-900 rounded-lg whitespace-nowrap shrink-0 cursor-pointer">Copiar · Պատճենել</button>
          </div>
          ${answerControl('luc-model', d.sec5.texto2.modelEs, d.sec5.texto2.modelHy)}
        </div>
      </div>
    </section>

    <!-- 6. MODELOS PARA EL PROFESOR -->
    <section id="m2-sec6" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-8 space-y-5">
      ${esBlock(d.sec6.headingEs, d.sec6.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-stone-900' })}
      <p class="text-base text-stone-800">${esc(d.sec6.introHy)}</p>

      <div class="p-5 bg-[#faf2e7] border border-[#dfc3a3] rounded-xl space-y-3">
        <div class="text-base font-bold text-stone-900">${esc(d.sec6.mainModelTitleEs)}</div>
        ${esBlock(d.sec6.mainModelEs, d.sec6.mainModelHy, { esClass: 'text-base text-stone-900 leading-relaxed' })}
        <div class="pt-3 border-t border-[#dfc3a3]">
          <div class="text-sm font-bold text-orange-900 mb-1">${esc(d.sec6.whyGoodTitleEs)} — ${esc(d.sec6.whyGoodTitleHy)}</div>
          ${esBlock(d.sec6.flowEs, d.sec6.flowHy, { esClass: 'text-base font-bold text-stone-900', compact: true })}
          <p class="text-sm text-stone-700 mt-2">${esc(d.sec6.whyGoodNoteHy)}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
          <div class="text-sm font-bold text-orange-900 mb-1">Resumen — El dibujo de Martín</div>
          ${esBlock(d.sec5.texto1.modelEs, d.sec5.texto1.modelHy, { esClass: 'text-base text-stone-900', compact: true })}
        </div>
        <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
          <div class="text-sm font-bold text-orange-900 mb-1">Resumen — Una sorpresa en la biblioteca</div>
          ${esBlock(d.sec5.texto2.modelEs, d.sec5.texto2.modelHy, { esClass: 'text-base text-stone-900', compact: true })}
        </div>
      </div>
    </section>

    <!-- 7. CÓMO PRACTICAR CON EL NIÑO -->
    <section id="m2-sec7" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-8 space-y-5">
      ${esBlock(d.sec7.headingEs, d.sec7.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-stone-900' })}
      <p class="text-base text-stone-800">${esc(d.sec7.introHy)}</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${d.sec7.levels
          .map(
            (lv) => `
          <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg space-y-2">
            ${esBlock(lv.titleEs, lv.titleHy, { tag: 'h3', esClass: 'text-lg font-bold text-stone-900', compact: true })}
            <p class="text-base text-stone-800">${esc(lv.descHy)}</p>
            ${esBlock(lv.promptEs, lv.promptHy, { esClass: 'text-sm font-semibold text-orange-900', compact: true })}
          </div>
        `
          )
          .join('')}
      </div>
      <div class="p-5 bg-[#f5e7d5] border border-[#c79a6b] rounded-xl text-center">
        <div class="text-sm font-bold text-orange-900 mb-1">${esc(d.sec7.fourQuestionsTitleEs)}</div>
        ${esBlock(d.sec7.fourQuestionsEs, d.sec7.fourQuestionsHy, { esClass: 'font-display text-xl font-bold text-stone-900' })}
      </div>
      <div class="space-y-2.5 text-base text-orange-950 bg-[#f5e7d5] border border-[#d4b28c] rounded-xl p-5">
        ${d.sec7.finalTipHy.map((p) => `<p>${esc(p)}</p>`).join('')}
      </div>
    </section>
  `;
}

/* ============================================================================
   MODULE 3: PREPARACIÓN COMPLETA (8 TEMAS + GRAMÁTICA + SIMULACRO + REPASO)
============================================================================ */
function renderModule3() {
  const d = COMPLETO_DATA;
  const catState = state.quizzes.catGram || {};
  let catCorrect = 0;
  d.parte2.ex2Words.forEach((w) => {
    if (catState[w.id] === w.correct) catCorrect++;
  });

  const rapidItem = d.parte6.quickReview[state.rapidIdx];

  return `
    <!-- Header -->
    <section id="m3-intro" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-8 space-y-5">
      <div class="text-sm font-mono-num font-semibold text-orange-900">${esc(d.subtitleEs)}</div>
      ${esBlock(d.titleEs, d.titleHy, { tag: 'h1', esClass: 'font-display text-3xl sm:text-4xl font-semibold text-stone-900 leading-tight' })}
      <p class="text-base text-stone-800 leading-relaxed">${esc(d.introHy)}</p>

      <div>
        <h2 class="text-base font-bold text-stone-900 mb-3">${esc(d.topicsTitleEs)} — ${esc(d.topicsTitleHy)}</h2>
        <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
          <table class="w-full text-left text-base border-collapse">
            <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
              <tr>
                <th class="px-4 py-3 font-bold">Tema en español</th>
                <th class="px-4 py-3 font-bold">Հայերեն</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e7d1b6] bg-white">
              ${d.topics
                .map(
                  (t) => `
                <tr>
                  <td class="px-4 py-3 font-semibold">${esCell(t.es, t.hy)}</td>
                  <td class="px-4 py-3 text-stone-800">${esc(t.hy)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
        <p class="text-sm text-stone-700 mt-3">${esc(d.topicsNoteHy)}</p>
      </div>
    </section>

    <!-- PARTE I: TEORÍA EXPLICADA -->
    <div id="m3-parte1" class="mb-4">
      ${esBlock('PARTE I. TEORÍA EXPLICADA', 'ՄԱՍ I. ՄԱՆՐԱՄԱՍՆ ՏԵՍՈՒԹՅՈՒՆ', { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
    </div>

    <!-- TEMA 1 -->
    <section id="m3-tema1" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-6 space-y-5">
      ${esBlock(d.tema1.titleEs, d.tema1.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
      <p class="text-base text-stone-700">${esc(d.tema1.introHy)}</p>

      <div class="space-y-4">
        ${d.tema1.items
          .map(
            (it) => `
          <div class="p-5 bg-[#faf2e7] border border-[#dfc3a3] rounded-xl space-y-2.5">
            ${esBlock(`${it.num}. ${it.nameEs}`, it.nameHy, { tag: 'h4', esClass: 'text-lg font-bold text-stone-900', compact: true })}
            ${esBlock(it.defEs, it.defHy, { esClass: 'text-base text-stone-800', compact: true })}
            <div class="p-4 bg-white border border-[#dfc3a3] rounded-lg">
              <div class="text-xs font-mono-num font-bold text-orange-900 mb-1">EJEMPLO · ՕՐԻՆԱԿ</div>
              ${esBlock(it.exEs, it.exHy, { esClass: 'text-base italic text-stone-900', compact: true })}
            </div>
            ${esBlock(it.cluesEs, it.cluesHy, { esClass: 'text-sm font-semibold text-orange-900', compact: true })}
          </div>
        `
          )
          .join('')}
      </div>

      <div>
        <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Preguntas y respuestas — Հարցեր և պատասխաններ</h4>
        ${d.tema1.qas.map((qa) => theoryQaItem(qa)).join('')}
      </div>

      ${renderChoiceQuiz('genLit', d.tema1.quiz.titleEs, d.tema1.quiz.titleHy, d.tema1.quiz.items, d.tema1.quiz.options)}
    </section>

    <!-- TEMA 2 -->
    <section id="m3-tema2" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-6 space-y-5">
      ${esBlock(d.tema2.titleEs, d.tema2.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
      <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
        <table class="w-full text-left text-base border-collapse">
          <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
            <tr>
              <th class="px-4 py-3 font-bold">Literatura culta</th>
              <th class="px-4 py-3 font-bold">Literatura popular</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e7d1b6] bg-white">
            ${d.tema2.rows
              .map(
                (r) => `
              <tr>
                <td class="px-4 py-3.5 align-top">${esCell(r.cEs, r.cHy)}</td>
                <td class="px-4 py-3.5 align-top">${esCell(r.pEs, r.pHy)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="text-base text-orange-950 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg p-4">${esc(d.tema2.noteHy)}</p>
      <div>
        <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Preguntas y respuestas — Հարցեր և պատասխաններ</h4>
        ${d.tema2.qas.map((qa) => theoryQaItem(qa)).join('')}
      </div>
    </section>

    <!-- TEMA 3 -->
    <section id="m3-tema3" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-6 space-y-5">
      ${esBlock(d.tema3.titleEs, d.tema3.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${d.tema3.items
          .map(
            (it) => `
          <div class="p-5 bg-[#faf2e7] border border-[#dfc3a3] rounded-xl space-y-2.5">
            ${esBlock(`${it.num}. ${it.nameEs}`, it.nameHy, { tag: 'h4', esClass: 'text-lg font-bold text-stone-900', compact: true })}
            ${esBlock(it.defEs, it.defHy, { esClass: 'text-base text-stone-800', compact: true })}
            ${
              it.bullets
                ? `<div class="p-3.5 bg-white border border-[#dfc3a3] rounded-lg space-y-1">
                    <div class="text-sm font-bold text-orange-900">${esc(it.bulletsTitleEs)} — ${esc(it.bulletsTitleHy)}</div>
                    ${it.bullets.map((b) => esBlock(`• ${b.es}`, b.hy, { esClass: 'text-sm font-semibold text-stone-900', compact: true })).join('')}
                   </div>`
                : ''
            }
            ${it.exEs ? esBlock(it.exEs, it.exHy, { esClass: 'text-sm italic text-orange-900', compact: true }) : ''}
          </div>
        `
          )
          .join('')}
      </div>
      <div>
        <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Preguntas y respuestas — Հարցեր և պատասխաններ</h4>
        ${d.tema3.qas.map((qa) => theoryQaItem(qa)).join('')}
      </div>
    </section>

    <!-- TEMA 4 -->
    <section id="m3-tema4" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-6 space-y-5">
      ${esBlock(d.tema4.titleEs, d.tema4.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
      ${esBlock(d.tema4.defEs, d.tema4.defHy, { esClass: 'text-base text-stone-800' })}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${[d.tema4.prosa, d.tema4.verso]
          .map(
            (b) => `
          <div class="p-5 bg-[#faf2e7] border border-[#dfc3a3] rounded-xl space-y-2">
            ${esBlock(b.titleEs, b.titleHy, { tag: 'h4', esClass: 'text-lg font-bold text-stone-900', compact: true })}
            ${esBlock(b.defEs, b.defHy, { esClass: 'text-base text-stone-800', compact: true })}
            ${esBlock(b.exEs, b.exHy, { esClass: 'text-sm italic text-orange-900 font-medium', compact: true })}
          </div>
        `
          )
          .join('')}
      </div>

      <div>
        <h4 class="text-base font-bold text-stone-900 mb-2">${esc(d.tema4.compTitleEs)} — ${esc(d.tema4.compTitleHy)}</h4>
        <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
          <table class="w-full text-left text-base border-collapse">
            <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
              <tr>
                <th class="px-4 py-3 font-bold">Habitual — Սովորական</th>
                <th class="px-4 py-3 font-bold">Literario — Գեղարվեստական</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e7d1b6] bg-white">
              ${d.tema4.compRows
                .map(
                  (r) => `
                <tr>
                  <td class="px-4 py-3.5">${esCell(r.hEs, r.hHy)}</td>
                  <td class="px-4 py-3.5 font-semibold">${esCell(r.lEs, r.lHy)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Preguntas y respuestas — Հարցեր և պատասխաններ</h4>
        ${d.tema4.qas.map((qa) => theoryQaItem(qa)).join('')}
      </div>
    </section>

    <!-- TEMA 5 -->
    <section id="m3-tema5" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-6 space-y-6">
      ${esBlock(d.tema5.titleEs, d.tema5.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
      <p class="text-base text-stone-800">${esc(d.tema5.introHy)}</p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${d.tema5.levels
          .map(
            (lv) => `
          <div class="p-4 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg space-y-1">
            ${esBlock(lv.nameEs, lv.nameHy, { esClass: 'text-base font-bold text-orange-950', compact: true })}
            ${esBlock(lv.descEs, lv.descHy, { esClass: 'text-sm text-stone-800', compact: true })}
          </div>
        `
          )
          .join('')}
      </div>

      ${d.tema5.groups
        .map(
          (grp) => `
        <div class="space-y-3">
          ${esBlock(grp.titleEs, grp.titleHy, { tag: 'h4', esClass: 'text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]' })}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${grp.figures
              .map(
                (f) => `
              <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg space-y-2 ${f.metaForms ? 'md:col-span-2' : ''}">
                ${esBlock(`${f.num}. ${f.nameEs}`, f.nameHy, { tag: 'h5', esClass: 'text-base font-bold text-stone-900', compact: true })}
                ${esBlock(f.defEs, f.defHy, { esClass: 'text-base text-stone-800', compact: true })}
                ${esBlock(`Ejemplo: ${f.exEs}`, f.exHy, { esClass: 'text-base italic text-orange-900 font-medium', compact: true })}
                ${f.clueEs ? esBlock(`Pista: ${f.clueEs}`, f.clueHy, { esClass: 'text-sm text-stone-700', compact: true }) : ''}
                ${
                  f.metaForms
                    ? `<div class="mt-3 overflow-x-auto bg-white border border-[#dfc3a3] rounded-lg">
                        <table class="w-full text-left text-sm border-collapse">
                          <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-orange-950">
                            <tr>
                              <th class="px-3.5 py-2.5 font-bold">Forma</th>
                              <th class="px-3.5 py-2.5 font-bold">Ejemplo</th>
                              <th class="px-3.5 py-2.5 font-bold">Explicación</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-[#e7d1b6]">
                            ${f.metaForms
                              .map(
                                (m) => `
                              <tr>
                                <td class="px-3.5 py-2.5 font-mono-num font-bold text-orange-900">${esc(m.forma)}</td>
                                <td class="px-3.5 py-2.5 font-semibold">${esc(m.exEs)}</td>
                                <td class="px-3.5 py-2.5 text-stone-800">${esc(m.explainHy)}</td>
                              </tr>
                            `
                              )
                              .join('')}
                          </tbody>
                        </table>
                      </div>`
                    : ''
                }
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
        )
        .join('')}

      <div>
        <h4 class="text-base font-bold text-stone-900 mb-2">Tabla para memorizar — Աղյուսակ՝ արագ հիշելու համար</h4>
        <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
          <table class="w-full text-left text-base border-collapse">
            <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
              <tr>
                <th class="px-4 py-3 font-bold">Figura</th>
                <th class="px-4 py-3 font-bold">Cómo reconocerla — Ինչպե՞ս տարբերել</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e7d1b6] bg-white">
              ${d.tema5.memoTable
                .map(
                  (m) => `
                <tr>
                  <td class="px-4 py-3 font-bold text-orange-900">${esc(m.fig)}</td>
                  <td class="px-4 py-3">${esCell(m.clueEs, m.clueHy)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <p class="text-base text-orange-950 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg p-4">${esc(d.tema5.noteHy)}</p>

      <div>
        <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Preguntas y respuestas sobre las figuras</h4>
        ${d.tema5.qas.map((qa) => theoryQaItem(qa)).join('')}
      </div>
    </section>

    <!-- TEMA 6 -->
    <section id="m3-tema6" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-6 space-y-5">
      ${esBlock(d.tema6.titleEs, d.tema6.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
      <p class="text-base text-stone-700">${esc(d.tema6.introHy)}</p>
      ${esBlock(d.tema6.defEs, d.tema6.defHy, { esClass: 'text-base text-stone-800' })}
      <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
        <table class="w-full text-left text-base border-collapse">
          <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
            <tr>
              <th class="px-4 py-3 font-bold">Función</th>
              <th class="px-4 py-3 font-bold">Explicación ES / HY</th>
              <th class="px-4 py-3 font-bold">Ejemplo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e7d1b6] bg-white">
            ${d.tema6.rows
              .map(
                (r) => `
              <tr>
                <td class="px-4 py-3.5 font-bold text-orange-900 align-top">${esc(r.func)}</td>
                <td class="px-4 py-3.5 align-top">${esCell(r.expEs, r.expHy)}</td>
                <td class="px-4 py-3.5 align-top">${esCell(r.exEs, r.exHy)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <div>
        <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Preguntas y respuestas</h4>
        ${d.tema6.qas.map((qa) => theoryQaItem(qa)).join('')}
      </div>
    </section>

    <!-- TEMA 7 -->
    <section id="m3-tema7" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-6 space-y-5">
      ${esBlock(d.tema7.titleEs, d.tema7.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
      ${esBlock(d.tema7.defEs, d.tema7.defHy, { esClass: 'text-base text-stone-800' })}
      <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
        <table class="w-full text-left text-base border-collapse">
          <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
            <tr>
              <th class="px-4 py-3 font-bold">Modalidad</th>
              <th class="px-4 py-3 font-bold">Ejemplo ES</th>
              <th class="px-4 py-3 font-bold">Հայերեն</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e7d1b6] bg-white">
            ${d.tema7.rows
              .map(
                (r) => `
              <tr>
                <td class="px-4 py-3.5 font-bold text-orange-900">${esc(r.mod)}</td>
                <td class="px-4 py-3.5">${esCell(r.exEs, r.exHy)}</td>
                <td class="px-4 py-3.5 text-stone-800">${esc(r.exHy)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg space-y-1.5">
        <div class="text-base font-bold text-stone-900 mb-2">${esc(d.tema7.diffsTitleEs)} — ${esc(d.tema7.diffsTitleHy)}</div>
        ${d.tema7.diffs.map((df) => esBlock(df.es, df.hy, { esClass: 'text-base text-stone-900', compact: true })).join('')}
      </div>
      <div>
        <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Preguntas y respuestas</h4>
        ${d.tema7.qas.map((qa) => theoryQaItem(qa)).join('')}
      </div>
    </section>

    <!-- TEMA 8 -->
    <section id="m3-tema8" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 mb-8 space-y-5">
      ${esBlock(d.tema8.titleEs, d.tema8.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
      <p class="text-base text-stone-700">${esc(d.tema8.introHy)}</p>
      <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
        <table class="w-full text-left text-base border-collapse">
          <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
            <tr>
              <th class="px-4 py-3 font-bold">Categoría</th>
              <th class="px-4 py-3 font-bold">Explicación ES / HY</th>
              <th class="px-4 py-3 font-bold">Ejemplo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e7d1b6] bg-white">
            ${d.tema8.rows
              .map(
                (r) => `
              <tr>
                <td class="px-4 py-3.5 font-bold text-orange-900 align-top">${esc(r.catEs)} — <span class="font-normal text-stone-700">${esc(r.catHy)}</span></td>
                <td class="px-4 py-3.5 align-top">${esCell(r.expEs, r.expHy)}</td>
                <td class="px-4 py-3.5 font-mono-num text-sm text-stone-800 align-top">${esc(r.ex)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="text-base text-orange-950 bg-[#f5e7d5] border border-[#d4b28c] rounded-lg p-4">${esc(d.tema8.noteHy)}</p>
      <div>
        <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Ejemplos que pueden aparecer en el examen</h4>
        ${d.tema8.qas.map((qa) => theoryQaItem(qa)).join('')}
      </div>
    </section>

    <!-- PARTE II: EJERCICIOS DE GRAMÁTICA -->
    <section id="m3-parte2" class="mb-10 space-y-6">
      ${esBlock(d.parte2.headingEs, d.parte2.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}

      ${renderChoiceQuiz('funcLang', d.parte2.ex1TitleEs, 'Վարժություն 1 — Լեզվի գործառույթը', d.parte2.ex1Items, d.parte2.ex1Options)}

      <!-- Ejercicio 2: Dropdown Categorías gramaticales -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e7d1b6]">
          <div>
            <h3 class="text-xl font-bold text-stone-900">${esc(d.parte2.ex2TitleEs)}</h3>
            <div class="mt-1">${esBlock(d.parte2.ex2SentenceEs, d.parte2.ex2SentenceHy, { esClass: 'text-base text-stone-800', compact: true })}</div>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <span class="font-mono-num text-base font-bold text-orange-900">Resultado: ${catCorrect} / ${d.parte2.ex2Words.length}</span>
            <button type="button" data-reset-quiz="catGram" class="min-h-[44px] px-4 py-2 text-sm font-semibold text-orange-950 bg-[#ead5bb] hover:bg-[#dfc3a0] rounded-lg whitespace-nowrap shrink-0 cursor-pointer">
              Repetir · Կրկնել
            </button>
          </div>
        </div>
        <div class="divide-y divide-[#e7d1b6] mt-2">
          ${d.parte2.ex2Words
            .map((w) => {
              const sel = catState[w.id] || '';
              const ok = sel && sel === w.correct;
              const wrong = sel && sel !== w.correct;
              return `
                <div class="py-4">
                  <div class="flex flex-wrap items-center gap-4">
                    <span class="font-display text-lg font-bold text-stone-900 w-36">${esc(w.word)}</span>
                    <select data-cat-select="${esc(w.id)}" class="min-h-[44px] px-3.5 py-2 text-base border-2 rounded-lg bg-white ${
                      ok ? 'border-emerald-500 text-emerald-800 bg-emerald-50' : wrong ? 'border-red-400 text-red-800 bg-red-50' : 'border-[#c99e72] text-stone-900'
                    }">
                      <option value="">Selecciona...</option>
                      ${d.parte2.ex2Choices.map((ch) => `<option value="${esc(ch)}" ${sel === ch ? 'selected' : ''}>${esc(ch)}</option>`).join('')}
                    </select>
                    ${ok ? '<span class="text-sm font-bold text-emerald-700">✓ Ճիշտ է</span>' : ''}
                    ${wrong ? '<span class="text-sm font-bold text-red-700">✕ Փորձի՛ր կրկին</span>' : ''}
                  </div>
                  ${answerControl(`cat-${w.id}`, `${w.correct} — ${w.explainEs}`, w.explainHy)}
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    </section>

    <!-- PARTE III: SIMULACRO DE EXAMEN (30 PUNTOS) -->
    <section id="m3-parte3" class="mb-10 space-y-6">
      <div>
        ${esBlock(d.simulacro.headingEs, d.simulacro.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
        <p class="text-base text-stone-700 mt-2">${esc(d.simulacro.introHy)}</p>
      </div>

      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-8">
        <div class="border-b border-[#e7d1b6] pb-5">
          <div class="text-lg font-bold text-stone-900">${esc(d.simulacro.examTitleEs)}</div>
          <div class="text-sm font-semibold text-orange-900 mt-1">${esc(d.simulacro.examSubEs)}</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <label class="block">
              <span class="text-sm font-medium text-stone-700">Nombre y apellidos · Անուն և ազգանուն</span>
              <input type="text" data-input-id="m3-nombre" value="${esc(state.inputs['m3-nombre'] || '')}" class="w-full mt-1 px-3.5 py-2.5 text-base border border-[#c99e72] rounded-lg bg-white" placeholder="Nombre y apellidos..." />
            </label>
            <label class="block">
              <span class="text-sm font-medium text-stone-700">Fecha · Ամսաթիվ</span>
              <input type="text" data-input-id="m3-fecha" value="${esc(state.inputs['m3-fecha'] || '')}" class="w-full mt-1 px-3.5 py-2.5 text-base border border-[#c99e72] rounded-lg bg-white" placeholder="Fecha..." />
            </label>
          </div>
        </div>

        <!-- 1. Comprensión lectora -->
        <div>
          ${esBlock('1. Comprensión lectora (6 puntos)', 'Ընթերցանություն և տեքստի վերլուծություն', { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900 mb-4' })}
          <div class="bg-[#faf2e7] border border-[#dfc3a3] rounded-xl p-5 sm:p-7">
            <div class="pb-3 mb-4 border-b border-[#dfc3a3]">
              ${esBlock(d.simulacro.storyTitleEs, d.simulacro.storyTitleHy, { tag: 'h4', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
              <p class="text-sm text-orange-900 mt-1">Սեղմի՛ր յուրաքանչյուր իսպաներեն պարբերության վրա՝ հայերեն թարգմանությունը տեսնելու համար։</p>
            </div>
            <div class="space-y-4 text-[18px] leading-8">
              ${d.simulacro.paragraphs.map((p) => esBlock(p.es, p.hy, { tag: 'p', allowHtml: true, esClass: 'text-stone-900 leading-8' })).join('')}
            </div>
            <div class="mt-4 pt-3 border-t border-[#dfc3a3]">
              ${esBlock(d.simulacro.storyNoteEs, d.simulacro.storyNoteHy, { esClass: 'text-sm italic text-stone-600', compact: true })}
            </div>
          </div>

          <div class="mt-6">
            <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">Contesta a las preguntas — Պատասխանի՛ր հարցերին</h4>
            ${d.simulacro.sec1Questions.map((q) => openQuestionCard(q)).join('')}
          </div>
        </div>

        <!-- 2. 14 Figuras literarias -->
        <div class="pt-6 border-t border-[#e7d1b6]">
          ${esBlock('2. Identifica las figuras literarias (7 puntos)', 'Գտի՛ր գեղարվեստական արտահայտչամիջոցները · Յուրաքանչյուր ճիշտ պատասխանը՝ 0,5 միավոր', { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900 mb-2' })}
          <div class="divide-y divide-[#e7d1b6]">
            ${d.simulacro.sec2Figuras.map((f) => openQuestionCard(f, { shortInput: true })).join('')}
          </div>
          <div class="mt-5 p-5 bg-[#faf2e7] border border-[#dfc3a3] rounded-xl">
            ${esBlock(
              'Instrucción adicional: Después de identificar las figuras, elige tres y explica por qué son correctas.',
              'Լրացուցիչ հրահանգ: Երբ որոշես արտահայտչամիջոցները, ընտրի՛ր դրանցից երեքը և բացատրի՛ր, թե ինչու են ճիշտ։',
              { esClass: 'text-base font-bold text-stone-900' }
            )}
            <textarea rows="3" data-input-id="sim-fig-explain3" placeholder="Elige tres figuras y explica por qué..." class="w-full mt-2 px-4 py-3 text-base border border-[#c99e72] rounded-lg bg-white">${esc(state.inputs['sim-fig-explain3'] || '')}</textarea>
            <p class="text-sm text-stone-700 mt-2">${esc(d.simulacro.sec2NoteHy)}</p>
          </div>
        </div>

        <!-- 3. Funciones y Modalidades -->
        <div class="pt-6 border-t border-[#e7d1b6] space-y-6">
          ${esBlock('3. Funciones del lenguaje y modalidades oracionales (4 puntos)', 'Լեզվի գործառույթներ և նախադասությունների տեսակներ · A բաժնում նշի՛ր լեզվի գործառույթը, B բաժնում՝ նախադասության տեսակը։', { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
          <div>
            <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">A. Identifica la función del lenguaje (2 puntos)</h4>
            ${d.simulacro.sec3A.map((q) => openQuestionCard(q, { shortInput: true })).join('')}
          </div>
          <div>
            <h4 class="text-lg font-bold text-stone-900 pb-2 border-b border-[#e7d1b6]">B. Indica la modalidad oracional (2 puntos)</h4>
            ${d.simulacro.sec3B.map((q) => openQuestionCard(q, { shortInput: true })).join('')}
          </div>
        </div>

        <!-- 4. Categorías gramaticales -->
        <div class="pt-6 border-t border-[#e7d1b6]">
          ${esBlock('4. Categorías gramaticales (5 puntos) — Analiza las palabras destacadas.', 'Խոսքի մասերը · Որոշի՛ր ընդգծված բառերի խոսքի մասերը։', { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900 mb-2' })}
          <div class="divide-y divide-[#e7d1b6]">
            ${d.simulacro.sec4Cats.map((q) => openQuestionCard(q, { shortInput: true })).join('')}
          </div>
        </div>

        <!-- 5. Literatura y géneros -->
        <div class="pt-6 border-t border-[#e7d1b6]">
          ${esBlock('5. Literatura y géneros literarios (4 puntos)', 'Գրականություն և գրական սեռեր', { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900 mb-2' })}
          <div class="divide-y divide-[#e7d1b6]">
            ${d.simulacro.sec5Lit.map((q) => openQuestionCard(q)).join('')}
          </div>
        </div>

        <!-- 6. Traduce del armenio al español -->
        <div class="pt-6 border-t border-[#e7d1b6]">
          ${esBlock('6. Traduce del armenio al español (4 puntos)', 'ԹԱՐԳՄԱՆԻ՛Ր ՀԱՅԵՐԵՆԻՑ ԻՍՊԱՆԵՐԵՆ · Գրի՛ր լիարժեք և ճիշտ իսպաներեն նախադասություններ։', { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900 mb-2' })}
          <div class="divide-y divide-[#e7d1b6]">
            ${d.simulacro.sec6Trans
              .map(
                (tr) => `
              <div class="py-5">
                <div class="text-lg font-medium text-stone-900">${tr.num}. ${esc(tr.hy)}</div>
                <input type="text" data-input-id="${esc(tr.id)}" value="${esc(state.inputs[tr.id] || '')}" placeholder="Traduce al español..." class="w-full mt-2.5 px-4 py-3 text-base border border-[#c99e72] rounded-lg bg-white" />
                ${answerControl(tr.id, tr.answerEs, tr.hy)}
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    </section>

    <!-- PARTE IV: RESPUESTAS DEL EXAMEN -->
    <section id="m3-parte4" class="mb-8">
      <div class="mb-3">
        ${esBlock('PARTE IV. RESPUESTAS DEL EXAMEN', 'ՄԱՍ IV. ՔՆՆՈՒԹՅԱՆ ՃԻՇՏ ՊԱՏԱՍԽԱՆՆԵՐԸ · Այս բաժինը նախատեսված է աշխատանքն ավարտելուց հետո ստուգելու համար։', { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
      </div>
      <details class="bg-[#fffdf9] border border-[#d6b692] rounded-xl">
        <summary class="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none hover:bg-[#f7ece0] rounded-xl">
          <span class="text-base font-bold text-stone-900">Բացել քննության բոլոր պատասխանները (Մաս IV) · Ver soluciones completas</span>
          <span class="text-sm font-bold text-orange-900 whitespace-nowrap shrink-0">Բացել / Փակել</span>
        </summary>
        <div class="px-6 pb-8 pt-4 border-t border-[#e7d1b6] space-y-8">
          <div>
            <h3 class="text-lg font-bold text-stone-900 mb-3">1. Comprensión lectora — Պատասխաններ</h3>
            <div class="space-y-3">
              ${d.simulacro.sec1Questions
                .map(
                  (q) => `
                <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
                  <div class="text-sm font-bold text-orange-900 mb-1">${esc(q.label)} ${esc(q.es)}</div>
                  ${esBlock(q.answerEs, q.answerHy, { esClass: 'text-base text-stone-900', compact: true })}
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-stone-900 mb-3">2. Respuestas de figuras literarias</h3>
            <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
              <table class="w-full text-left text-base border-collapse">
                <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
                  <tr>
                    <th class="px-4 py-3 font-bold">Nº</th>
                    <th class="px-4 py-3 font-bold">Respuesta</th>
                    <th class="px-4 py-3 font-bold">Justificación breve</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#e7d1b6] bg-white">
                  ${d.simulacro.sec2Figuras
                    .map(
                      (f) => `
                    <tr>
                      <td class="px-4 py-3 font-mono-num font-semibold">${f.num}</td>
                      <td class="px-4 py-3 font-bold text-orange-900">${esc(f.answer)}</td>
                      <td class="px-4 py-3">${esCell(f.justEs, f.justHy)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-stone-900 mb-3">3. Funciones y modalidades</h3>
            <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
              <table class="w-full text-left text-base border-collapse">
                <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
                  <tr>
                    <th class="px-4 py-3 font-bold">Ejercicio</th>
                    <th class="px-4 py-3 font-bold">Respuesta</th>
                    <th class="px-4 py-3 font-bold">Հայերեն</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#e7d1b6] bg-white">
                  ${d.simulacro.sec3A
                    .map(
                      (x) => `
                    <tr>
                      <td class="px-4 py-3 font-mono-num font-bold text-orange-900">A${x.num}</td>
                      <td class="px-4 py-3 font-bold text-stone-900">${esc(x.answer)}</td>
                      <td class="px-4 py-3 text-stone-800">${esc(x.explainHy)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                  ${d.simulacro.sec3B
                    .map(
                      (x) => `
                    <tr>
                      <td class="px-4 py-3 font-mono-num font-bold text-orange-900">B${x.num}</td>
                      <td class="px-4 py-3 font-bold text-stone-900">${esc(x.answer)}</td>
                      <td class="px-4 py-3 text-stone-800">${esc(x.explainHy)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-stone-900 mb-3">4. Categorías gramaticales</h3>
            <div class="overflow-x-auto border border-[#dfc3a3] rounded-lg">
              <table class="w-full text-left text-base border-collapse">
                <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
                  <tr>
                    <th class="px-4 py-3 font-bold">Nº</th>
                    <th class="px-4 py-3 font-bold">Palabra</th>
                    <th class="px-4 py-3 font-bold">Respuesta</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#e7d1b6] bg-white">
                  ${d.simulacro.sec4Cats
                    .map(
                      (c) => `
                    <tr>
                      <td class="px-4 py-3 font-mono-num font-semibold">${c.num}</td>
                      <td class="px-4 py-3 font-bold text-orange-900">${esc(c.target)}</td>
                      <td class="px-4 py-3">${esCell(c.answer, c.answerHy)}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-stone-900 mb-3">5. Literatura</h3>
            <div class="space-y-3">
              ${d.simulacro.sec5Lit
                .map(
                  (l) => `
                <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
                  <div class="text-sm font-bold text-orange-900 mb-1">${l.num}. ${esc(l.es)}</div>
                  ${esBlock(l.answerEs, l.answerHy, { esClass: 'text-base text-stone-900', compact: true })}
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <div>
            <h3 class="text-lg font-bold text-stone-900 mb-3">6. Traducción del armenio al español</h3>
            <ol class="space-y-2.5 text-base">
              ${d.simulacro.sec6Trans
                .map((tr) => `<li class="p-3.5 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">${esBlock(`${tr.num}. ${tr.answerEs}`, tr.hy, { esClass: 'text-base text-stone-900 font-semibold', compact: true })}</li>`)
                .join('')}
            </ol>
          </div>
        </div>
      </details>
    </section>

    <!-- PARTE V: TRADUCCIÓN DEL TEXTO -->
    <section id="m3-parte5" class="mb-8">
      ${esBlock('PARTE V. TRADUCCIÓN DEL TEXTO DEL EXAMEN', 'ՔՆՆԱԿԱՆ ՏԵՔՍՏԻ ՀԱՅԵՐԵՆ ԹԱՐԳՄԱՆՈՒԹՅՈՒՆ', { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950 mb-2' })}
      ${renderFullHyTranslation(`Գրադարանը, որը կրկին սկսեց ժպտալ — ${d.simulacro.storyTitleEs}`, '', d.simulacro.paragraphs)}
    </section>

    <!-- PARTE VI: PREGUNTAS TÍPICAS + REPASO FINAL -->
    <section id="m3-parte6" class="mb-10 space-y-6">
      <div>
        ${esBlock(d.parte6.headingEs, d.parte6.headingHy, { tag: 'h2', esClass: 'font-display text-2xl sm:text-3xl font-semibold text-orange-950' })}
        <p class="text-base text-stone-700 mt-2">${esc(d.parte6.introHy)}</p>
      </div>

      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-base border-collapse">
            <thead class="bg-[#efe0cb] border-b border-[#d6b692] text-sm text-orange-950">
              <tr>
                <th class="px-5 py-3.5 font-bold">Pregunta en español / Հայերեն</th>
                <th class="px-5 py-3.5 font-bold">Cómo empezar la respuesta / Ինչպես սկսել պատասխանը</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e7d1b6] bg-white">
              ${d.parte6.typicalRows
                .map(
                  (r) => `
                <tr>
                  <td class="px-5 py-3.5">${esCell(r.qEs, r.qHy)}</td>
                  <td class="px-5 py-3.5 font-bold text-orange-900">${esc(r.startEs)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Respuesta completa vs insuficiente -->
      <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8 space-y-4">
        ${esBlock(d.parte6.completeAnswer.titleEs, d.parte6.completeAnswer.titleHy, { tag: 'h3', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
        <div class="p-4 bg-[#faf2e7] border border-[#dfc3a3] rounded-lg">
          <div class="text-xs font-mono-num font-bold text-orange-900 mb-1">PREGUNTA</div>
          ${esBlock(d.parte6.completeAnswer.qEs, d.parte6.completeAnswer.qHy, { esClass: 'text-lg font-bold text-stone-900', compact: true })}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-5 bg-red-50 border border-red-300 rounded-lg">
            <div class="text-sm font-bold text-red-800 mb-1">Respuesta insuficiente — Թերի պատասխան</div>
            ${esBlock(d.parte6.completeAnswer.badEs, d.parte6.completeAnswer.badHy, { esClass: 'text-base text-stone-900', compact: true })}
          </div>
          <div class="p-5 bg-emerald-50 border border-emerald-300 rounded-lg">
            <div class="text-sm font-bold text-emerald-800 mb-1">Respuesta completa — Լիարժեք պատասխան</div>
            ${esBlock(d.parte6.completeAnswer.goodEs, d.parte6.completeAnswer.goodHy, { esClass: 'text-base text-stone-900', compact: true })}
          </div>
        </div>
      </div>

      <!-- REPASO FINAL: 12 Preguntas rápidas -->
      <div id="m3-repaso" class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-6 sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e7d1b6]">
          <div>
            <div class="text-sm font-mono-num font-bold text-orange-900">REPASO FINAL — ՎԵՐՋՆԱԿԱՆ ԿՐԿՆՈՒԹՅՈՒՆ</div>
            <h3 class="font-display text-2xl font-semibold text-stone-900 mt-1">Preguntas rápidas — Արագ հարցեր</h3>
            <p class="text-sm text-stone-700 mt-0.5">Փորձենք ստուգել՝ աշակերտը կարողանո՞ւմ է արագ պատասխանել հիմնական հարցերին։</p>
          </div>
          <div class="font-mono-num text-base font-bold text-orange-900">${state.rapidIdx + 1} / ${d.parte6.quickReview.length}</div>
        </div>

        <div class="py-6">
          ${esBlock(rapidItem.qEs, rapidItem.qHy, { tag: 'h4', esClass: 'font-display text-2xl font-semibold text-stone-900' })}
          ${
            state.rapidAnsOpen
              ? `<div class="mt-4 p-5 bg-emerald-50 border border-emerald-400 rounded-lg text-base">
                  <div class="font-semibold text-emerald-950"><span class="font-mono-num text-sm font-bold text-emerald-700 mr-2">ES</span>${esc(rapidItem.aEs)}</div>
                  <div class="text-stone-800 mt-2.5 pt-2.5 border-t border-emerald-300/70"><span class="font-mono-num text-sm font-bold text-emerald-700 mr-2">HY</span>${esc(rapidItem.aHy)}</div>
                 </div>`
              : ''
          }
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#e7d1b6]">
          <button type="button" data-rapid-action="toggle" class="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg border border-orange-800 bg-[#f2dcc2] text-orange-950 hover:bg-[#e7c9a6] whitespace-nowrap shrink-0 cursor-pointer">
            ${state.rapidAnsOpen ? 'Թաքցնել պատասխանը · Ocultar respuesta' : 'Mostrar respuesta · Ցույց տալ պատասխանը'}
          </button>
          <div class="flex items-center gap-2.5">
            <button type="button" data-rapid-action="prev" class="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg border border-[#c99e72] bg-white text-stone-800 hover:bg-[#f7ece0] whitespace-nowrap shrink-0 cursor-pointer">
              Anterior
            </button>
            <button type="button" data-rapid-action="next" class="min-h-[44px] px-5 py-2 text-sm font-semibold rounded-lg bg-orange-800 text-white hover:bg-orange-900 whitespace-nowrap shrink-0 cursor-pointer">
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <!-- Teacher final tip -->
      <div class="bg-[#f5e7d5] border border-[#c79a6b] rounded-xl p-6 space-y-2.5 text-base text-orange-950">
        ${d.parte6.teacherTipHy.map((t) => `<p>${esc(t)}</p>`).join('')}
      </div>
    </section>
  `;
}

/* ============================================================================
   SIDEBAR NAVIGATION PER MODULE
============================================================================ */
const MODULE_TOCS = {
  exam1: [
    { href: '#m1-intro', label: 'Ներածություն · Resumen' },
    { href: '#m1-parte1', label: 'Մաս 1 · Փորձնական քննություն' },
    { href: '#m1-parte2', label: 'Մաս 2 · Տեսություն (A–F)' },
    { href: '#m1-parte3', label: 'Մաս 3 · Կարճ տեքստեր (1–3)' },
    { href: '#m1-parte4', label: 'Մաս 4 · Պատասխաններ' },
    { href: '#m1-parte5', label: 'Մաս 5 · Բանավոր վարժություն' },
  ],
  resumen: [
    { href: '#m2-intro', label: 'Ներածություն · Ամփոփում' },
    { href: '#m2-sec1', label: '1. Տեսություն և 5 քայլ' },
    { href: '#m2-sec2', label: '2. Օրինակ · La mochila de Pablo' },
    { href: '#m2-sec3', label: '3. Քննական տեքստ · El partido' },
    { href: '#m2-sec4', label: '4. Վարժություններ (1–5)' },
    { href: '#m2-sec5', label: '5. Կարճ տեքստեր (1–2)' },
    { href: '#m2-sec6', label: '6. Օրինակելի պատասխաններ' },
    { href: '#m2-sec7', label: '7. Ինչպես վարժվել' },
  ],
  completo: [
    { href: '#m3-intro', label: 'Թեմաների ցանկ' },
    { href: '#m3-tema1', label: 'Tema 1 · Գրական սեռեր' },
    { href: '#m3-tema2', label: 'Tema 2 · Culta / Popular' },
    { href: '#m3-tema3', label: 'Tema 3 · Ռոմանս, առասպել' },
    { href: '#m3-tema4', label: 'Tema 4 · Արձակ և չափածո' },
    { href: '#m3-tema5', label: 'Tema 5 · Արտահայտչամիջոցներ' },
    { href: '#m3-tema6', label: 'Tema 6 · Լեզվի գործառույթներ' },
    { href: '#m3-tema7', label: 'Tema 7 · Նախադասության տեսակներ' },
    { href: '#m3-tema8', label: 'Tema 8 · Խոսքի մասեր' },
    { href: '#m3-parte2', label: 'Մաս II · Քերականական վարժ.' },
    { href: '#m3-parte3', label: 'Մաս III · Քննություն (30 մ.)' },
    { href: '#m3-parte4', label: 'Մաս IV · Քննության պատասխաններ' },
    { href: '#m3-parte5', label: 'Մաս V · Տեքստի թարգմանություն' },
    { href: '#m3-parte6', label: 'Մաս VI · Հարցեր և Repaso' },
  ],
};

/* ============================================================================
   MAIN RENDER
============================================================================ */
function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  document.body.classList.toggle('show-all-hy', state.showAllHy);

  const toc = MODULE_TOCS[state.activeModule] || [];
  let contentHtml = '';
  if (state.activeModule === 'exam1') contentHtml = renderModule1();
  else if (state.activeModule === 'resumen') contentHtml = renderModule2();
  else contentHtml = renderModule3();

  root.innerHTML = `
    <!-- Top Bar (3-zone contract, rich saturated orange-amber) -->
    <header class="sticky top-0 z-40 bg-gradient-to-r from-orange-900 via-orange-800 to-orange-900 border-b-2 border-orange-950 shadow-sm">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        <!-- Zone 1: Single-line Wordmark -->
        <a href="#top" data-switch-module="exam1" class="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          Lengua 1.º ESO
        </a>

        <!-- Zone 2: Primary Nav Links -->
        <nav class="flex items-center gap-5 sm:gap-8 overflow-x-auto no-scrollbar" aria-label="Հիմնական բաժիններ">
          ${[
            { id: 'exam1', label: 'Examen 1' },
            { id: 'resumen', label: 'El Resumen' },
            { id: 'completo', label: 'Curso Completo' },
          ]
            .map(
              (nav) => `
            <button
              type="button"
              data-switch-module="${nav.id}"
              class="h-16 inline-flex items-center text-base font-semibold border-b-3 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                state.activeModule === nav.id
                  ? 'border-orange-300 text-white'
                  : 'border-transparent text-orange-100 hover:text-white'
              }"
            >
              ${nav.label}
            </button>
          `
            )
            .join('')}
        </nav>

        <!-- Zone 3: 1 Primary Action -->
        <div class="shrink-0">
          <button
            type="button"
            data-toggle-all-hy
            class="min-h-[42px] px-4 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              state.showAllHy
                ? 'bg-orange-950 text-orange-100 hover:bg-stone-900'
                : 'bg-[#f8ead7] text-orange-950 hover:bg-[#f1dabf]'
            }"
          >
            ${state.showAllHy ? 'Միայն կլիկով · HY' : 'Բոլոր թարգմանությունները'}
          </button>
        </div>
      </div>
    </header>

    <!-- Helper Instruction Bar (below top bar) -->
    <div id="top" class="bg-[#eedec8] border-b border-[#d4b48c]">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-orange-950">
        <span>Սեղմի՛ր ցանկացած իսպաներեն տեքստի վրա (<strong class="font-mono-num">HY</strong>)՝ հայերեն թարգմանությունը բացելու համար։ Յուրաքանչյուր հարց ունի առանձին «Ցույց տալ պատասխանը» կոճակ։</span>
        <span class="font-mono-num font-bold text-orange-900">ES → HY · 1.º ESO</span>
      </div>
    </div>

    <!-- Main Two-Zone Workspace -->
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-7 sm:py-9 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10 items-start">
      <!-- Left Sidebar TOC -->
      <aside class="mb-6 lg:mb-0 lg:sticky lg:top-24">
        <div class="bg-[#fffdf9] border border-[#d6b692] rounded-xl p-4">
          <div class="text-sm font-mono-num font-bold text-orange-900 px-2 pb-2.5 mb-2 border-b border-[#e7d1b6]">
            ԲՈՎԱՆԴԱԿՈՒԹՅՈՒՆ · ÍNDICE
          </div>
          <nav class="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">
            ${toc
              .map(
                (item) => `
              <a href="${item.href}" class="px-3 py-2.5 text-sm font-semibold text-stone-800 hover:text-orange-900 hover:bg-[#f0dfc9] rounded-lg transition-colors whitespace-nowrap lg:whitespace-normal shrink-0">
                ${esc(item.label)}
              </a>
            `
              )
              .join('')}
          </nav>
        </div>
      </aside>

      <!-- Main Study Content -->
      <main class="min-w-0 max-w-[940px]">
        ${contentHtml}
      </main>
    </div>

    <footer class="border-t border-[#d4b48c] bg-[#ecdbc5] mt-12">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-sm font-medium text-orange-950">
        <span>Lengua Castellana y Literatura · 1.º ESO · Հայերեն–Իսպաներեն ուսումնական ձեռնարկ</span>
        <button type="button" data-clear-all-storage class="text-orange-900 hover:text-red-800 font-semibold underline underline-offset-4 cursor-pointer">
          Մաքրել իմ գրած բոլոր պատասխանները
        </button>
      </div>
    </footer>
  `;
}

/* ============================================================================
   EVENT DELEGATION (PURE VANILLA JS)
============================================================================ */
function toggleHyElement(target) {
  const block = target.closest('[data-toggle-hy]');
  if (block) {
    const rev = block.querySelector(':scope > .hy-reveal');
    if (rev) {
      const open = rev.classList.toggle('is-visible');
      block.classList.toggle('is-open', open);
      block.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    return true;
  }

  const inline = target.closest('[data-toggle-hy-inline]');
  if (inline) {
    const rev = inline.parentElement?.querySelector('.hy-inline-reveal');
    if (rev) {
      const open = rev.classList.toggle('is-visible');
      inline.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    return true;
  }
  return false;
}

document.addEventListener('click', (e) => {
  const target = e.target;
  if (!(target instanceof Element)) return;

  // Switch top-level module
  const modBtn = target.closest('[data-switch-module]');
  if (modBtn) {
    e.preventDefault();
    const mod = modBtn.getAttribute('data-switch-module');
    if (mod && mod !== state.activeModule) {
      state.activeModule = mod;
      saveState();
      renderApp();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  // Toggle global Armenian translations
  if (target.closest('[data-toggle-all-hy]')) {
    state.showAllHy = !state.showAllHy;
    renderApp();
    showToast(state.showAllHy ? 'Բոլոր հայերեն թարգմանությունները բաց են' : 'Կլիկով թարգմանության ռեժիմ');
    return;
  }

  // Toggle individual question Answer
  const ansBtn = target.closest('[data-toggle-answer]');
  if (ansBtn) {
    const id = ansBtn.getAttribute('data-toggle-answer');
    const panel = document.getElementById(`ans-${id}`);
    const isOpen = !state.openAnswers[id];
    state.openAnswers[id] = isOpen;
    if (panel) panel.classList.toggle('is-visible', isOpen);
    ansBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    ansBtn.innerHTML = `<span>${isOpen ? 'Թաքցնել պատասխանը · Ocultar respuesta' : 'Ցույց տալ պատասխանը · Ver respuesta'}</span>`;
    ansBtn.className = `inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      isOpen
        ? 'bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800'
        : 'bg-[#fbf3e8] text-orange-900 border-[#bd6b3a] hover:bg-[#f3e1ca] hover:border-orange-900'
    }`;
    return;
  }

  // Interactive choice quiz click
  const quizOpt = target.closest('[data-quiz-key]');
  if (quizOpt) {
    const key = quizOpt.getAttribute('data-quiz-key');
    const item = quizOpt.getAttribute('data-quiz-item');
    const val = quizOpt.getAttribute('data-quiz-val');
    if (!state.quizzes[key]) state.quizzes[key] = {};
    state.quizzes[key][item] = val;
    saveState();
    renderApp();
    return;
  }

  // Reset quiz
  const resetQuizBtn = target.closest('[data-reset-quiz]');
  if (resetQuizBtn) {
    const key = resetQuizBtn.getAttribute('data-reset-quiz');
    state.quizzes[key] = {};
    saveState();
    renderApp();
    showToast('Վարժությունը զրոյացվեց · Reiniciado');
    return;
  }

  // Reset checklist
  const resetChkBtn = target.closest('[data-reset-checks]');
  if (resetChkBtn) {
    const scope = resetChkBtn.getAttribute('data-reset-checks');
    const list = scope === 'm1' ? EXAM1_DATA.parte5.checklist : RESUMEN_DATA.sec4.ex5Checks;
    list.forEach((c) => {
      delete state.checks[c.id];
    });
    saveState();
    renderApp();
    showToast('Ստուգաթերթը մաքրվեց · Reiniciado');
    return;
  }

  // Oral flashcards
  const oralBtn = target.closest('[data-oral-action]');
  if (oralBtn) {
    const act = oralBtn.getAttribute('data-oral-action');
    const len = EXAM1_DATA.parte5.oralQuestions.length;
    if (act === 'help') state.oralHelpOpen = !state.oralHelpOpen;
    else if (act === 'answer') state.oralAnsOpen = !state.oralAnsOpen;
    else if (act === 'next') {
      state.oralIdx = (state.oralIdx + 1) % len;
      state.oralHelpOpen = false;
      state.oralAnsOpen = false;
    } else if (act === 'prev') {
      state.oralIdx = (state.oralIdx - 1 + len) % len;
      state.oralHelpOpen = false;
      state.oralAnsOpen = false;
    }
    renderApp();
    return;
  }

  // Rapid review flashcards
  const rapidBtn = target.closest('[data-rapid-action]');
  if (rapidBtn) {
    const act = rapidBtn.getAttribute('data-rapid-action');
    const len = COMPLETO_DATA.parte6.quickReview.length;
    if (act === 'toggle') state.rapidAnsOpen = !state.rapidAnsOpen;
    else if (act === 'next') {
      state.rapidIdx = (state.rapidIdx + 1) % len;
      state.rapidAnsOpen = false;
    } else if (act === 'prev') {
      state.rapidIdx = (state.rapidIdx - 1 + len) % len;
      state.rapidAnsOpen = false;
    }
    renderApp();
    return;
  }

  // Copy single input
  const copyInputBtn = target.closest('[data-copy-input]');
  if (copyInputBtn) {
    const id = copyInputBtn.getAttribute('data-copy-input');
    const text = (state.inputs[id] || '').trim();
    if (!text) {
      showToast('Նախ գրի՛ր տեքստը · Escribe algo primero');
      return;
    }
    navigator.clipboard?.writeText(text).then(
      () => showToast('Պատճենվեց · Copiado al portapapeles'),
      () => showToast('Չհաջողվեց պատճենել')
    );
    return;
  }

  // Copy Esquema responses
  if (target.closest('[data-copy-esquema]')) {
    const lines = RESUMEN_DATA.sec4.ex3Fields.map((f) => `${f.labelEs}\n${state.inputs[f.id] || '—'}`);
    navigator.clipboard?.writeText(lines.join('\n\n')).then(
      () => showToast('Աղյուսակի պատասխանները պատճենվեցին · Copiado'),
      () => showToast('Չհաջողվեց պատճենել')
    );
    return;
  }

  // Clear all saved student data
  if (target.closest('[data-clear-all-storage]')) {
    state.inputs = {};
    state.checks = {};
    state.quizzes = { cultaPopular: {}, impSec: {}, genLit: {}, funcLang: {}, catGram: {} };
    state.openAnswers = {};
    saveState();
    renderApp();
    showToast('Բոլոր գրած պատասխանները մաքրվեցին');
    return;
  }

  // Click on Spanish text -> toggle Armenian translation
  if (toggleHyElement(target)) {
    return;
  }
});

// Keyboard support for clickable Spanish text
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const target = e.target;
  if (!(target instanceof Element)) return;
  if (target.matches('[data-toggle-hy], [data-toggle-hy-inline]')) {
    e.preventDefault();
    toggleHyElement(target);
  }
});

// Inputs & Textareas live persistence + live word counters
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  const id = el.getAttribute('data-input-id');
  if (!id) return;
  state.inputs[id] = el.value;
  saveState();

  const wcTarget = el.getAttribute('data-wordcount-target');
  if (wcTarget) {
    const wcEl = document.getElementById(wcTarget);
    if (wcEl) {
      const count = countWords(el.value);
      if (id === 'res-ex4-summary') {
        wcEl.textContent = `${count} palabras · Objetivo: 45–65 palabras`;
        wcEl.className = `font-mono-num text-sm ${
          count === 0 ? 'text-stone-600' : count >= 45 && count <= 65 ? 'text-emerald-700 font-bold' : 'text-orange-900 font-bold'
        }`;
      } else {
        wcEl.textContent = `${count} palabras`;
      }
    }
  }
});

// Checkboxes & Dropdown selects
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el instanceof HTMLInputElement && el.hasAttribute('data-check-id')) {
    const id = el.getAttribute('data-check-id');
    state.checks[id] = el.checked;
    saveState();
    renderApp();
    return;
  }

  if (el instanceof HTMLSelectElement && el.hasAttribute('data-cat-select')) {
    const id = el.getAttribute('data-cat-select');
    if (!state.quizzes.catGram) state.quizzes.catGram = {};
    state.quizzes.catGram[id] = el.value;
    saveState();
    renderApp();
  }
});

loadState();
renderApp();
