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

/** Picks "," or ";" from the header line (many bank exports use ";" with "," decimals). */
export function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  let commas = 0, semis = 0, quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === ",") commas++;
    else if (!quoted && ch === ";") semis++;
  }
  return semis > commas ? ";" : ",";
}

/** RFC-4180-style parser with quoted fields and escaped double quotes. */
export function parseCsvText(text: string, delimiter: "," | ";" = ","): string[][] {
  text = text.replace(/^\uFEFF/, "");
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
    } else if (ch === delimiter) {
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
/** Credit/debit columns: exactly one must have a value; debit becomes negative. */
function splitAmount(credit: string, debit: string): number | null {
  const c = credit.trim() ? parseAmount(credit.replace(/^-/, "")) : null;
  const d = debit.trim() ? parseAmount(debit.replace(/^-/, "")) : null;
  if (credit.trim() && c === null) return null;
  if (debit.trim() && d === null) return null;
  if ((c === null) === (d === null)) return null;
  return c !== null ? Math.abs(c) : -Math.abs(d as number);
}
function redactDescription(value: string): string {
  return value.trim()
    .replace(/\b(?:cuenta|account|tarjeta|card)\s*[:#-]?\s*[0-9 -]{6,24}\b/gi, "[redactado]")
    .replace(/\b\d{8,24}\b/g, "[número redactado]")
    .slice(0,160);
}
function validYmd(year: number, month: number, day: number): boolean {
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}
/**
 * Accepts ISO (yyyy-mm-dd [hh:mm[:ss]]) and day-first dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
 * (also 2-digit years, interpreted as 20yy), each with an optional hh:mm[:ss] time.
 * Dates without a zone are read as UTC, as before, so files imported earlier keep the same line fingerprints.
 */
function parseDate(value: string): string | null {
  const v = value.trim();
  let y: number, mo: number, d: number, time = "00:00:00";
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?$/.exec(v);
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (m[4]) time = m[4];
  } else {
    m = /^(\d{1,2})([/.-])(\d{1,2})\2(\d{4}|\d{2})(?:[ T](\d{1,2}:\d{2}(?::\d{2})?))?$/.exec(v);
    if (!m) return null;
    [d, mo] = [Number(m[1]), Number(m[3])];
    y = m[4].length === 2 ? 2000 + Number(m[4]) : Number(m[4]);
    if (m[5]) time = m[5];
  }
  if (!validYmd(y, mo, d)) return null;
  const [hh, mi, ss = "0"] = time.split(":");
  if (Number(hh) > 23 || Number(mi) > 59 || Number(ss) > 59) return null;
  const date = new Date(Date.UTC(y, mo - 1, d, Number(hh), Number(mi), Number(ss)));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Strictly accepts known header aliases; callers preview errors before import. */
export function parseStatementCsv(text: string): CsvParseResult {
  const errors: string[] = [];
  if (new TextEncoder().encode(text).length > MAX_BYTES) return { rows: [], errors: ["El archivo supera 2 MB."] };
  let raw: string[][];
  try { raw = parseCsvText(text, detectDelimiter(text)); } catch (e) { return { rows: [], errors: [e instanceof Error ? e.message : "CSV inválido"] }; }
  if (raw.length < 2) return { rows: [], errors: ["El CSV no contiene filas de movimientos."] };
  if (raw.length - 1 > MAX_ROWS) return { rows: [], errors: [`Máximo ${MAX_ROWS} filas por importación.`] };
  const headers = raw[0].map(normalizeHeader);
  const find = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h));
  const dateI = find(["fecha","date","transaction_date","fecha_operacion"]);
  const amountI = find(["monto","amount","importe","debit_credit","monto_operacion"]);
  // Some banks export separate columns: credit (money in) and debit (money out).
  const creditI = find(["credito","creditos","abono","abonos","haber","credit","deposito","depositos","ingreso","ingresos"]);
  const debitI = find(["debito","debitos","cargo","cargos","debe","debit","retiro","retiros","egreso","egresos"]);
  const currencyI = find(["moneda","currency"]);
  const refI = find(["referencia","reference","ref","numero_referencia"]);
  const descI = find(["descripcion","description","concepto","detalle"]);
  const split = amountI < 0 && (creditI >= 0 || debitI >= 0);
  if (dateI < 0 || (amountI < 0 && !split)) return { rows: [], errors: ["Se requieren columnas Fecha/Date y Monto/Amount (o Crédito/Débito)."] };
  const rows: StatementCsvRow[] = [];
  raw.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const date = parseDate(cells[dateI] ?? "");
    const amount = split ? splitAmount(cells[creditI] ?? "", cells[debitI] ?? "") : parseAmount(cells[amountI] ?? "");
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
