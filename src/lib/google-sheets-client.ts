import { google } from "googleapis";

const DEFAULT_SPREADSHEET_ID = "1MgKRJK7o4K3N-AFk2aiDxx_-anXoKC_h";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

export type GoogleSheetRow = Record<string, string>;

function getSpreadsheetId(): string {
  return process.env.GOOGLE_PAYROLL_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;
}

function getServiceAccountCredentials(): { clientEmail: string; privateKey: string } {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const parsed = JSON.parse(json) as {
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
    }
    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n")
    .trim();

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Google Sheets credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    );
  }

  return { clientEmail, privateKey };
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function rowsToObjects(values: string[][]): GoogleSheetRow[] {
  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map((cell) => normalizeHeader(cell ?? ""));
  const rows: GoogleSheetRow[] = [];

  for (const rawRow of values.slice(1)) {
    if (!rawRow.some((cell) => cell?.trim())) {
      continue;
    }

    const row: GoogleSheetRow = {};
    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index];
      if (!header) {
        continue;
      }
      row[header] = (rawRow[index] ?? "").trim();
    }

    rows.push(row);
  }

  return rows;
}

export async function readPayrollSheetRows(): Promise<GoogleSheetRow[]> {
  const { clientEmail, privateKey } = getServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [SHEETS_SCOPE],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = getSpreadsheetId();
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetTitles =
    metadata.data.sheets
      ?.map((sheet) => sheet.properties?.title?.trim())
      .filter((title): title is string => Boolean(title)) ?? [];

  const allRows: GoogleSheetRow[] = [];

  for (const title of sheetTitles) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${title.replace(/'/g, "''")}'!A1:Z1000`,
    });

    const values = (response.data.values ?? []) as string[][];
    const parsedRows = rowsToObjects(values).map((row) => ({
      ...row,
      "sheet name": title,
    }));
    allRows.push(...parsedRows);
  }

  return allRows;
}
