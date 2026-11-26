export type StatementCsvRow = {
  transactionDate: string;
  amount: number;
  currency: string;
  reference: string | null;
  description: string | null;
};
export type CsvParseResult = { rows: StatementCsvRow[]; errors: string[] };

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;

/** RFC-4180-style parser with quoted fields and escaped double quotes. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') {
      if (field.length) throw new Error("Quote in unquoted field");
      quoted = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n") {
      row.push(field); field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else if (ch !== "\r") field += ch;
  }
  if (quoted) throw new Error("Unclosed quoted field");
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function parseAmount(value: string): number | null {
  let clean = value.trim().replace(/\s/g, "").replace(/VES|Bs\.?/gi, "");
  if (!clean || !/^-?[0-9][0-9.,]*$/.test(clean)) return null;
  const negative = clean.startsWith("-");
  if (negative) clean = clean.slice(1);
  const comma = clean.lastIndexOf(",");
  const dot = clean.lastIndexOf(".");
  let normalized: string;
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const grouping = decimal === "," ? "." : ",";
    normalized = clean.split(grouping).join("").replace(decimal, ".");
  } else {
    const separator = comma >= 0 ? "," : dot >= 0 ? "." : null;
    if (!separator) normalized = clean;
    else {
      const parts = clean.split(separator);
      if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
      if (parts[1].length === 3) normalized = parts[0] + parts[1]; // thousands group
      else if (parts[1].length <= 2) normalized = parts[0] + "." + parts[1];
      else return null;
    }
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number((negative ? "-" : "") + normalized);
  return Number.isFinite(amount) && amount !== 0 ? amount : null;
}
function redactDescription(value: string): string {
  return value.trim()
    .replace(/\b(?:cuenta|account|tarjeta|card)\s*[:#-]?\s*[0-9 -]{6,24}\b/gi, "[redactado]")
    .replace(/\b\d{8,24}\b/g, "[número redactado]")
    .slice(0,160);
}
function parseDate(value: string): string | null {
  const v = value.trim();
  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/.test(v)) {
    const iso = v.replace(" ", "T") + (v.length === 10 ? "T00:00:00Z" : "Z");
    date = new Date(iso);
    const datePart = v.slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
    const [year,month,day] = datePart.split("-").map(Number);
    const check = new Date(Date.UTC(year,month-1,day));
    if (check.getUTCFullYear()!==year || check.getUTCMonth()!==month-1 || check.getUTCDate()!==day) return null;
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d,m,y] = v.split("/"); date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  } else return null;
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Strictly accepts known header aliases; callers preview errors before import. */
export function parseStatementCsv(text: string): CsvParseResult {
  const errors: string[] = [];
  if (new TextEncoder().encode(text).length > MAX_BYTES) return { rows: [], errors: ["El archivo supera 2 MB."] };
  let raw: string[][];
  try { raw = parseCsvText(text); } catch (e) { return { rows: [], errors: [e instanceof Error ? e.message : "CSV inválido"] }; }
  if (raw.length < 2) return { rows: [], errors: ["El CSV no contiene filas de movimientos."] };
  if (raw.length - 1 > MAX_ROWS) return { rows: [], errors: [`Máximo ${MAX_ROWS} filas por importación.`] };
  const headers = raw[0].map(normalizeHeader);
  const find = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h));
  const dateI = find(["fecha","date","transaction_date","fecha_operacion"]);
  const amountI = find(["monto","amount","importe","debit_credit","monto_operacion"]);
  const currencyI = find(["moneda","currency"]);
  const refI = find(["referencia","reference","ref","numero_referencia"]);
  const descI = find(["descripcion","description","concepto","detalle"]);
  if (dateI < 0 || amountI < 0) return { rows: [], errors: ["Se requieren columnas Fecha/Date y Monto/Amount."] };
  const rows: StatementCsvRow[] = [];
  raw.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const date = parseDate(cells[dateI] ?? "");
    const amount = parseAmount(cells[amountI] ?? "");
    const currency = (currencyI >= 0 ? cells[currencyI] : "VES").trim().toUpperCase() || "VES";
    if (!date || amount === null || !/^[A-Z]{3}$/.test(currency)) {
      errors.push(`Fila ${line}: fecha, monto o moneda inválidos.`);
      return;
    }
    rows.push({
      transactionDate: date,
      amount,
      currency,
      reference: refI >= 0 ? (cells[refI] ?? "").trim().slice(0,120) || null : null,
      description: descI >= 0 ? redactDescription(cells[descI] ?? "") || null : null,
    });
  });
  return { rows, errors };
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2,"0")).join("");
}
