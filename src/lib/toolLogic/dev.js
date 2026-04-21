export function transformBase64(value, mode = "encode") {
  try {
    return mode === "encode"
      ? btoa(unescape(encodeURIComponent(value)))
      : decodeURIComponent(escape(atob(value)));
  } catch {
    return "Invalid Base64 input.";
  }
}

export function readJsonPath(input, path) {
  if (!path.trim()) return input;

  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.reduce((current, part) => {
    if (current == null) return undefined;
    return current[part];
  }, input);
}
