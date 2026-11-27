'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogoMark } from '../../components/ui/Icons';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage('Configura las variables de Supabase.'); return; }
    const cleanEmail = email.trim();
    if (!cleanEmail) { setMessage('Escribe tu correo electrónico.'); return; }
    setBusy(true); setMessage('Enviando enlace de acceso…');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      setMessage(error ? 'No se pudo enviar el enlace. Verifica Supabase Auth y el proveedor de correo.' : 'Listo. Revisa tu correo y abre el enlace para entrar.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo enviar el enlace de acceso.');
    } finally { setBusy(false); }
  }

  return <main className="auth">
    <div className="auth-card">
      <div className="brand" aria-label="PayVerify">
        <LogoMark size={46} />
        <span><span className="brand-name">PayVerify</span><span className="brand-tag" style={{ display: 'block' }}>Verificación y Conciliación de Pagos</span></span>
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Inicia sesión</h1>
      <p className="muted" style={{ marginTop: 0 }}>Te enviaremos un enlace seguro a tu correo. No necesitas contraseña.</p>
      <form onSubmit={signIn}>
        <label htmlFor="email">Correo electrónico</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" />
        <button className="primary" disabled={busy || !email.trim()}>{busy ? 'Enviando…' : 'Enviar enlace de acceso'}</button>
      </form>
      <p role="status" style={{ minHeight: 22, marginBottom: 0 }}>{message}</p>
    </div>
  </main>;
}
