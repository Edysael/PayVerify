'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { LogoMark } from '../../../components/ui/Icons';

const MIN_PASSWORD = 8;
const input: React.CSSProperties = { display: 'block', width: '100%', height: 48, margin: '6px 0 14px' };

// Se llega aquí desde el enlace de "Olvidé mi contraseña" (el callback ya abrió la sesión).
export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage('Configura las variables de Supabase.'); return; }
    if (password.length < MIN_PASSWORD) { setMessage(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`); return; }
    if (password !== confirm) { setMessage('Las contraseñas no coinciden.'); return; }
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setMessage(error.message.toLowerCase().includes('session') ? 'El enlace expiró. Pide uno nuevo desde "Olvidé mi contraseña".' : error.message); return; }
      window.location.assign('/');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo guardar la contraseña.');
    } finally { setBusy(false); }
  }

  return <main className="auth"><div className="auth-card">
    <div className="brand" aria-label="PayVerify"><LogoMark size={46} /><span><span className="brand-name">PayVerify</span><span className="brand-tag" style={{ display: 'block' }}>Verificación y Conciliación de Pagos</span></span></div>
    <h1 style={{ fontSize: 24, marginBottom: 6 }}>Nueva contraseña</h1>
    <form onSubmit={onSubmit} method="post" action="#">
      <label htmlFor="password">Contraseña nueva</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD}
        value={password} onChange={e => setPassword(e.target.value)} style={input} />
      <label htmlFor="confirm">Repite la contraseña</label>
      <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD}
        value={confirm} onChange={e => setConfirm(e.target.value)} style={input} />
      <button type="submit" className="primary" disabled={busy} style={{ width: '100%', height: 48 }}>
        {busy ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
    <p role="status">{message}</p>
  </div></main>;
}
