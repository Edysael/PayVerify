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

describe("statement CSV formats", () => {
  it("detects semicolon-delimited exports with comma decimals", () => {
    const r = parseStatementCsv("Fecha;Monto;Referencia\n02/01/2025;1.250,50;R-1");
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ amount: 1250.5, reference: "R-1", transactionDate: "2025-01-02T00:00:00.000Z" });
  });
  it("accepts day-first dates with -, . and 2-digit years, plus optional time", () => {
    const r = parseStatementCsv("Fecha,Monto\n02-01-2025,10\n02.01.2025,10\n2/1/25,10\n02/01/2025 14:35,10\n2025-01-02 14:35:10,10");
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.transactionDate)).toEqual([
      "2025-01-02T00:00:00.000Z", "2025-01-02T00:00:00.000Z", "2025-01-02T00:00:00.000Z",
      "2025-01-02T14:35:00.000Z", "2025-01-02T14:35:10.000Z",
    ]);
  });
  it("keeps the same timestamps as before for ISO and dd/mm/yyyy (line fingerprints must not change)", () => {
    const r = parseStatementCsv("Fecha,Monto\n2025-03-04,1\n2025-03-04 08:09,1\n04/03/2025,1");
    expect(r.rows.map((x) => x.transactionDate)).toEqual([
      "2025-03-04T00:00:00.000Z", "2025-03-04T08:09:00.000Z", "2025-03-04T00:00:00.000Z",
    ]);
  });
  it("rejects impossible dates and times", () => {
    expect(parseStatementCsv("Fecha,Monto\n31/02/2025,10").errors).toHaveLength(1);
    expect(parseStatementCsv("Fecha,Monto\n2025-02-30,10").errors).toHaveLength(1);
    expect(parseStatementCsv("Fecha,Monto\n01/13/2025,10").errors).toHaveLength(1);
    expect(parseStatementCsv("Fecha,Monto\n01/01/2025 25:00,10").errors).toHaveLength(1);
  });
  it("supports separate credit and debit columns", () => {
    const r = parseStatementCsv('Fecha;Débito;Crédito;Referencia\n02/01/2025;;"500,00";A\n03/01/2025;120,25;;B');
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.amount)).toEqual([500, -120.25]);
  });
  it("rejects rows with both or neither credit and debit", () => {
    const r = parseStatementCsv("Fecha,Abono,Cargo\n02/01/2025,10,5\n03/01/2025,,");
    expect(r.rows).toHaveLength(0);
    expect(r.errors).toHaveLength(2);
  });
  it("prefers the Monto column when both layouts are present", () => {
    const r = parseStatementCsv("Fecha,Monto,Abono\n02/01/2025,-7,9");
    expect(r.rows[0].amount).toBe(-7);
  });
  it("ignores a UTF-8 BOM", () => {
    expect(parseStatementCsv("﻿Fecha,Monto\n2025-01-02,5").rows).toHaveLength(1);
  });
});
