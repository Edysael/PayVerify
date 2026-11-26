 "use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Organization = { id: string; name: string };
export default function OrganizationPicker({ organizations, activeId }: { organizations: Organization[]; activeId: string | null }) {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  if (!organizations.length) return <p className="muted">Tu usuario aún no pertenece a una organización.</p>;
  return <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
    <label htmlFor="org-select">Organización</label>
    <select id="org-select" value={activeId ?? ""} disabled={busy} onChange={async e=>{
      setBusy(true); setMessage("");
      const response = await fetch("/api/organization",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId:e.target.value})});
      if(response.ok){router.refresh();} else setMessage("No se pudo cambiar de organización.");
      setBusy(false);
    }}>
      <option value="" disabled>Selecciona organización</option>
      {organizations.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}
    </select>
    {message && <span role="status">{message}</span>}
  </div>;
}
