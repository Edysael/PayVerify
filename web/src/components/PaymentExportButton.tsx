"use client";
import {useState} from "react";
import type {PaymentRow} from "../lib/payments-types";
import {downloadPaymentsCsv} from "../lib/csv-export";
export default function PaymentExportButton({rows}:{rows:PaymentRow[]}){
 const [message,setMessage]=useState("");
 function exportCsv(){
  try{downloadPaymentsCsv(rows);setMessage(`Exportación iniciada: ${rows.length} registros.`);}
  catch(e){setMessage(e instanceof Error?e.message:"No se pudo exportar el CSV.");}
 }
 return <span><button onClick={exportCsv} disabled={!rows.length}>Exportar CSV</button>{message&&<small role="status"> {message}</small>}</span>;
}
