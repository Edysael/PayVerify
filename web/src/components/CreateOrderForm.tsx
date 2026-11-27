"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

const ERRORS: Record<string, string> = {
  invalid_external_ref: "La referencia de la orden solo admite letras, números, punto, guion, guion bajo y barra (máx. 64).",
  invalid_amount: "El monto debe ser mayor que cero.",
  invalid_expiry: "El vencimiento debe estar entre 1 y 1.440 minutos.",
  invalid_reference_tail: "La terminación de referencia debe tener de 4 a 12 letras o números.",
  invalid_phone: "El teléfono debe tener exactamente 4 dígitos.",
  bank_account_not_found: "La cuenta bancaria no pertenece a esta organización.",
  external_ref_amount_conflict: "Ya existe una orden con esa referencia y otro monto.",
  forbidden: "Tu rol no permite crear órdenes en esta organización.",
};

export default function CreateOrderForm({ organizationId, bankAccounts }: {
  organizationId: string; bankAccounts: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [ref, setRef] = useState(() => `PV-${Date.now().toString().slice(-6)}`);
  const [amount, setAmount] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [tail, setTail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [bank, setBank] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage("Supabase no está configurado."); return; }
    const cents = Math.round(Number(amount.replace(/\./g, "").replace(",", ".")) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) { setMessage(ERRORS.invalid_amount); return; }
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.functions.invoke("order-create", {
        body: {
          organizationId, externalRef: ref.trim(), amountMinorUnits: cents, expiresInMinutes: Number(minutes),
          expectedReferenceTail: tail.trim() || undefined, customerPhoneLast4: phone.trim() || undefined,
          description: description.trim() || undefined, bankAccountId: bank || undefined,
        },
      });
      if (error) {
        let code = "";
        try { code = (await (error as { context?: Response }).context?.json())?.error ?? ""; } catch { /* sin cuerpo */ }
        setMessage(ERRORS[code] ?? "No se pudo crear la orden. Inténtalo de nuevo.");
        return;
      }
      if (data?.duplicate) { setMessage(`Ya existía la orden ${data.externalRef}; no se creó otra.`); return; }
      router.push("/orders"); router.refresh();
    } catch (err) { setMessage(err instanceof Error ? err.message : "No se pudo crear la orden."); }
    finally { setBusy(false); }
  }

  return <form className="panel" onSubmit={submit} style={{ maxWidth: 820 }}>
    <h2>Datos de la orden</h2>
    <div className="form-grid">
      <div className="field"><label htmlFor="o-ref">Referencia de la orden</label>
        <input id="o-ref" value={ref} onChange={(e) => setRef(e.target.value)} required maxLength={64} pattern="[\w./\-]{1,64}" /></div>
      <div className="field"><label htmlFor="o-amount">Monto (VES)</label>
        <input id="o-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
      <div className="field"><label htmlFor="o-min">Vence en (minutos)</label>
        <input id="o-min" type="number" min={1} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} required /></div>
      <div className="field"><label htmlFor="o-bank">Cuenta bancaria (opcional)</label>
        <select id="o-bank" value={bank} onChange={(e) => setBank(e.target.value)} style={{ height: 44 }}>
          <option value="">Cualquiera</option>
          {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select></div>
      <div className="field"><label htmlFor="o-tail">Terminación de referencia esperada (opcional)</label>
        <input id="o-tail" value={tail} onChange={(e) => setTail(e.target.value.toUpperCase())} maxLength={12} placeholder="Ej. 4321" /></div>
      <div className="field"><label htmlFor="o-phone">Últimos 4 del teléfono del pagador (opcional)</label>
        <input id="o-phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Ej. 9812" /></div>
      <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="o-desc">Descripción (opcional)</label>
        <input id="o-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Ej. Mesa 4, pedido #128" /></div>
    </div>
    <div className="form-actions">
      <button className="primary" disabled={busy}>{busy ? "Creando…" : "Crear orden"}</button>
      <Link href="/orders">Cancelar</Link>
      {message && <span role="status">{message}</span>}
    </div>
  </form>;
}
