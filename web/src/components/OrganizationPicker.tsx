"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconChevronDown, IconStore } from "./ui/Icons";

type Organization = { id: string; name: string };
export default function OrganizationPicker({ organizations, activeId }: { organizations: Organization[]; activeId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!organizations.length) return <p className="muted">Tu usuario aún no pertenece a una organización.</p>;
  return <div className="org-picker">
    <label htmlFor="org-select">Organización</label>
    <div className="select-wrap">
      <span className="org-icon" aria-hidden="true"><IconStore size={18} /></span>
      <select id="org-select" value={activeId ?? ""} disabled={busy} onChange={async (e) => {
        const organizationId = e.currentTarget.value;
        setBusy(true); setMessage("");
        try {
          const response = await fetch("/api/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId }) });
          if (response.ok) router.refresh();
          else setMessage("No se pudo cambiar de organización.");
        } catch (err) { setMessage(err instanceof Error ? err.message : "No se pudo cambiar de organización."); }
        finally { setBusy(false); }
      }}>
        <option value="" disabled>Selecciona organización</option>
        {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
      </select>
      <IconChevronDown size={20} className="chev" />
    </div>
    {busy && <span role="status">Cambiando…</span>}
    {message && <span role="status">{message}</span>}
  </div>;
}
