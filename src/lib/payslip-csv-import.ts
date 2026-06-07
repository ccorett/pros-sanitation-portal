export type PayslipCsvRow = Record<string, string>;

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

export function parsePayrollCsvContent(content: string): PayslipCsvRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const values = lines.map(parseCsvLine);
  const headerIndex = values.findIndex(
    (row) => normalizeHeader(row[0] ?? "") === "employee name",
  );

  if (headerIndex === -1) {
    throw new Error("CSV is missing an Employee Name header row.");
  }

  const headers = values[headerIndex].map((cell) => normalizeHeader(cell ?? ""));
  const rows: PayslipCsvRow[] = [];

  for (const rawRow of values.slice(headerIndex + 1)) {
    if (!rawRow.some((cell) => cell?.trim())) {
      continue;
    }

    const row: PayslipCsvRow = {};
    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index];
      if (!header) {
        continue;
      }
      row[header] = (rawRow[index] ?? "").trim();
    }

    if (!row["employee name"]?.trim() && !row.email?.trim()) {
      continue;
    }

    rows.push(row);
  }

  return rows;
}
