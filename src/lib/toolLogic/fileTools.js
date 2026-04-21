export function parsePageRange(range, pageCount) {
  const pages = new Set();

  String(range ?? "")
    .split(",")
    .forEach((part) => {
      const [start, end] = part.split("-").map((item) => Number(item.trim()));

      if (Number.isFinite(start) && Number.isFinite(end)) {
        for (let page = start; page <= end; page += 1) {
          pages.add(page - 1);
        }
      } else if (Number.isFinite(start)) {
        pages.add(start - 1);
      }
    });

  return [...pages].filter((page) => page >= 0 && page < pageCount);
}
