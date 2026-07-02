import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../backend/server.js";

const testEnv = {
  ...process.env,
  USE_MOCK_LLM: "true",
  OPENAI_MODEL: "mock-model",
  OPENAI_API_BASE: "",
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "",
  ALLOWED_MODELS: "mock-model,other-model",
  ENABLE_MODEL_SWITCH: "true",
  CHAT_HISTORY_TTL_MINUTES: "30",
  SESSION_HISTORY_VISIBLE_COUNT: "10"
};

let server;
let baseUrl;

before(async () => {
  const app = createApp({ env: testEnv });
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

test("health and config expose hotel exercise groups", async () => {
  const health = await requestJson("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.data.ok, true);

  const config = await requestJson("/api/config");
  assert.equal(config.response.status, 200);
  assert.equal(config.data.provider, "openai");
  assert.equal(config.data.mockMode, true);
  assert.equal(config.data.exerciseGroups.length, 2);
  assert.deepEqual(
    config.data.exerciseGroups.map((group) => group.id),
    ["zero-shot", "few-shot"]
  );
  assert.ok(config.data.exerciseGroups.every((group) => group.exercises.length === 3));
  assert.equal(config.data.rubricItems.length, 7);
  assert.ok(config.data.exerciseGroups[0].exercises[0].promptScenario.includes("宿泊"));
  assert.equal(config.data.exerciseGroups[0].exercises[0].examples.length, 0);
  assert.equal(config.data.exerciseGroups[1].exercises[0].examples.length, 2);
  assert.deepEqual(config.data.exerciseGroups[0].exercises[0].evaluationRubricIds, [
    "goal",
    "context",
    "constraints",
    "output",
    "hospitality"
  ]);
  assert.deepEqual(config.data.exerciseGroups[1].exercises[0].evaluationRubricIds, [
    "goal",
    "examples",
    "consistency",
    "constraints",
    "hospitality"
  ]);
});

test("gemini-compatible config can use Gemini key and OPENAI_MODEL when model switch is off", async () => {
  const app = createApp({
    env: {
      USE_MOCK_LLM: "true",
      GEMINI_API_KEY: "test-key",
      OPENAI_API_BASE: "https://generativelanguage.googleapis.com/v1beta/openai",
      OPENAI_MODEL: "gemini-test-model",
      ALLOWED_MODELS: "gpt-4o-mini",
      ENABLE_MODEL_SWITCH: "false"
    }
  });
  let localServer;
  let localBaseUrl;
  await new Promise((resolve) => {
    localServer = app.listen(0, () => {
      const address = localServer.address();
      localBaseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  try {
    const response = await fetch(`${localBaseUrl}/api/config`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.provider, "gemini");
    assert.equal(data.selectedModel, "gemini-test-model");
    assert.deepEqual(data.models, ["gemini-test-model"]);
  } finally {
    await new Promise((resolve) => localServer.close(resolve));
  }
});

test("attempt endpoint validates required fields", async () => {
  const emptyPrompt = await requestJson("/api/attempts", {
    method: "POST",
    body: JSON.stringify({
      exerciseType: "zero-shot",
      exerciseId: "zero-prearrival-reply",
      prompt: ""
    })
  });
  assert.equal(emptyPrompt.response.status, 400);
  assert.equal(emptyPrompt.data.error, "prompt is required");

  const invalidType = await requestJson("/api/attempts", {
    method: "POST",
    body: JSON.stringify({
      exerciseType: "missing",
      exerciseId: "zero-prearrival-reply",
      prompt: "目的: テスト"
    })
  });
  assert.equal(invalidType.response.status, 400);
  assert.equal(invalidType.data.error, "exerciseType is invalid");

  const invalidExercise = await requestJson("/api/attempts", {
    method: "POST",
    body: JSON.stringify({
      exerciseType: "few-shot",
      exerciseId: "missing",
      prompt: "目的: テスト"
    })
  });
  assert.equal(invalidExercise.response.status, 400);
  assert.equal(invalidExercise.data.error, "exerciseId is invalid");

  const missingType = await requestJson("/api/attempts", {
    method: "POST",
    body: JSON.stringify({
      prompt: "目的: テスト"
    })
  });
  assert.equal(missingType.response.status, 400);
  assert.equal(missingType.data.error, "exerciseType is required");
});

test("attempt execution sends only the learner prompt to the assistant", async () => {
  const result = await requestJson("/api/attempts", {
    method: "POST",
    body: JSON.stringify({
      exerciseType: "zero-shot",
      exerciseId: "zero-prearrival-reply",
      prompt: "目的: テスト用に短く返してください。",
      model: "mock-model"
    })
  });

  assert.equal(result.response.status, 200);
  assert.match(result.data.assistantReply, /目的: テスト用に短く返してください。/);
  assert.doesNotMatch(result.data.assistantReply, /宿泊予定のお客様/);
  assert.doesNotMatch(result.data.assistantReply, /チェックイン前の荷物預かり/);
  assert.doesNotMatch(result.data.assistantReply, /まねてほしい例/);
});

test("all zero-shot and few-shot exercises can run in mock mode with evaluation", async () => {
  const { data: config } = await requestJson("/api/config");

  for (const group of config.exerciseGroups) {
    for (const exercise of group.exercises) {
      const result = await requestJson("/api/attempts", {
        method: "POST",
        body: JSON.stringify({
          exerciseType: group.id,
          exerciseId: exercise.id,
          prompt: exercise.starterPrompt,
          model: "other-model"
        })
      });

      assert.equal(result.response.status, 200);
      assert.equal(result.data.exerciseType, group.id);
      assert.equal(result.data.exerciseId, exercise.id);
      assert.equal(result.data.lessonId, exercise.id);
      assert.equal(result.data.model, "other-model");
      assert.ok(result.data.assistantReply.length > 0);
      assert.deepEqual(
        result.data.evaluation.items.map((item) => item.id),
        exercise.evaluationRubricIds
      );
      assert.equal(typeof result.data.evaluation.bestPoint, "string");
      assert.equal(typeof result.data.evaluation.priorityFix, "string");
      assert.equal(result.data.score.max, 20);
      assert.equal(typeof result.data.revisionHint, "string");
    }
  }
});

test("chat endpoint remains compatible with simple chat requests", async () => {
  const result = await requestJson("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message: "こんにちは",
      history: [],
      model: "mock-model",
      outputFormat: "plain"
    })
  });

  assert.equal(result.response.status, 200);
  assert.equal(result.data.provider, "openai");
  assert.equal(result.data.outputFormat, "plain");
  assert.ok(result.data.reply.length > 0);
});

test("history can be saved, loaded, and deleted by clientId", async () => {
  const clientId = "test-client";
  const save = await requestJson(`/api/history?clientId=${clientId}`, {
    method: "PUT",
    body: JSON.stringify({
      activeExerciseType: "few-shot",
      activeExerciseId: "few-faq-tone",
      attempts: [
        {
          id: "attempt-1",
          exerciseType: "few-shot",
          exerciseId: "few-faq-tone",
          prompt: "目的: FAQを作る",
          assistantReply: "ok",
          createdAt: Date.now(),
          score: { percentage: 80, passed: true }
        }
      ],
      promptDrafts: {
        "few-shot:few-faq-tone": "目的: FAQを作る"
      },
      reflectionNotes: {
        "few-shot:few-faq-tone": "例と同じ型を指定する。"
      }
    })
  });
  assert.equal(save.response.status, 200);
  assert.equal(save.data.activeExerciseType, "few-shot");
  assert.equal(save.data.activeExerciseId, "few-faq-tone");
  assert.equal(save.data.activeCaseId, "few-faq-tone");
  assert.equal(save.data.attempts.length, 1);

  const load = await requestJson(`/api/history?clientId=${clientId}`);
  assert.equal(load.response.status, 200);
  assert.equal(load.data.attempts.length, 1);
  assert.equal(load.data.promptDrafts["few-shot:few-faq-tone"], "目的: FAQを作る");
  assert.equal(load.data.reflectionNotes["few-shot:few-faq-tone"], "例と同じ型を指定する。");

  const clear = await requestJson(`/api/history?clientId=${clientId}`, { method: "DELETE" });
  assert.equal(clear.response.status, 200);
  assert.equal(clear.data.ok, true);

  const afterClear = await requestJson(`/api/history?clientId=${clientId}`);
  assert.equal(afterClear.response.status, 200);
  assert.equal(afterClear.data.attempts.length, 0);
});

test("old lesson history falls back to the first zero-shot exercise and drops old attempts", async () => {
  const clientId = "old-history-client";
  const save = await requestJson(`/api/history?clientId=${clientId}`, {
    method: "PUT",
    body: JSON.stringify({
      activeLessonId: "legacy-transfer",
      activeScenarioId: "my-workflow",
      attempts: [
        {
          id: "old-attempt",
          lessonId: "legacy-transfer",
          scenarioId: "my-workflow",
          prompt: "old prompt",
          assistantReply: "old reply",
          createdAt: Date.now(),
          score: { percentage: 80, passed: true }
        }
      ],
      promptDrafts: {
        "legacy-transfer:my-workflow": "old prompt"
      }
    })
  });

  assert.equal(save.response.status, 200);
  assert.equal(save.data.activeExerciseType, "zero-shot");
  assert.equal(save.data.activeExerciseId, "zero-prearrival-reply");
  assert.equal(save.data.activeStepId, "zero-prearrival-reply");
  assert.equal(save.data.attempts.length, 0);
  assert.deepEqual(save.data.promptDrafts, {});

  const load = await requestJson(`/api/history?clientId=${clientId}`);
  assert.equal(load.response.status, 200);
  assert.equal(load.data.activeExerciseType, "zero-shot");
  assert.equal(load.data.activeExerciseId, "zero-prearrival-reply");
  assert.equal(load.data.attempts.length, 0);
});
