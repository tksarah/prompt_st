import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getWeatherKeyFromPercentage,
  getWeatherKeyFromRubricItem,
  weatherMarks
} from "../frontend/weather.js";

test("overall weather thresholds are learner-friendly", () => {
  assert.equal(getWeatherKeyFromPercentage(70), "sunny");
  assert.equal(getWeatherKeyFromPercentage(69), "cloudy");
  assert.equal(getWeatherKeyFromPercentage(35), "cloudy");
  assert.equal(getWeatherKeyFromPercentage(34), "rainy");
  assert.equal(getWeatherKeyFromPercentage(""), "rainy");
  assert.equal(getWeatherKeyFromPercentage("not-a-number"), null);
});

test("rubric weather thresholds only rain on zero for four-point items", () => {
  assert.equal(getWeatherKeyFromRubricItem({ score: 4, maxScore: 4 }), "sunny");
  assert.equal(getWeatherKeyFromRubricItem({ score: 3, maxScore: 4 }), "sunny");
  assert.equal(getWeatherKeyFromRubricItem({ score: 2, maxScore: 4 }), "cloudy");
  assert.equal(getWeatherKeyFromRubricItem({ score: 1, maxScore: 4 }), "cloudy");
  assert.equal(getWeatherKeyFromRubricItem({ score: 0, maxScore: 4 }), "rainy");
});

test("weather labels and rainy message stay positive", () => {
  assert.equal(weatherMarks.cloudy.label, "曇り");
  assert.match(weatherMarks.rainy.message, /まず1点/);
});
