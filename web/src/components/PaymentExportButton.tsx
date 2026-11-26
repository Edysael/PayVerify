 "use client";
import type {PaymentRow} from "../lib/payments-types";
import {downloadPaymentsCsv} from "../lib/csv-export";
export default function PaymentExportButton({rows}:{rows:PaymentRow[]}){
 return <button onClick={()=>downloadPaymentsCsv(rows)} disabled={!rows.length}>Exportar CSV</button>;
}
