 "use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../lib/supabase";
export default function CreateOrganizationForm(){
 const [name,setName]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();
 async function submit(e:React.FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setMessage("");
  const {data,error}=await supabase.functions.invoke("organization-create",{body:{name}});
  if(error||!data?.organization?.id){setMessage(error?.message??"No se pudo crear la organización.");setBusy(false);return;}
  const selected=await fetch("/api/organization",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId:data.organization.id})});
  setBusy(false);if(selected.ok)router.push("/");else setMessage("Organización creada; selecciónala desde el panel.");
 }
 return <form onSubmit={submit} className="panel"><label htmlFor="org-name">Nombre de la organización</label><input id="org-name" required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} style={{display:"block",padding:10,width:"100%",margin:"10px 0"}}/><button disabled={busy||!supabase}>{busy?"Creando…":"Crear organización"}</button><p role="status">{message}</p></form>;
}
