"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function ReconcileAction({ lineId,paymentId,reference }: {lineId:string;paymentId:string;reference:string}) {
  const router=useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
  async function reconcile() {
    if(!supabase||!window.confirm(`¿Confirmas conciliar el movimiento con referencia ${reference}?`)) return;
    setBusy(true);setMessage("");
    try {
      const {data,error}=await supabase.functions.invoke("payment-reconcile",{body:{lineId,paymentId}});
      if(error||!data?.ok){setMessage(error?.message??"No se pudo conciliar.");return;}
      setMessage("Conciliación registrada.");router.refresh();
    } catch(e) {setMessage(e instanceof Error?e.message:"No se pudo conciliar.");}
    finally {setBusy(false);}
  }
  return <span><button disabled={busy} onClick={()=>void reconcile()}>{busy?"Procesando…":"Confirmar conciliación"}</button>{message&&<small role="status"> {message}</small>}</span>;
}
