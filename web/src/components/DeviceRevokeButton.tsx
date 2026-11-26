 "use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
export default function DeviceRevokeButton({deviceId}:{deviceId:string}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function revoke(){if(!window.confirm("¿Revocar este dispositivo? Dejará de sincronizar."))return;setBusy(true);
  const {data,error}=await supabase?.functions.invoke("device-revoke",{body:{deviceId}})??{data:null,error:new Error("Supabase no configurado")};
  setBusy(false);if(error||!data?.ok){setMessage(error?.message??"No se pudo revocar.");return;}setMessage("Revocado.");router.refresh();}
 return <span><button disabled={busy} onClick={()=>void revoke()}>{busy?"Revocando…":"Revocar"}</button>{message&&<small role="status"> {message}</small>}</span>;
}
