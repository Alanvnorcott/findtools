export function percentageChange(start, end) {
  const a = Number(start) || 0;
  const b = Number(end) || 0;
  return a === 0 ? 0 : ((b - a) / a) * 100;
}

export function reversePercentage(finalValue, rate, mode = "increase") {
  const final = Number(finalValue) || 0;
  const pct = (Number(rate) || 0) / 100;
  if (mode === "decrease") {
    return 1 - pct === 0 ? 0 : final / (1 - pct);
  }
  return final / (1 + pct);
}

export function businessDaysInYear(year) {
  let count = 0;
  for (let month = 0; month < 12; month += 1) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const weekday = new Date(year, month, day).getDay();
      if (weekday !== 0 && weekday !== 6) count += 1;
    }
  }
  return count;
}

export function isoWeekNumber(dateInput) {
  const value = String(dateInput ?? "");
  let target;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    target = new Date(Date.UTC(year, month - 1, day));
  } else {
    const date = new Date(dateInput);
    target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

export function basicStats(values) {
  const nums = values.map(Number).filter((value) => Number.isFinite(value));
  if (!nums.length) {
    return { average: 0, median: 0, mode: [], variance: 0, standardDeviation: 0 };
  }
  const average = nums.reduce((sum, value) => sum + value, 0) / nums.length;
  const sorted = [...nums].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const counts = new Map();
  nums.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  const maxCount = Math.max(...counts.values());
  const mode = [...counts.entries()].filter(([, count]) => count === maxCount).map(([value]) => value);
  const variance = nums.reduce((sum, value) => sum + (value - average) ** 2, 0) / nums.length;
  const standardDeviation = Math.sqrt(variance);
  return { average, median, mode, variance, standardDeviation };
}

export function determinant2x2(matrix) {
  return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
}

export function parseMatrix(value) {
  return String(value ?? "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((row) => row.split(/[,\s]+/).filter(Boolean).map(Number));
}

export function transferTimeSeconds(sizeMb, speedMbps) {
  const size = Number(sizeMb) || 0;
  const speed = Number(speedMbps) || 0;
  if (speed <= 0) return 0;
  return (size * 8) / speed;
}

export function binaryFromText(value) {
  return [...String(value ?? "")]
    .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");
}

export function textFromBinary(value) {
  return String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => String.fromCharCode(Number.parseInt(chunk, 2)))
    .join("");
}
