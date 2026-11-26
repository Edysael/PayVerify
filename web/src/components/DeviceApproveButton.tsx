 "use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
export default function DeviceApproveButton({deviceId}:{deviceId:string}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function approve(){setBusy(true);const {data,error}=await supabase?.functions.invoke("device-approve",{body:{deviceId}})??{data:null,error:new Error("Supabase no configurado")};setBusy(false);if(error||!data?.ok){setMessage(error?.message??"Error");return;}setMessage("Aprobado");router.refresh();}
 return <span><button disabled={busy} onClick={()=>void approve()}>{busy?"Aprobando…":"Aprobar dispositivo"}</button>{message&&<small role="status"> {message}</small>}</span>;
}
