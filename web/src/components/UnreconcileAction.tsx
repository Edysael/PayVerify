 "use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
export default function UnreconcileAction({lineId}:{lineId:string}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function undo(){if(!window.confirm("¿Deshacer esta conciliación? La operación quedará registrada en auditoría."))return;setBusy(true);
  const {data,error}=await supabase?.functions.invoke("payment-unreconcile",{body:{lineId}})??{data:null,error:new Error("Supabase no configurado")};
  setBusy(false);if(error||!data?.ok){setMessage(error?.message??"No se pudo deshacer.");return;}setMessage("Conciliación deshecha.");router.refresh();}
 return <span><button disabled={busy} onClick={()=>void undo()}>{busy?"Procesando…":"Deshacer"}</button>{message&&<small role="status"> {message}</small>}</span>;
}
