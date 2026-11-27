"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
export default function DeviceRevokeButton({deviceId,pending=false}:{deviceId:string;pending?:boolean}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function revoke(){
  if(!window.confirm(pending?"¿Rechazar esta solicitud de dispositivo?":"¿Revocar este dispositivo? Dejará de sincronizar."))return;
  setBusy(true);setMessage("");
  try{
   const {data,error}=await supabase?.functions.invoke("device-revoke",{body:{deviceId}})??{data:null,error:new Error("Supabase no configurado")};
   if(error||!data?.ok){setMessage(error?.message??(pending?"No se pudo rechazar.":"No se pudo revocar."));return;}
   setMessage(pending?"Solicitud rechazada.":"Dispositivo revocado.");router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo revocar.");}
  finally{setBusy(false);}
 }
 return <span><button disabled={busy} onClick={()=>void revoke()}>{busy?(pending?"Rechazando…":"Revocando…"):(pending?"Rechazar":"Revocar")}</button>{message&&<small role="status"> {message}</small>}</span>;
}
