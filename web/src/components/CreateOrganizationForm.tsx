"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
export default function CreateOrganizationForm(){
 const [name,setName]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!supabase){setMessage("Supabase no está configurado.");return;}
  const clean=name.trim();if(clean.length<2){setMessage("El nombre debe tener al menos 2 caracteres.");return;}
  setBusy(true);setMessage("");
  try{
   const {data,error}=await supabase.functions.invoke("organization-create",{body:{name:clean}});
   if(error||!data?.organization?.id){setMessage(error?.message??"No se pudo crear la organización.");return;}
   const selected=await fetch("/api/organization",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId:data.organization.id})});
   if(selected.ok)router.push("/");else setMessage("Organización creada, pero no se pudo seleccionarla. Vuelve al panel y selecciónala.");
  }catch(e){setMessage(e instanceof Error?e.message:"No se pudo crear la organización.");}
  finally{setBusy(false);}
 }
 return <form onSubmit={submit} className="panel"><label htmlFor="org-name">Nombre de la organización</label><input id="org-name" required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} style={{display:"block",padding:10,width:"100%",margin:"10px 0"}}/><button disabled={busy||!supabase}>{busy?"Creando…":"Crear organización"}</button><p role="status">{message}</p></form>;
}
