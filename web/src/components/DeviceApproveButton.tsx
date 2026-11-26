"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
export default function DeviceApproveButton({deviceId}:{deviceId:string}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function approve(){
  if(!window.confirm("¿Aprobar este dispositivo para la organización?"))return;
  setBusy(true);setMessage("");
  try {
   const {data,error}=await supabase?.functions.invoke("device-approve",{body:{deviceId}})??{data:null,error:new Error("Supabase no configurado")};
   if(error||!data?.ok){setMessage(error?.message??"No se pudo aprobar el dispositivo.");return;}
   setMessage("Dispositivo aprobado.");router.refresh();
  } catch(e){setMessage(e instanceof Error?e.message:"No se pudo aprobar el dispositivo.");}
  finally{setBusy(false);}
 }
 return <span><button disabled={busy} onClick={()=>void approve()}>{busy?"Aprobando…":"Aprobar dispositivo"}</button>{message&&<small role="status"> {message}</small>}</span>;
}
