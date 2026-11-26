import { describe, expect, it } from "vitest";
import { parseCsvText, parseStatementCsv } from "./statement-csv";

describe("statement CSV", () => {
  it("supports quoted comma and escaped quote", () => {
    expect(parseCsvText('date,description\n2025-01-01,"A, ""B"""')).toEqual([
      ["date","description"],["2025-01-01",'A, "B"']
    ]);
  });
  it("maps valid statement rows", () => {
    const result = parseStatementCsv("Fecha,Monto,Moneda,Referencia,Descripción\n2025-01-02,125.50,VES,R-1,Abono");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amount).toBe(125.5);
    expect(result.errors).toEqual([]);
  });
  it("parses grouped thousands and decimal separators", () => {
    const result = parseStatementCsv("Fecha,Monto,Moneda,Referencia\n2025-01-02,1.250,50,VES,R-1");
    // The comma decimal must be quoted in CSV because it is a delimiter.
    expect(result.errors.length).toBeGreaterThan(0);
    const grouped = parseStatementCsv('Fecha,Monto,Moneda,Referencia\n2025-01-02,"1.250,50",VES,R-1');
    expect(grouped.rows[0].amount).toBe(1250.5);
  });
  it("rejects missing required columns", () => {
    expect(parseStatementCsv("Referencia,Concepto\nR-1,Abono").errors.length).toBeGreaterThan(0);
  });
});
