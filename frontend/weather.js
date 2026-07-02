export const weatherMarks = {
  sunny: {
    label: "晴れ",
    message: "よくできています",
    src: "./assets/weather/sunny.png"
  },
  cloudy: {
    label: "曇り",
    message: "あと少し整えましょう",
    src: "./assets/weather/cloudy.png"
  },
  rainy: {
    label: "雨",
    message: "まず1点直しましょう",
    src: "./assets/weather/rainy.png"
  }
};

export function getWeatherKeyFromPercentage(percentage) {
  const numericPercentage = Number(percentage);
  if (!Number.isFinite(numericPercentage)) return null;
  if (numericPercentage >= 70) return "sunny";
  if (numericPercentage >= 35) return "cloudy";
  return "rainy";
}

export function getWeatherKeyFromRubricItem(item) {
  const score = Number(item?.score);
  const maxScore = Number(item?.maxScore);
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return null;

  if (maxScore === 4) {
    if (score >= 3) return "sunny";
    if (score >= 1) return "cloudy";
    return "rainy";
  }

  const ratio = score / maxScore;
  if (ratio >= 0.7) return "sunny";
  if (ratio >= 0.35) return "cloudy";
  return "rainy";
}
