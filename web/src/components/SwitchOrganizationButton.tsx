"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SwitchOrganizationButton({ organizationId, active }: { organizationId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (active) return <span className="badge green">Activa</span>;
  return <span>
    <button disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try {
        const r = await fetch("/api/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId }) });
        if (!r.ok) { setError("No se pudo cambiar."); return; }
        router.push("/"); router.refresh();
      } finally { setBusy(false); }
    }}>{busy ? "Cambiando…" : "Usar esta"}</button>
    {error && <small role="status"> {error}</small>}
  </span>;
}
