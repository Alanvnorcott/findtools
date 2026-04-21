export function toFiniteNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function calculatePercentage(value, percent) {
  const amount = toFiniteNumber(value);
  const rate = toFiniteNumber(percent);

  return {
    value: amount,
    percent: rate,
    result: (amount * rate) / 100
  };
}

export function gcd(a, b) {
  let x = Math.abs(Math.round(toFiniteNumber(a, 1))) || 1;
  let y = Math.abs(Math.round(toFiniteNumber(b, 1))) || 1;

  while (y) {
    [x, y] = [y, x % y];
  }

  return x || 1;
}

export function calculateAspectRatio({ width, height, targetWidth, targetHeight }) {
  const safeWidth = Math.max(1, toFiniteNumber(width, 1));
  const safeHeight = Math.max(1, toFiniteNumber(height, 1));
  const divisor = gcd(safeWidth, safeHeight);
  const nextHeight = targetWidth ? (toFiniteNumber(targetWidth) * safeHeight) / safeWidth : 0;
  const nextWidth = targetHeight ? (toFiniteNumber(targetHeight) * safeWidth) / safeHeight : 0;

  return {
    width: safeWidth,
    height: safeHeight,
    ratioWidth: safeWidth / divisor,
    ratioHeight: safeHeight / divisor,
    heightAtTargetWidth: nextHeight,
    widthAtTargetHeight: nextWidth
  };
}

export function parseWeightedLines(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [criterion, weight, scoreA, scoreB] = line.split("|");
      return {
        criterion: (criterion || "").trim(),
        weight: toFiniteNumber(weight),
        scoreA: toFiniteNumber(scoreA),
        scoreB: toFiniteNumber(scoreB)
      };
    });
}

export function evaluateWeightedDecision(value) {
  const rows = parseWeightedLines(value);
  const totals = rows.reduce(
    (acc, row) => ({
      a: acc.a + row.weight * row.scoreA,
      b: acc.b + row.weight * row.scoreB
    }),
    { a: 0, b: 0 }
  );

  return { rows, totals };
}

export function calculateGradePercentage(earned, possible) {
  const score = toFiniteNumber(earned);
  const total = toFiniteNumber(possible);
  const percentage = total > 0 ? (score / total) * 100 : 0;

  return { earned: score, possible: total, percentage };
}

export function calculateRunway(cash, monthlyBurn) {
  const reserve = Math.max(0, toFiniteNumber(cash));
  const burn = Math.max(0, toFiniteNumber(monthlyBurn));
  const months = burn > 0 ? reserve / burn : 0;

  return { cash: reserve, monthlyBurn: burn, months };
}
