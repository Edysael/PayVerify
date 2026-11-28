"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { formatDate } from "../lib/format";

export type BankAccount = { id: string; bank_name: string; account_alias: string; account_type: string | null; currency: string; status: string; created_at: string };

// Escritura directa con la sesión del usuario: la política RLS solo la permite a owner/admin/operator.
export default function BankAccountManager({ organizationId, accounts }: { organizationId: string; accounts: BankAccount[] }) {
  const router = useRouter();
  const [bank, setBank] = useState("");
  const [alias, setAlias] = useState("");
  const [type, setType] = useState("corriente");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage("Supabase no está configurado."); return; }
    const b = bank.trim(), a = alias.trim();
    if (!b || b.length > 120 || !a || a.length > 80) { setMessage("Escribe el banco (máx. 120) y un alias (máx. 80)."); return; }
    if (/\d{8,}/.test(a)) { setMessage("No guardes el número de cuenta completo en el alias; usa por ejemplo «Principal …4321»."); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.from("pv_bank_accounts").insert({ organization_id: organizationId, bank_name: b, account_alias: a, account_type: type, currency: "VES", status: "active" });
      if (error) { setMessage("No se pudo agregar. Tu rol debe ser propietario, administrador u operador."); return; }
      setBank(""); setAlias(""); setMessage("Cuenta agregada."); router.refresh();
    } finally { setBusy(false); }
  }
  async function toggle(acc: BankAccount) {
    if (!supabase) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.from("pv_bank_accounts").update({ status: acc.status === "active" ? "inactive" : "active" }).eq("id", acc.id);
      if (error) setMessage("No se pudo actualizar la cuenta."); else router.refresh();
    } finally { setBusy(false); }
  }

  return <>
    <section className="panel" style={{ overflowX: "auto" }}>
      <h2>Cuentas registradas ({accounts.length})</h2>
      {accounts.length === 0 ? <div className="empty">Aún no hay cuentas. Agrega la cuenta donde recibes los pagos.</div> : <table>
        <thead><tr>{["Banco", "Alias", "Tipo", "Moneda", "Estado", "Creada", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: 12 }}>{h}</th>)}</tr></thead>
        <tbody>{accounts.map((a) => <tr key={a.id}>
          <td style={{ padding: 12, fontWeight: 600 }}>{a.bank_name}</td>
          <td style={{ padding: 12 }}>{a.account_alias}</td>
          <td style={{ padding: 12, textTransform: "capitalize" }}>{a.account_type ?? "—"}</td>
          <td style={{ padding: 12 }}>{a.currency}</td>
          <td style={{ padding: 12 }}><span className={`badge ${a.status === "active" ? "green" : "gray"}`}>{a.status === "active" ? "Activa" : "Inactiva"}</span></td>
          <td style={{ padding: 12 }}>{formatDate(a.created_at)}</td>
          <td style={{ padding: 12, textAlign: "right" }}><button disabled={busy} onClick={() => void toggle(a)}>{a.status === "active" ? "Desactivar" : "Activar"}</button></td>
        </tr>)}</tbody>
      </table>}
    </section>
    <form className="panel" onSubmit={add} style={{ maxWidth: 820 }}>
      <h2>Agregar cuenta</h2>
      <div className="form-grid">
        <div className="field"><label htmlFor="b-bank">Banco</label><input id="b-bank" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ej. Banco de Venezuela" maxLength={120} required /></div>
        <div className="field"><label htmlFor="b-alias">Alias</label><input id="b-alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Ej. Principal …4321" maxLength={80} required /></div>
        <div className="field"><label htmlFor="b-type">Tipo</label>
          <select id="b-type" value={type} onChange={(e) => setType(e.target.value)} style={{ height: 44 }}>
            <option value="corriente">Corriente</option><option value="ahorro">Ahorro</option><option value="pago_movil">Pago móvil</option>
          </select></div>
      </div>
      <div className="form-actions"><button className="primary" disabled={busy}>{busy ? "Guardando…" : "Agregar cuenta"}</button>{message && <span role="status">{message}</span>}</div>
      <p className="muted" style={{ marginBottom: 0 }}>No registres el número de cuenta completo: basta un alias reconocible.</p>
    </form>
  </>;
}
