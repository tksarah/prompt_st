import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateReply,
  getConfiguredModels,
  getConfiguredProvider,
  isMockMode,
  isModelSwitchEnabled,
  resolveModel
} from "./llmClient.js";
import {
  basicSteps,
  caseStudies,
  exerciseGroups,
  getExerciseById,
  getExerciseGroupById,
  getLessonSummaries,
  rubricItems
} from "./lessons.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
dotenv.config({ path: join(currentDir, "..", ".env") });

const frontendDir = join(currentDir, "..", "frontend");
const DEFAULT_HISTORY_TTL_MINUTES = 30;
const SESSION_ARCHIVE_LIMIT = 24;
const MAX_PROMPT_LENGTH = 8000;
const MAX_HISTORY_MESSAGE_LENGTH = 4000;
const VALID_EXERCISE_TYPES = new Set(["zero-shot", "few-shot"]);

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRuntimeConfig(env) {
  const historyTtlMinutes = toPositiveNumber(
    env.CHAT_HISTORY_TTL_MINUTES,
    DEFAULT_HISTORY_TTL_MINUTES
  );
  const historyVisibleCount = Math.floor(toPositiveNumber(env.SESSION_HISTORY_VISIBLE_COUNT, 10));
  const provider = getConfiguredProvider(env);
  const models = getConfiguredModels(env);

  return {
    provider,
    models,
    selectedModel: models[0],
    modelSwitchEnabled: isModelSwitchEnabled(env),
    historyTtlMinutes,
    historyVisibleCount,
    mockMode: isMockMode(env)
  };
}

function normalizeOutputFormat(value) {
  return value === "rich" ? "rich" : "plain";
}

function stripMarkdown(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .trim();
}

function normalizeClientId(value) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function getHistoryClientId(request) {
  return normalizeClientId(request.query?.clientId) || normalizeClientId(request.body?.clientId);
}

function defaultExerciseType() {
  return exerciseGroups[0]?.id || "zero-shot";
}

function defaultExerciseId(exerciseType = defaultExerciseType()) {
  const group = getExerciseGroupById(exerciseType) || exerciseGroups[0];
  return group?.exercises[0]?.id || "";
}

function normalizeExerciseType(value) {
  if (value === "zero-shot" || value === "basic") return "zero-shot";
  if (value === "few-shot" || value === "case") return "few-shot";
  return "";
}

function getPromptDraftKeyType(key) {
  const [type, id] = String(key || "").split(":");
  const exerciseType = normalizeExerciseType(type);
  if (exerciseType && getExerciseById(exerciseType, id)) return exerciseType;
  return "";
}

function sanitizePromptDrafts(promptDrafts) {
  if (!promptDrafts || typeof promptDrafts !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(promptDrafts)
      .filter(([key, value]) => getPromptDraftKeyType(key) && typeof value === "string")
      .slice(0, 80)
      .map(([key, value]) => [key, value.slice(0, MAX_PROMPT_LENGTH)])
  );
}

function sanitizeReflectionNotes(reflectionNotes) {
  if (!reflectionNotes || typeof reflectionNotes !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(reflectionNotes)
      .filter(([key, value]) => getPromptDraftKeyType(key) && typeof value === "string")
      .slice(0, 80)
      .map(([key, value]) => [key, value.slice(0, 1200)])
  );
}

function sanitizeHistoryMessage(message) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const role = typeof message.role === "string" ? message.role : "";
  if (!["user", "assistant", "system"].includes(role)) {
    return null;
  }

  const content = typeof message.content === "string" ? message.content : "";
  if (!content.trim()) {
    return null;
  }

  return {
    role,
    content: content.slice(0, MAX_HISTORY_MESSAGE_LENGTH),
    ...(typeof message.outputFormat === "string"
      ? { outputFormat: normalizeOutputFormat(message.outputFormat) }
      : {})
  };
}

function inferAttemptExercise(attempt) {
  const exerciseType = normalizeExerciseType(attempt?.exerciseType);
  const exerciseId =
    typeof attempt?.exerciseId === "string"
      ? attempt.exerciseId
      : exerciseType === "zero-shot" && typeof attempt?.stepId === "string"
        ? attempt.stepId
        : exerciseType === "few-shot" && typeof attempt?.caseId === "string"
          ? attempt.caseId
          : typeof attempt?.lessonId === "string"
            ? attempt.lessonId
            : "";

  if (exerciseType && getExerciseById(exerciseType, exerciseId)) {
    return { exerciseType, exerciseId };
  }

  if (typeof attempt?.stepId === "string" && getExerciseById("zero-shot", attempt.stepId)) {
    return { exerciseType: "zero-shot", exerciseId: attempt.stepId };
  }

  if (typeof attempt?.caseId === "string" && getExerciseById("few-shot", attempt.caseId)) {
    return { exerciseType: "few-shot", exerciseId: attempt.caseId };
  }

  return null;
}

function sanitizeAttempt(attempt) {
  if (!attempt || typeof attempt !== "object") {
    return null;
  }

  const exercise = inferAttemptExercise(attempt);
  const prompt = typeof attempt.prompt === "string" ? attempt.prompt.slice(0, MAX_PROMPT_LENGTH) : "";
  const assistantReply =
    typeof attempt.assistantReply === "string"
      ? attempt.assistantReply.slice(0, MAX_HISTORY_MESSAGE_LENGTH)
      : "";

  if (!exercise || !prompt.trim()) {
    return null;
  }

  const createdAt = typeof attempt.createdAt === "number" ? attempt.createdAt : Date.now();
  const base = {
    id:
      typeof attempt.id === "string" && attempt.id.trim()
        ? attempt.id.slice(0, 120)
        : `attempt-${createdAt}`,
    exerciseType: exercise.exerciseType,
    exerciseId: exercise.exerciseId,
    prompt,
    assistantReply,
    createdAt,
    evaluation:
      attempt.evaluation && typeof attempt.evaluation === "object" ? attempt.evaluation : null,
    score: attempt.score && typeof attempt.score === "object" ? attempt.score : null,
    revisionHint: typeof attempt.revisionHint === "string" ? attempt.revisionHint : "",
    model: typeof attempt.model === "string" ? attempt.model : "",
    provider: typeof attempt.provider === "string" ? attempt.provider : ""
  };

  if (exercise.exerciseType === "few-shot") {
    return {
      ...base,
      caseId: exercise.exerciseId,
      lessonId: exercise.exerciseId,
      scenarioId: exercise.exerciseId
    };
  }

  return {
    ...base,
    stepId: exercise.exerciseId,
    lessonId: exercise.exerciseId,
    scenarioId: `${exercise.exerciseId}-scenario`
  };
}

function sanitizeHistoryState(state) {
  const fallbackType = defaultExerciseType();
  const requestedType =
    normalizeExerciseType(state?.activeExerciseType) ||
    (typeof state?.activeCaseId === "string" ? "few-shot" : "") ||
    fallbackType;
  const activeExerciseType = VALID_EXERCISE_TYPES.has(requestedType) ? requestedType : fallbackType;
  const requestedExerciseId =
    typeof state?.activeExerciseId === "string"
      ? state.activeExerciseId
      : activeExerciseType === "few-shot" && typeof state?.activeCaseId === "string"
        ? state.activeCaseId
        : typeof state?.activeStepId === "string"
          ? state.activeStepId
          : "";
  const activeExerciseId = getExerciseById(activeExerciseType, requestedExerciseId)
    ? requestedExerciseId
    : defaultExerciseId(activeExerciseType);
  const attempts = Array.isArray(state?.attempts)
    ? state.attempts.map(sanitizeAttempt).filter(Boolean).slice(0, SESSION_ARCHIVE_LIMIT)
    : [];
  const chatMessages = Array.isArray(state?.chatMessages)
    ? state.chatMessages.map(sanitizeHistoryMessage).filter(Boolean).slice(-40)
    : [];
  const promptDrafts = sanitizePromptDrafts(state?.promptDrafts);
  const reflectionNotes = sanitizeReflectionNotes(state?.reflectionNotes);

  return {
    activeExerciseType,
    activeExerciseId,
    activeStepId: activeExerciseType === "zero-shot" ? activeExerciseId : defaultExerciseId("zero-shot"),
    activeCaseId: activeExerciseType === "few-shot" ? activeExerciseId : defaultExerciseId("few-shot"),
    activeLessonId: activeExerciseId,
    activeScenarioId: `${activeExerciseId}-scenario`,
    attempts,
    chatMessages,
    promptDrafts,
    reflectionNotes
  };
}

function buildExercisePayload(exercise) {
  return {
    exerciseType: exercise.exerciseType,
    id: exercise.id,
    exerciseId: exercise.id,
    title: exercise.title,
    shortTitle: exercise.shortTitle,
    focus: exercise.focus,
    promptScenario: exercise.promptScenario,
    referenceItems: exercise.referenceItems || [],
    sourceText: exercise.sourceText,
    examples: exercise.examples || [],
    principles: exercise.principles || [],
    evaluationRubricIds: exercise.evaluationRubricIds || [],
    checklist: exercise.checklist || [],
    nextAction:
      "AI出力を確認し、改善コメントを1つ選んでプロンプトを修正してから再実行してください。"
  };
}

function getExerciseRubricItems(exercise) {
  const targetIds = Array.isArray(exercise?.evaluationRubricIds)
    ? exercise.evaluationRubricIds
    : [];
  const targetItems = targetIds
    .map((id) => rubricItems.find((item) => item.id === id))
    .filter(Boolean);
  return targetItems.length > 0 ? targetItems : rubricItems.slice(0, 5);
}

function resolveAttemptExercise(body) {
  const requestedType = normalizeExerciseType(body?.exerciseType);

  if (body?.exerciseType && !requestedType) {
    return { error: "exerciseType is invalid" };
  }

  const exerciseType =
    requestedType ||
    (typeof body?.caseId === "string" ? "few-shot" : "") ||
    (typeof body?.stepId === "string" ? "zero-shot" : "");

  if (!exerciseType) {
    return { error: "exerciseType is required" };
  }

  const exerciseId =
    typeof body?.exerciseId === "string"
      ? body.exerciseId
      : exerciseType === "few-shot" && typeof body?.caseId === "string"
        ? body.caseId
        : exerciseType === "zero-shot" && typeof body?.stepId === "string"
          ? body.stepId
          : typeof body?.lessonId === "string"
            ? body.lessonId
            : "";

  const exercise = getExerciseById(exerciseType, exerciseId);
  return exercise
    ? { exercise: buildExercisePayload(exercise) }
    : { error: "exerciseId is invalid" };
}

function buildAttemptMessages({ prompt }) {
  return [
    {
      role: "system",
      content:
        "You are the AI assistant inside a Japanese prompt-practice exercise for hospitality students. Follow only the learner's prompt below. Respond in Japanese unless the learner asks otherwise. Do not invent hotel policies, prices, availability, private information, or confirmed outcomes. If required information is missing, ask concise clarification questions or mark it as something to confirm."
    },
    {
      role: "user",
      content: prompt
    }
  ];
}

function buildEvaluationMessages({
  exercise,
  prompt,
  assistantReply,
  activeRubricItems = rubricItems
}) {
  return [
    {
      role: "system",
      content:
        "あなたはホテル専門学生向けAI活用授業のプロンプト評価者です。学生が社会に出て安全にAIを使えるよう、目的、背景、制約、出力形式、接客品質、Few-Shotの例の使い方を評価します。必ずJSONオブジェクトのみを返してください。"
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task:
            "次の学生プロンプトを0-4点で評価し、点数よりも改善に使える短い助言を日本語で返してください。",
          outputSchema: {
            items: activeRubricItems.map((item) => ({
              id: item.id,
              score: "0から4の整数",
              reason: "日本語で1文。現状をやさしく説明する",
              advice: "日本語で1文。次に足すとよい具体的な指定を書く"
            })),
            summary: "日本語で2文以内。点数を強調しない",
            bestPoint: "最も良かった点を日本語で1文",
            priorityFix: "最優先で直す点を日本語で1文",
            revisionHint: "次に直すべきことを日本語で1から2文",
            nextStep: "次の演習行動を日本語で1文"
          },
          passRule: "合計70%以上、かつ0点項目がない場合に晴れ。35%以上は曇り。それ未満は雨。",
          exercise,
          rubricItems: activeRubricItems,
          learnerPrompt: prompt,
          assistantReply
        },
        null,
        2
      )
    }
  ];
}

function getScoreBySignals(prompt, signals, fallbackScore = 1) {
  const text = prompt.toLowerCase();
  const matches = signals.filter((signal) => text.includes(signal.toLowerCase())).length;
  if (matches >= 4) return 4;
  if (matches >= 2) return 3;
  if (matches === 1) return 2;
  return fallbackScore;
}

function createHeuristicEvaluation({ exercise, prompt }) {
  const signalsByItem = {
    goal: [
      "goal",
      "目的",
      "作って",
      "作成",
      "返信",
      "案内",
      "口コミ",
      "faq",
      "メール",
      "チャット"
    ],
    context: [
      "context",
      "背景",
      "お客様",
      "宿泊",
      "滞在",
      "口コミ",
      "チェックイン",
      "フロント",
      "場面",
      "客室"
    ],
    constraints: [
      "constraints",
      "制約",
      "断定しない",
      "作らない",
      "個人情報",
      "確認",
      "未確認",
      "以内",
      "禁止",
      "避け",
      "料金",
      "空室"
    ],
    output: [
      "output",
      "出力",
      "形式",
      "字以内",
      "本文",
      "表",
      "箇条書き",
      "回答文",
      "返信文",
      "a:"
    ],
    hospitality: [
      "丁寧",
      "安心",
      "誠実",
      "お詫び",
      "感謝",
      "接客",
      "ホテル",
      "フロント",
      "お客様",
      "親切"
    ],
    examples: ["例", "まね", "同じ", "few", "shot", "q:", "a:", "型", "参考"],
    consistency: ["同じ型", "同じ構成", "同じ丁寧", "一貫", "型", "トーン", "文体", "短さ", "構成"]
  };

  const activeRubricItems = getExerciseRubricItems(exercise);
  const items = activeRubricItems.map((item) => {
    const score = getScoreBySignals(prompt, signalsByItem[item.id] || [], 1);
    return {
      id: item.id,
      label: item.label,
      score,
      maxScore: item.maxScore,
      reason:
        score >= 3
          ? `${item.label}の指定が読み取れます。`
          : `${item.label}の指定がまだ弱く、AIの出力がぶれる可能性があります。`,
      advice:
        score >= 3
          ? "この観点は残し、ほかに不足している指定を1つだけ足しましょう。"
          : `${item.label}を短い1文でプロンプトに足すと、より安定します。`
    };
  });

  return normalizeEvaluation(
    {
      items,
      summary:
        exercise.exerciseType === "few-shot"
          ? "Few-Shotの例をどう使わせるかを中心に確認しました。例と同じ型にする指定をさらに明確にするとよくなります。"
          : "Zero-Shotの基本指定を中心に確認しました。目的、背景、制約、出力形式を1つずつ足すと整います。",
      bestPoint:
        "ホテルの場面を意識してAIに依頼しようとしている点が良いです。",
      priorityFix:
        "最も弱い観点を1つ選び、AIに守ってほしい条件として短く追記してください。",
      revisionHint:
        "次はプロンプトに『未確認情報は断定しない』または『同じ型で出す』など、出力を安定させる条件を1つ足して再実行しましょう。",
      nextStep: exercise.nextAction
    },
    activeRubricItems
  );
}

function parseEvaluationJson(rawText) {
  const trimmed = String(rawText || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Evaluation response was not valid JSON");
  }
}

function normalizeEvaluation(parsed, activeRubricItems = rubricItems) {
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
    throw new Error("Evaluation JSON did not contain items");
  }

  const items = activeRubricItems.map((rubricItem) => {
    const incoming = parsed.items.find((item) => item?.id === rubricItem.id) || {};
    const score = Number(incoming.score);
    const normalizedScore = Number.isFinite(score)
      ? Math.max(0, Math.min(rubricItem.maxScore, Math.round(score)))
      : 0;

    return {
      id: rubricItem.id,
      label: rubricItem.label,
      maxScore: rubricItem.maxScore,
      score: normalizedScore,
      reason:
        typeof incoming.reason === "string" && incoming.reason.trim()
          ? incoming.reason.trim()
          : "評価理由が返されませんでした。",
      advice:
        typeof incoming.advice === "string" && incoming.advice.trim()
          ? incoming.advice.trim()
          : "この観点をプロンプトに明示してください。"
    };
  });

  const total = items.reduce((sum, item) => sum + item.score, 0);
  const max = items.reduce((sum, item) => sum + item.maxScore, 0);
  const percentage = max > 0 ? Math.round((total / max) * 100) : 0;
  const zeroScoreItems = items.filter((item) => item.score === 0).map((item) => item.id);

  return {
    items,
    total,
    max,
    percentage,
    passed: percentage >= 70 && zeroScoreItems.length === 0,
    zeroScoreItems,
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "評価サマリーが返されませんでした。",
    bestPoint:
      typeof parsed.bestPoint === "string" && parsed.bestPoint.trim()
        ? parsed.bestPoint.trim()
        : "目的に沿ってプロンプトを書こうとしている点は良いです。",
    priorityFix:
      typeof parsed.priorityFix === "string" && parsed.priorityFix.trim()
        ? parsed.priorityFix.trim()
        : "最も弱い観点を1つ選び、具体的な指定を追記してください。",
    revisionHint:
      typeof parsed.revisionHint === "string" && parsed.revisionHint.trim()
        ? parsed.revisionHint.trim()
        : "弱い観点を1つ選び、プロンプトに追記してもう一度実行してください。",
    nextStep:
      typeof parsed.nextStep === "string" && parsed.nextStep.trim()
        ? parsed.nextStep.trim()
        : "修正してもう一度実行してください。"
  };
}

function createEvaluationFailure(activeRubricItems = rubricItems) {
  return {
    evaluation: null,
    score: {
      total: 0,
      max: activeRubricItems.reduce((sum, item) => sum + item.maxScore, 0),
      percentage: 0,
      passed: false
    },
    revisionHint: "評価に失敗したため再実行してください。",
    evaluationError: true
  };
}

async function evaluatePrompt({ env, exercise, prompt, assistantReply, model }) {
  const activeRubricItems = getExerciseRubricItems(exercise);

  if (isMockMode(env)) {
    const evaluation = createHeuristicEvaluation({ exercise, prompt, assistantReply });
    return {
      evaluation,
      score: {
        total: evaluation.total,
        max: evaluation.max,
        percentage: evaluation.percentage,
        passed: evaluation.passed
      },
      revisionHint: evaluation.revisionHint,
      evaluationError: false
    };
  }

  try {
    const rawEvaluation = await generateReply({
      env,
      model,
      messages: buildEvaluationMessages({ exercise, prompt, assistantReply, activeRubricItems }),
      temperature: 0.1,
      responseFormat: { type: "json_object" }
    });
    const evaluation = normalizeEvaluation(parseEvaluationJson(rawEvaluation), activeRubricItems);
    return {
      evaluation,
      score: {
        total: evaluation.total,
        max: evaluation.max,
        percentage: evaluation.percentage,
        passed: evaluation.passed
      },
      revisionHint: evaluation.revisionHint,
      evaluationError: false
    };
  } catch (error) {
    console.error(error);
    return createEvaluationFailure(activeRubricItems);
  }
}

export function createApp({ env = process.env } = {}) {
  const app = express();
  const runtimeConfig = getRuntimeConfig(env);
  const historyTtlMs = runtimeConfig.historyTtlMinutes * 60 * 1000;
  const historyStore = new Map();

  function cleanupExpiredHistories() {
    const now = Date.now();
    for (const [clientId, entry] of historyStore.entries()) {
      if (!entry || entry.expiresAt <= now) {
        historyStore.delete(clientId);
      }
    }
  }

  function getStoredHistory(clientId) {
    const entry = historyStore.get(clientId);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      historyStore.delete(clientId);
      return null;
    }
    return entry;
  }

  function saveStoredHistory(clientId, payload) {
    const now = Date.now();
    const entry = {
      ...sanitizeHistoryState(payload),
      savedAt: now,
      expiresAt: now + historyTtlMs
    };
    historyStore.set(clientId, entry);
    return entry;
  }

  setInterval(cleanupExpiredHistories, Math.min(historyTtlMs, 10 * 60 * 1000)).unref?.();

  app.use(
    cors({
      origin: env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== "*" ? env.ALLOWED_ORIGIN : true,
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type"]
    })
  );
  app.use(express.json({ limit: "96kb" }));
  app.use(express.static(frontendDir));

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/api/config", (_request, response) => {
    response.json({
      ...runtimeConfig,
      exerciseGroups,
      rubricItems,
      basicSteps,
      caseStudies,
      lessons: getLessonSummaries()
    });
  });

  app.get("/api/history", (request, response) => {
    const clientId = getHistoryClientId(request);
    if (!clientId) {
      response.status(400).json({ error: "clientId is required" });
      return;
    }

    const entry = getStoredHistory(clientId);
    response.json({
      ...sanitizeHistoryState(entry),
      savedAt: entry?.savedAt || null,
      historyTtlMinutes: runtimeConfig.historyTtlMinutes,
      historyVisibleCount: runtimeConfig.historyVisibleCount
    });
  });

  app.put("/api/history", (request, response) => {
    const clientId = getHistoryClientId(request);
    if (!clientId) {
      response.status(400).json({ error: "clientId is required" });
      return;
    }

    const entry = saveStoredHistory(clientId, request.body);
    response.json({
      ...entry,
      historyTtlMinutes: runtimeConfig.historyTtlMinutes,
      historyVisibleCount: runtimeConfig.historyVisibleCount
    });
  });

  app.delete("/api/history", (request, response) => {
    const clientId = getHistoryClientId(request);
    if (!clientId) {
      response.status(400).json({ error: "clientId is required" });
      return;
    }

    historyStore.delete(clientId);
    response.json({ ok: true });
  });

  app.post("/api/chat", async (request, response) => {
    const { message, history, model: requestedModel, outputFormat: requestedOutputFormat } =
      request.body ?? {};
    const outputFormat = normalizeOutputFormat(requestedOutputFormat);

    if (typeof message !== "string" || !message.trim()) {
      response.status(400).json({ error: "message is required" });
      return;
    }

    if (message.length > MAX_PROMPT_LENGTH) {
      response.status(400).json({ error: "message is too long" });
      return;
    }

    const model = resolveModel(env, requestedModel);
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful classroom AI assistant for prompt-practice learners. Answer concisely in Japanese unless the user asks otherwise."
      },
      ...(Array.isArray(history)
        ? history
            .map(sanitizeHistoryMessage)
            .filter((item) => item && item.role !== "system")
            .map((item) => ({ role: item.role, content: item.content }))
        : []),
      {
        role: "user",
        content: message.trim()
      }
    ];

    try {
      const reply = await generateReply({ env, messages, model });
      response.json({
        reply: outputFormat === "plain" ? stripMarkdown(reply) : reply,
        outputFormat,
        model,
        provider: runtimeConfig.provider
      });
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: "API request failed" });
    }
  });

  app.post("/api/attempts", async (request, response) => {
    const { prompt, model: requestedModel } = request.body ?? {};

    if (typeof prompt !== "string" || !prompt.trim()) {
      response.status(400).json({ error: "prompt is required" });
      return;
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      response.status(400).json({ error: "prompt is too long" });
      return;
    }

    const resolvedExercise = resolveAttemptExercise(request.body ?? {});
    if (resolvedExercise.error) {
      response.status(400).json({ error: resolvedExercise.error });
      return;
    }

    const exercise = resolvedExercise.exercise;
    const model = resolveModel(env, requestedModel);

    try {
      const assistantReply = await generateReply({
        env,
        model,
        messages: buildAttemptMessages({ exercise, prompt: prompt.trim() }),
        temperature: 0.4
      });
      const evaluationResult = await evaluatePrompt({
        env,
        exercise,
        prompt: prompt.trim(),
        assistantReply,
        model
      });
      const createdAt = Date.now();
      const identity =
        exercise.exerciseType === "few-shot"
          ? {
              exerciseId: exercise.exerciseId,
              caseId: exercise.exerciseId,
              lessonId: exercise.exerciseId,
              scenarioId: exercise.exerciseId
            }
          : {
              exerciseId: exercise.exerciseId,
              stepId: exercise.exerciseId,
              lessonId: exercise.exerciseId,
              scenarioId: `${exercise.exerciseId}-scenario`
            };

      response.json({
        id: `attempt-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
        exerciseType: exercise.exerciseType,
        ...identity,
        prompt: prompt.trim(),
        assistantReply,
        createdAt,
        model,
        provider: runtimeConfig.provider,
        ...evaluationResult
      });
    } catch (error) {
      console.error(error);
      response.status(500).json({ error: "Attempt execution failed" });
    }
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: "Unexpected server error" });
  });

  return app;
}

if (process.argv[1] === currentFile) {
  const port = Number(process.env.PORT || 3000);
  const app = createApp();
  app.listen(port, () => {
    console.log(`ホテルプロンプト練習アプリを起動しました: http://localhost:${port}`);
  });
}
