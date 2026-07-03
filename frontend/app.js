import {
  getWeatherKeyFromPercentage,
  getWeatherKeyFromRubricItem,
  weatherMarks
} from "./weather.js";

const clientIdStorageKey = "hotelPromptPractice.clientId.v1";
const historyLimit = 24;
const modeDescriptionFallbacks = {
  "zero-shot": "例を入れず、目的・背景・制約・出力形式を整理してAIに依頼します。",
  "few-shot": "良い例を示し、同じ型やトーンでAIに新しい出力を作らせます。"
};

const elements = {
  startTypeCard: document.getElementById("startTypeCard"),
  startExerciseCard: document.getElementById("startExerciseCard"),
  startContinueCard: document.getElementById("startContinueCard"),
  zeroTab: document.getElementById("zeroTab"),
  fewTab: document.getElementById("fewTab"),
  zeroTabDescription: document.getElementById("zeroTabDescription"),
  fewTabDescription: document.getElementById("fewTabDescription"),
  selectionType: document.getElementById("selectionType"),
  selectionExercise: document.getElementById("selectionExercise"),
  clearHistoryButton: document.getElementById("clearHistoryButton"),
  exercisePanel: document.querySelector(".exercise-panel"),
  exerciseTypeLabel: document.getElementById("exerciseTypeLabel"),
  exerciseTitle: document.getElementById("exerciseTitle"),
  exerciseFocus: document.getElementById("exerciseFocus"),
  exerciseSelect: document.getElementById("exerciseSelect"),
  promptScenario: document.getElementById("promptScenario"),
  referenceList: document.getElementById("referenceList"),
  sourceText: document.getElementById("sourceText"),
  examplesSection: document.getElementById("examplesSection"),
  examplesList: document.getElementById("examplesList"),
  principleList: document.getElementById("principleList"),
  checklist: document.getElementById("checklist"),
  badExample: document.getElementById("badExample"),
  hintText: document.getElementById("hintText"),
  promptInput: document.getElementById("promptInput"),
  useStarterButton: document.getElementById("useStarterButton"),
  runButton: document.getElementById("runButton"),
  resultSection: document.getElementById("resultSection"),
  statusPill: document.getElementById("statusPill"),
  assistantOutput: document.getElementById("assistantOutput"),
  overallWeatherMark: document.getElementById("overallWeatherMark"),
  bestPoint: document.getElementById("bestPoint"),
  priorityFix: document.getElementById("priorityFix"),
  revisionHint: document.getElementById("revisionHint"),
  scoreSummary: document.getElementById("scoreSummary"),
  rubricFeedback: document.getElementById("rubricFeedback"),
  reflectionInput: document.getElementById("reflectionInput"),
  exportPdfButton: document.getElementById("exportPdfButton")
};

const state = {
  clientId: getOrCreateClientId(),
  config: null,
  exerciseGroups: [],
  activeExerciseType: "zero-shot",
  activeExerciseId: "",
  attempts: [],
  promptDrafts: {},
  reflectionNotes: {},
  currentAttempt: null,
  selectedModel: "",
  isRunning: false
};

let saveTimer = null;
const selectionHighlightMs = 850;
const selectionHighlightTimers = new WeakMap();

function getOrCreateClientId() {
  const existingClientId = localStorage.getItem(clientIdStorageKey);
  if (existingClientId) {
    return existingClientId;
  }

  const generatedClientId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(clientIdStorageKey, generatedClientId);
  return generatedClientId;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>");
}

function renderMarkdownOutput(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*+]\s+/, ""));
        index += 1;
      }
      blocks.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(`<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push(`<h4>${renderInlineMarkdown(headingMatch[2])}</h4>`);
      index += 1;
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^[-*+]\s+/.test(lines[index].trim()) &&
      !/^\d+[.)]\s+/.test(lines[index].trim()) &&
      !/^#{1,4}\s+/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(" "))}</p>`);
  }

  return blocks.join("") || '<p class="empty-text">AIの回答はまだありません。</p>';
}

function createWeatherBadge(key, { variant = "overall", prefix = "" } = {}) {
  const weather = weatherMarks[key];
  if (!weather) return null;

  const badge = document.createElement("span");
  badge.className = `weather-badge weather-badge-${variant} weather-badge-${key}`;
  badge.title = weather.message;
  badge.setAttribute(
    "aria-label",
    `${prefix ? `${prefix}: ` : ""}${weather.label}、${weather.message}`
  );

  const image = document.createElement("img");
  image.src = weather.src;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.textContent = variant === "overall" ? `${weather.label} - ${weather.message}` : weather.label;

  badge.append(image, text);
  return badge;
}

function renderOverallWeatherMark(evaluation) {
  elements.overallWeatherMark.replaceChildren();

  const fallbackPercentage =
    Number.isFinite(Number(evaluation?.total)) &&
    Number.isFinite(Number(evaluation?.max)) &&
    Number(evaluation.max) > 0
      ? Math.round((Number(evaluation.total) / Number(evaluation.max)) * 100)
      : null;
  const weatherKey = getWeatherKeyFromPercentage(evaluation?.percentage ?? fallbackPercentage);
  const mark = createWeatherBadge(weatherKey, {
    variant: "overall",
    prefix: "全体"
  });

  if (!mark) {
    elements.overallWeatherMark.hidden = true;
    return;
  }

  elements.overallWeatherMark.hidden = false;
  elements.overallWeatherMark.appendChild(mark);
}

function clearOverallWeatherMark() {
  elements.overallWeatherMark.replaceChildren();
  elements.overallWeatherMark.hidden = true;
}

function setStatus(text) {
  elements.statusPill.textContent = text;
}

function setRunning(isRunning) {
  state.isRunning = isRunning;
  for (const control of [
    elements.zeroTab,
    elements.fewTab,
    elements.exerciseSelect,
    elements.promptInput,
    elements.useStarterButton,
    elements.runButton,
    elements.clearHistoryButton
  ]) {
    control.disabled = isRunning;
  }

  elements.runButton.textContent = isRunning ? "実行中..." : "このプロンプトで実行";

  if (isRunning) {
    elements.resultSection.hidden = false;
    elements.assistantOutput.innerHTML =
      '<p class="loading">AI出力と改善コメントを作成しています...</p>';
    setStatus("実行中");
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function getHistoryEndpoint() {
  return `/api/history?clientId=${encodeURIComponent(state.clientId)}`;
}

function getCurrentGroup() {
  return state.exerciseGroups.find((group) => group.id === state.activeExerciseType) || null;
}

function getGroupDescription(type) {
  const group = state.exerciseGroups.find((item) => item.id === type);
  return group?.description || modeDescriptionFallbacks[type] || "";
}

function getCurrentExercise() {
  const group = getCurrentGroup();
  return group?.exercises.find((exercise) => exercise.id === state.activeExerciseId) || null;
}

function renderSelectionSummary() {
  const group = getCurrentGroup();
  const exercise = getCurrentExercise();
  elements.selectionType.textContent = group?.label || "";
  elements.selectionExercise.textContent = exercise?.shortTitle || exercise?.title || "";
}

function highlightSelectionChange(targets) {
  for (const element of targets.filter(Boolean)) {
    const timer = selectionHighlightTimers.get(element);
    if (timer) {
      window.clearTimeout(timer);
    }

    element.classList.remove("selection-updated");
    void element.offsetWidth;
    element.classList.add("selection-updated");
    selectionHighlightTimers.set(
      element,
      window.setTimeout(() => {
        element.classList.remove("selection-updated");
        selectionHighlightTimers.delete(element);
      }, selectionHighlightMs)
    );
  }
}

function getDraftKey(type = state.activeExerciseType, id = state.activeExerciseId) {
  return `${type}:${id}`;
}

function syncPromptToDraft() {
  if (!state.activeExerciseId) return;
  state.promptDrafts[getDraftKey()] = elements.promptInput.value;
}

function syncReflectionToDraft() {
  if (!state.activeExerciseId) return;
  state.reflectionNotes[getDraftKey()] = elements.reflectionInput.value;
}

function loadPromptForActive() {
  const draft = state.promptDrafts[getDraftKey()];
  elements.promptInput.value = typeof draft === "string" ? draft : "";
}

function loadReflectionForActive() {
  const reflection = state.reflectionNotes[getDraftKey()];
  elements.reflectionInput.value = typeof reflection === "string" ? reflection : "";
}

function findLatestAttempt(type = state.activeExerciseType, id = state.activeExerciseId) {
  return (
    state.attempts.find(
      (attempt) => attempt.exerciseType === type && attempt.exerciseId === id
    ) || null
  );
}

function scheduleSaveHistory() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveHistory();
  }, 450);
}

async function loadHistory() {
  try {
    const data = await fetchJson(getHistoryEndpoint());
    const groupIds = new Set(state.exerciseGroups.map((group) => group.id));
    state.activeExerciseType = groupIds.has(data.activeExerciseType)
      ? data.activeExerciseType
      : state.exerciseGroups[0]?.id || "zero-shot";
    const group = getCurrentGroup();
    state.activeExerciseId = group?.exercises.some((exercise) => exercise.id === data.activeExerciseId)
      ? data.activeExerciseId
      : group?.exercises[0]?.id || "";
    state.attempts = Array.isArray(data.attempts) ? data.attempts : [];
    state.promptDrafts =
      data.promptDrafts && typeof data.promptDrafts === "object" ? data.promptDrafts : {};
    state.reflectionNotes =
      data.reflectionNotes && typeof data.reflectionNotes === "object" ? data.reflectionNotes : {};
  } catch {
    state.activeExerciseType = state.exerciseGroups[0]?.id || "zero-shot";
    state.activeExerciseId = getCurrentGroup()?.exercises[0]?.id || "";
    state.attempts = [];
    state.promptDrafts = {};
    state.reflectionNotes = {};
  }
}

async function saveHistory() {
  await fetchJson(getHistoryEndpoint(), {
    method: "PUT",
    body: JSON.stringify({
      activeExerciseType: state.activeExerciseType,
      activeExerciseId: state.activeExerciseId,
      attempts: state.attempts.slice(0, historyLimit),
      promptDrafts: state.promptDrafts,
      reflectionNotes: state.reflectionNotes
    })
  }).catch((error) => {
    console.error(error);
  });
}

function renderTabs() {
  const isFewShot = state.activeExerciseType === "few-shot";
  elements.zeroTab.classList.toggle("active", !isFewShot);
  elements.fewTab.classList.toggle("active", isFewShot);
  elements.zeroTab.setAttribute("aria-selected", String(!isFewShot));
  elements.fewTab.setAttribute("aria-selected", String(isFewShot));
  elements.zeroTabDescription.textContent = getGroupDescription("zero-shot");
  elements.fewTabDescription.textContent = getGroupDescription("few-shot");
}

function renderExerciseSelect() {
  const group = getCurrentGroup();
  elements.exerciseSelect.replaceChildren();

  for (const exercise of group?.exercises || []) {
    const option = document.createElement("option");
    option.value = exercise.id;
    option.textContent = exercise.shortTitle || exercise.title;
    option.selected = exercise.id === state.activeExerciseId;
    elements.exerciseSelect.appendChild(option);
  }
}

function renderReferenceInfo(exercise) {
  const items = Array.isArray(exercise.referenceItems) ? exercise.referenceItems.filter(Boolean) : [];
  elements.referenceList.replaceChildren();

  if (!items.length) {
    elements.referenceList.hidden = true;
    return;
  }

  for (const item of items) {
    const block = document.createElement("div");
    block.className = "reference-item";

    const label = document.createElement("p");
    label.className = "reference-item-label";
    label.textContent = item.label || "";

    const value = document.createElement("p");
    value.className = "reference-item-value";
    value.textContent = item.value || "";

    block.append(label, value);
    elements.referenceList.appendChild(block);
  }
  elements.referenceList.hidden = false;
}

function renderExamples(exercise) {
  const examples = Array.isArray(exercise.examples) ? exercise.examples.filter(Boolean) : [];
  elements.examplesList.replaceChildren();

  if (!examples.length) {
    elements.examplesSection.hidden = true;
    return;
  }

  for (const example of examples) {
    const block = document.createElement("article");
    block.className = "example-item";

    const label = document.createElement("p");
    label.className = "example-label";
    label.textContent = example.label || "例";

    const input = document.createElement("p");
    input.className = "example-copy";
    input.textContent = `入力: ${example.input || ""}`;

    const output = document.createElement("p");
    output.className = "example-copy strong";
    output.textContent = `出力: ${example.output || ""}`;

    block.append(label, input, output);
    elements.examplesList.appendChild(block);
  }

  elements.examplesSection.hidden = false;
}

function renderPrinciples(principles) {
  elements.principleList.replaceChildren();
  for (const principle of principles || []) {
    const chip = document.createElement("span");
    chip.className = "principle-chip";
    chip.textContent = principle;
    elements.principleList.appendChild(chip);
  }
}

function renderList(container, items) {
  container.replaceChildren();
  for (const text of items || []) {
    const item = document.createElement("li");
    item.textContent = text;
    container.appendChild(item);
  }
}

function renderExerciseContent() {
  const group = getCurrentGroup();
  const exercise = getCurrentExercise();
  if (!group || !exercise) return;

  elements.exerciseTypeLabel.textContent = group.label;
  elements.exerciseTitle.textContent = exercise.title;
  elements.exerciseFocus.textContent = exercise.focus || group.description || "";
  elements.promptScenario.textContent = exercise.promptScenario || "";
  elements.sourceText.textContent = exercise.sourceText || "";
  elements.badExample.textContent = exercise.badExample || "";
  elements.hintText.textContent = exercise.hint || "";

  renderExerciseSelect();
  renderSelectionSummary();
  renderReferenceInfo(exercise);
  renderExamples(exercise);
  renderPrinciples(exercise.principles || []);
  renderList(elements.checklist, exercise.checklist || []);
}

function renderRubricFeedback(items) {
  elements.rubricFeedback.replaceChildren();
  const feedbackItems = (Array.isArray(items) ? items : []).filter(Boolean);

  if (!feedbackItems.length) {
    const empty = document.createElement("p");
    empty.className = "empty-text";
    empty.textContent = "観点別コメントはまだありません。";
    elements.rubricFeedback.appendChild(empty);
    return;
  }

  for (const item of feedbackItems) {
    const block = document.createElement("section");
    block.className = "rubric-item";

    const head = document.createElement("div");
    head.className = "rubric-item-head";

    const title = document.createElement("p");
    title.className = "rubric-title";
    title.textContent = item.label || "観点";
    head.appendChild(title);

    const weatherMark = createWeatherBadge(getWeatherKeyFromRubricItem(item), {
      variant: "item",
      prefix: item.label || "観点"
    });
    if (weatherMark) {
      head.appendChild(weatherMark);
    }

    const reason = document.createElement("p");
    reason.className = "rubric-copy";
    reason.textContent = `現状: ${item.reason || ""}`;

    const advice = document.createElement("p");
    advice.className = "rubric-copy strong";
    advice.textContent = `改善: ${item.advice || ""}`;

    block.append(head, reason, advice);
    elements.rubricFeedback.appendChild(block);
  }
}

function renderFeedback() {
  const attempt = state.currentAttempt;

  if (!attempt) {
    elements.resultSection.hidden = true;
    clearOverallWeatherMark();
    elements.assistantOutput.innerHTML = "";
    renderRubricFeedback([]);
    return;
  }

  elements.resultSection.hidden = false;
  elements.assistantOutput.innerHTML = renderMarkdownOutput(attempt.assistantReply || "");

  if (attempt.evaluationError || !attempt.evaluation) {
    clearOverallWeatherMark();
    elements.bestPoint.textContent = "AI出力は表示されています。";
    elements.priorityFix.textContent = "採点だけ再実行してください。";
    elements.revisionHint.textContent =
      attempt.revisionHint || "評価に失敗したため再実行してください。";
    elements.scoreSummary.textContent = "評価に失敗したため、少し時間を置いて再実行してください。";
    renderRubricFeedback([]);
    return;
  }

  renderOverallWeatherMark(attempt.evaluation);
  elements.bestPoint.textContent =
    attempt.evaluation.bestPoint || "ホテルの場面を意識して書けています。";
  elements.priorityFix.textContent =
    attempt.evaluation.priorityFix || "不足している条件を1つ追記してください。";
  elements.revisionHint.textContent =
    attempt.evaluation.revisionHint || attempt.revisionHint || "修正して再実行してください。";
  elements.scoreSummary.textContent = attempt.evaluation.summary || "";
  renderRubricFeedback(attempt.evaluation.items || []);
}

function renderAll() {
  renderTabs();
  renderExerciseContent();
  state.currentAttempt = findLatestAttempt();
  loadReflectionForActive();
  renderFeedback();
}

function switchExerciseType(type) {
  if (state.activeExerciseType === type || state.isRunning) return;

  syncPromptToDraft();
  syncReflectionToDraft();
  state.activeExerciseType = type;
  const group = getCurrentGroup();
  state.activeExerciseId = group?.exercises[0]?.id || "";
  loadPromptForActive();
  renderAll();
  highlightSelectionChange([
    elements.startTypeCard,
    elements.startExerciseCard,
    elements.startContinueCard,
    elements.exercisePanel
  ]);
  scheduleSaveHistory();
}

function switchExercise(exerciseId) {
  if (state.activeExerciseId === exerciseId || state.isRunning) return;

  syncPromptToDraft();
  syncReflectionToDraft();
  state.activeExerciseId = exerciseId;
  loadPromptForActive();
  renderAll();
  highlightSelectionChange([
    elements.startExerciseCard,
    elements.startContinueCard,
    elements.exercisePanel
  ]);
  scheduleSaveHistory();
}

async function runAttempt() {
  const prompt = elements.promptInput.value.trim();

  if (!prompt) {
    setStatus("プロンプト欄に入力してください");
    return;
  }

  syncPromptToDraft();
  syncReflectionToDraft();
  setRunning(true);
  elements.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const data = await fetchJson("/api/attempts", {
      method: "POST",
      body: JSON.stringify({
        exerciseType: state.activeExerciseType,
        exerciseId: state.activeExerciseId,
        prompt,
        model: state.selectedModel || undefined
      })
    });

    state.currentAttempt = data;
    state.attempts = [data, ...state.attempts.filter((attempt) => attempt.id !== data.id)].slice(
      0,
      historyLimit
    );
    await saveHistory();
    renderFeedback();
    setStatus(data.evaluationError ? "評価失敗" : "完了");
  } catch (error) {
    console.error(error);
    elements.resultSection.hidden = false;
    elements.assistantOutput.innerHTML = `<p class="empty-text">${escapeHtml(
      `実行に失敗しました: ${error.message}`
    )}</p>`;
    clearOverallWeatherMark();
    setStatus("エラー");
  } finally {
    setRunning(false);
  }
}

function getExerciseTitle(attempt = state.currentAttempt) {
  const group = state.exerciseGroups.find((item) => item.id === attempt?.exerciseType);
  const exercise = group?.exercises.find((item) => item.id === attempt?.exerciseId);
  return exercise?.title || "ホテルプロンプト練習";
}

function getReportTypeLabel(attempt = state.currentAttempt) {
  return attempt?.exerciseType === "few-shot" ? "Few-Shot" : "Zero-Shot";
}

function getCurrentReportData() {
  const attempt = state.currentAttempt;
  if (!attempt) return null;

  const evaluation = attempt.evaluation && typeof attempt.evaluation === "object" ? attempt.evaluation : {};
  return {
    exportedAt: new Date().toLocaleString("ja-JP"),
    exerciseType: getReportTypeLabel(attempt),
    title: getExerciseTitle(attempt),
    prompt: attempt.prompt || "",
    assistantReply: attempt.assistantReply || "",
    bestPoint: evaluation.bestPoint || "",
    priorityFix: evaluation.priorityFix || "",
    summary: evaluation.summary || "",
    revisionHint: evaluation.revisionHint || attempt.revisionHint || "",
    reflection: state.reflectionNotes[getDraftKey(attempt.exerciseType, attempt.exerciseId)] || "",
    items: Array.isArray(evaluation.items) ? evaluation.items : []
  };
}

function reportTextBlock(value) {
  return `<div class="print-text-block">${escapeHtml(value || "（なし）")}</div>`;
}

function buildPrintReportHtml(report) {
  const itemMarkup = report.items.length
    ? report.items
        .map(
          (item, index) => `
            <section class="print-card">
              <h3>${index + 1}. ${escapeHtml(item.label || "観点")}</h3>
              <p><strong>現状</strong></p>
              ${reportTextBlock(item.reason)}
              <p><strong>改善</strong></p>
              ${reportTextBlock(item.advice)}
            </section>
          `
        )
        .join("")
    : "<p>評価コメントはありません。</p>";

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(report.title)} - ホテルプロンプト練習</title>
    <style>
      body { margin: 0; color: #172126; font-family: "Noto Sans JP", "Yu Gothic", "Meiryo", sans-serif; line-height: 1.7; }
      main { max-width: 900px; margin: 0 auto; padding: 28px; }
      h1 { margin: 0 0 6px; font-size: 24px; }
      h2 { margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #d8dee6; font-size: 18px; }
      h3 { margin: 0 0 8px; font-size: 15px; }
      .print-meta { margin: 0; color: #5d6875; font-size: 12px; }
      .print-text-block, .print-card { border: 1px solid #d8dee6; border-radius: 8px; background: #fafbfc; }
      .print-text-block { padding: 12px; white-space: pre-wrap; word-break: break-word; }
      .print-card { break-inside: avoid; margin: 10px 0; padding: 12px; }
      .print-card p { margin: 8px 0 4px; }
      @media print { main { padding: 0; } }
    </style>
  </head>
  <body>
    <main>
      <h1>ホテルプロンプト練習 書き出し</h1>
      <p class="print-meta">書き出し日時: ${escapeHtml(report.exportedAt)}</p>
      <p class="print-meta">練習: ${escapeHtml(report.exerciseType)} / ${escapeHtml(report.title)}</p>

      <h2>プロンプト</h2>
      ${reportTextBlock(report.prompt)}

      <h2>AIの回答</h2>
      ${reportTextBlock(report.assistantReply)}

      <h2>改善コメント</h2>
      <section class="print-card">
        <p><strong>良かった点</strong></p>
        ${reportTextBlock(report.bestPoint)}
        <p><strong>次に直す1点</strong></p>
        ${reportTextBlock(report.priorityFix)}
        <p><strong>修正ヒント</strong></p>
        ${reportTextBlock(report.revisionHint)}
        <p><strong>サマリー</strong></p>
        ${reportTextBlock(report.summary)}
      </section>

      <h2>ふり返り</h2>
      ${reportTextBlock(report.reflection)}

      <h2>観点別コメント</h2>
      ${itemMarkup}
    </main>
  </body>
</html>`;
}

function getRequiredCurrentReport() {
  syncReflectionToDraft();
  const report = getCurrentReportData();
  if (!report) {
    setStatus("書き出す結果がありません");
    return null;
  }
  return report;
}

function exportPdf() {
  const report = getRequiredCurrentReport();
  if (!report) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    setStatus("印刷画面を開けませんでした");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintReportHtml(report));
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);
  setStatus("印刷画面を開きました");
}

async function clearHistory() {
  const confirmed = window.confirm("このブラウザの演習履歴をクリアします。よろしいですか？");
  if (!confirmed) return;

  await fetchJson(getHistoryEndpoint(), { method: "DELETE" }).catch((error) => {
    console.error(error);
  });
  state.attempts = [];
  state.promptDrafts = {};
  state.reflectionNotes = {};
  state.currentAttempt = null;
  loadPromptForActive();
  loadReflectionForActive();
  renderAll();
  setStatus("履歴をクリアしました");
}

function bindEvents() {
  elements.zeroTab.addEventListener("click", () => switchExerciseType("zero-shot"));
  elements.fewTab.addEventListener("click", () => switchExerciseType("few-shot"));
  elements.exerciseSelect.addEventListener("change", (event) => switchExercise(event.target.value));
  elements.clearHistoryButton.addEventListener("click", () => {
    void clearHistory();
  });
  elements.promptInput.addEventListener("input", () => {
    syncPromptToDraft();
    scheduleSaveHistory();
  });
  elements.reflectionInput.addEventListener("input", () => {
    syncReflectionToDraft();
    scheduleSaveHistory();
  });
  elements.useStarterButton.addEventListener("click", () => {
    const exercise = getCurrentExercise();
    elements.promptInput.value = exercise?.starterPrompt || "";
    syncPromptToDraft();
    setStatus("プロンプト例を入れました");
    scheduleSaveHistory();
  });
  elements.runButton.addEventListener("click", () => {
    void runAttempt();
  });
  elements.exportPdfButton.addEventListener("click", exportPdf);
}

async function init() {
  bindEvents();

  try {
    state.config = await fetchJson("/api/config");
    state.exerciseGroups = Array.isArray(state.config.exerciseGroups)
      ? state.config.exerciseGroups
      : [];
    state.selectedModel = state.config.selectedModel || "";

    if (!state.exerciseGroups.length) {
      throw new Error("演習データが見つかりません");
    }

    state.activeExerciseType = state.exerciseGroups[0].id;
    state.activeExerciseId = state.exerciseGroups[0].exercises[0]?.id || "";
    await loadHistory();

    if (!getCurrentExercise()) {
      state.activeExerciseType = state.exerciseGroups[0].id;
      state.activeExerciseId = state.exerciseGroups[0].exercises[0]?.id || "";
    }

    loadPromptForActive();
    renderAll();
  } catch (error) {
    console.error(error);
    elements.resultSection.hidden = false;
    elements.assistantOutput.innerHTML = `<p class="empty-text">${escapeHtml(
      `初期化に失敗しました: ${error.message}`
    )}</p>`;
    setStatus("エラー");
  }
}

void init();
