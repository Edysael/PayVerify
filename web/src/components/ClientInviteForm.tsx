'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Result = { organization: { id: string; name: string }; ownerEmail: string; invited: boolean; apiKey: string | null };

const ERRORS: Record<string, string> = {
  forbidden: 'Tu usuario no es administrador de PayVerify.',
  invalid_organization_name: 'Escribe el nombre del comercio (2 a 160 caracteres).',
  invalid_email: 'Revisa el correo del dueño.',
  invite_failed: 'No se pudo enviar la invitación. Revisa el correo e intenta de nuevo.',
  invalid_app_url: 'Esta dirección del panel no está permitida para invitaciones.',
};

const input: React.CSSProperties = { display: 'block', width: '100%', padding: 12, margin: '6px 0 14px', border: '1px solid #cbd5e1', borderRadius: 8 };

export default function ClientInviteForm() {
  const [orgName, setOrgName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage('Supabase no está configurado.'); return; }
    setBusy(true); setMessage(''); setResult(null); setCopied(false);
    try {
      const { data, error } = await supabase.functions.invoke('client-invite', {
        body: { organizationName: orgName, ownerName, ownerEmail: email, appUrl: window.location.origin },
      });
      if (error) {
        let code = '';
        try { code = (await (error as { context?: Response }).context?.json())?.error ?? ''; } catch { /* sin detalle */ }
        setMessage(ERRORS[code] ?? 'No se pudo crear el cliente.');
        return;
      }
      setResult(data as Result); setOrgName(''); setOwnerName(''); setEmail('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo crear el cliente.');
    } finally { setBusy(false); }
  }

  async function copyKey() {
    if (!result?.apiKey) return;
    try { await navigator.clipboard.writeText(result.apiKey); setCopied(true); } catch { setCopied(false); }
  }

  return <>
    <form onSubmit={submit} className="panel">
      <label htmlFor="org">Nombre del restaurante o comercio</label>
      <input id="org" required value={orgName} onChange={e => setOrgName(e.target.value)} style={input} />
      <label htmlFor="owner">Nombre del dueño</label>
      <input id="owner" value={ownerName} onChange={e => setOwnerName(e.target.value)} style={input} />
      <label htmlFor="email">Correo del dueño</label>
      <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} style={input} />
      <button type="submit" disabled={busy} style={{ padding: '12px 18px', background: '#111b2c', color: 'white', border: 0, borderRadius: 8 }}>
        {busy ? 'Creando…' : 'Crear e invitar'}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
    {result && <section className="panel" role="status">
      <h2>✓ {result.organization.name} creado</h2>
      <p>{result.invited
        ? <>Enviamos la invitación a <strong>{result.ownerEmail}</strong>. Debe abrir el correo, crear su contraseña y descargar la app.</>
        : <><strong>{result.ownerEmail}</strong> ya tenía cuenta: quedó como dueño de este comercio. Avísale que ya puede entrar con su contraseña.</>}</p>
      {result.apiKey ? <>
        <p><strong>Llave de API para TomaYa</strong> (cópiala ahora: no se vuelve a mostrar):</p>
        <code style={{ display: 'block', wordBreak: 'break-all', padding: 12, background: '#f4f6f9', borderRadius: 8 }}>{result.apiKey}</code>
        <p><button type="button" onClick={() => void copyKey()}>{copied ? 'Copiada ✓' : 'Copiar llave'}</button></p>
      </> : <p>No se pudo generar la llave de API; créala en «Llaves de API» del comercio.</p>}
    </section>}
  </>;
}
