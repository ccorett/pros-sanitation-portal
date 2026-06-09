export type BinLocationCsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function pickBinLocationRowValue(
  row: BinLocationCsvRow,
  aliases: string[],
): string {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value?.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function parseBinLocationCsvContent(content: string): BinLocationCsvRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const values = lines.map(parseCsvLine);
  const headerIndex = values.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell ?? "") === "location"),
  );

  if (headerIndex === -1) {
    throw new Error("CSV is missing a Location header row.");
  }

  const headers = values[headerIndex].map((cell) => normalizeHeader(cell ?? ""));
  const rows: BinLocationCsvRow[] = [];

  for (const rawRow of values.slice(headerIndex + 1)) {
    if (!rawRow.some((cell) => cell?.trim())) {
      continue;
    }

    const row: BinLocationCsvRow = {};
    headers.forEach((header, index) => {
      if (header) {
        row[header] = rawRow[index]?.trim() ?? "";
      }
    });
    rows.push(row);
  }

  return rows;
}
