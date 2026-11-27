"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
// Para pagos POSSIBLE_DUPLICATE: marcar como pago válido (no duplicado) o confirmar el duplicado (rechazar).
export default function DuplicateResolveAction({paymentId}:{paymentId:string}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function resolve(decision:"not_duplicate"|"duplicate"){
  const q=decision==="not_duplicate"?"¿Este pago NO es un duplicado? Volverá al flujo normal y se intentará vincular a una orden.":"¿Confirmar que es un duplicado? El pago quedará rechazado.";
  if(!window.confirm(q))return;
  setBusy(true);setMessage("");
  try{
   const {data,error}=await supabase?.functions.invoke("payment-duplicate-resolve",{body:{paymentId,decision}})??{data:null,error:new Error("Supabase no configurado")};
   if(error||!data?.ok){setMessage(error?.message??"No se pudo resolver.");return;}
   setMessage(decision==="not_duplicate"?"Marcado como válido.":"Duplicado rechazado.");router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo resolver.");}
  finally{setBusy(false);}
 }
 return <span><button disabled={busy} onClick={()=>void resolve("not_duplicate")}>No es duplicado</button> <button disabled={busy} onClick={()=>void resolve("duplicate")}>Es duplicado</button>{message&&<small role="status"> {message}</small>}</span>;
}
