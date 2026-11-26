"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export type ApiKeyRow = { id: string; label: string; created_at: string; revoked_at: string | null; last_used_at: string | null };

export default function ApiKeyManager({ organizationId, keys }: { organizationId: string; keys: ApiKeyRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [newKey, setNewKey] = useState("");

  async function create() {
    if (!supabase) { setMessage("Supabase no está configurado."); return; }
    setBusy(true); setMessage(""); setNewKey("");
    try {
      const { data, error } = await supabase.functions.invoke("api-key-create", { body: { organizationId, label: label.trim() } });
      if (error || !data?.apiKey) { setMessage(error?.message ?? "No se pudo crear la llave."); return; }
      setNewKey(data.apiKey); setLabel(""); setMessage("Llave creada. Cópiala ahora: solo se muestra una vez."); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo crear la llave."); }
    finally { setBusy(false); }
  }
  async function copyKey() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("El navegador no permite copiar automáticamente. Selecciona y copia la llave.");
      await navigator.clipboard.writeText(newKey); setMessage("Llave copiada al portapapeles.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo copiar la llave."); }
  }
  async function revoke(id: string) {
    if (!supabase || !window.confirm("¿Revocar esta llave? Tu checkout dejará de poder usarla.")) return;
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("api-key-create", { body: { organizationId, revokeKeyId: id } });
      if (error || data?.ok === false) { setMessage(error?.message ?? "No se pudo revocar la llave."); return; }
      setMessage("Llave revocada."); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo revocar la llave."); }
    finally { setBusy(false); }
  }

  return <section className="panel">
    <h2>Llaves de API para tu checkout</h2>
    <p className="muted">Con una llave, tu app crea órdenes y consulta si ya se pagaron. Cada llave se muestra una sola vez.</p>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nombre (ej: Checkout tienda)" maxLength={80} />
      <button disabled={busy || label.trim().length === 0 || !supabase} onClick={() => void create()}>{busy?"Procesando…":"Crear llave"}</button>
    </div>
    {newKey && <div className="panel" role="alert">
      <strong>Copia esta llave ahora:</strong>
      <p style={{ wordBreak: "break-all", fontFamily: "monospace" }}>{newKey}</p>
      <button disabled={busy} onClick={() => void copyKey()}>Copiar</button>
    </div>}
    {message && <p role="status">{message}</p>}
    {keys.length === 0 ? <p>No hay llaves creadas.</p> :
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Nombre", "Creada", "Último uso", "Estado", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: 10 }}>{h}</th>)}</tr></thead>
        <tbody>{keys.map((k) => <tr key={k.id}>
          <td style={{ padding: 10 }}>{k.label}</td>
          <td style={{ padding: 10 }}>{new Date(k.created_at).toLocaleString("es-CL")}</td>
          <td style={{ padding: 10 }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleString("es-CL") : "—"}</td>
          <td style={{ padding: 10 }}>{k.revoked_at ? "Revocada" : "Activa"}</td>
          <td style={{ padding: 10 }}>{!k.revoked_at && <button disabled={busy} onClick={() => void revoke(k.id)}>Revocar</button>}</td>
        </tr>)}</tbody>
      </table>}
  </section>;
}
