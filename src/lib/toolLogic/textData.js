import { parseCsv, stringifyCsv } from "../csv";

export function countTextStats(value) {
  const text = String(value ?? "");
  const trimmed = text.trim();

  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    characters: text.length,
    charactersWithoutSpaces: text.replace(/\s/g, "").length,
    lines: text ? text.split(/\r?\n/).length : 0
  };
}

export function csvToJsonRecords(value) {
  const [header = [], ...rows] = parseCsv(String(value ?? ""));
  return rows.map((row) =>
    Object.fromEntries(header.map((key, index) => [key || `column_${index + 1}`, row[index] ?? ""]))
  );
}

export function csvToJsonText(value, indent = 2) {
  return JSON.stringify(csvToJsonRecords(value), null, indent);
}

export function jsonToCsvRows(value) {
  const parsed = JSON.parse(String(value ?? ""));
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];

  return [headers, ...rows.map((row) => headers.map((header) => row?.[header] ?? ""))];
}

export function jsonToCsvText(value) {
  return stringifyCsv(jsonToCsvRows(value));
}

export function sentenceCase(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";
  return text.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (match) => match.toUpperCase());
}

export function removePunctuation(value) {
  return String(value ?? "").replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]+/g, "");
}

export function extractEmailDomains(value) {
  const matches = String(value ?? "").match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi) || [];
  return [...new Set(matches.map((email) => email.split("@")[1]?.toLowerCase()).filter(Boolean))];
}
