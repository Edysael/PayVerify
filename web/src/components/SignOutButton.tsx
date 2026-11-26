"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
export default function SignOutButton(){
 const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function signOut(){
  if(!supabase){setMessage("Supabase no está configurado.");return;}
  setBusy(true);setMessage("");
  try{const {error}=await supabase.auth.signOut();if(error){setMessage(error.message);return;}router.push("/sign-in");router.refresh();}
  catch(e){setMessage(e instanceof Error?e.message:"No se pudo cerrar sesión.");}
  finally{setBusy(false);}
 }
 return <span><button disabled={busy} onClick={()=>void signOut()}>{busy?"Cerrando…":"Cerrar sesión"}</button>{message&&<small role="status">{message}</small>}</span>;
}
