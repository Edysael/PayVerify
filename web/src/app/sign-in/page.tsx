'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogoMark } from '../../components/ui/Icons';

type Mode = 'login' | 'signup' | 'forgot';

const MIN_PASSWORD = 8;

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) return 'Tu correo aún no está confirmado. Revisa el correo de confirmación que te enviamos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya tiene cuenta. Inicia sesión o recupera tu contraseña.';
  if (m.includes('password should be') || m.includes('weak password')) return `La contraseña es muy débil. Usa al menos ${MIN_PASSWORD} caracteres.`;
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
  return message;
}

const input: React.CSSProperties = { display: 'block', width: '100%', height: 48, margin: '6px 0 14px' };
const primary: React.CSSProperties = { width: '100%', height: 48 };
const link: React.CSSProperties = { background: 'none', border: 0, padding: 0, color: 'var(--brand)', fontWeight: 600 };

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) { setMode(next); setMessage(''); setPassword(''); setConfirm(''); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage('Configura las variables de Supabase.'); return; }
    const cleanEmail = email.trim();
    if (!cleanEmail) { setMessage('Escribe tu correo electrónico.'); return; }

    if (mode !== 'forgot') {
      if (password.length < MIN_PASSWORD) { setMessage(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`); return; }
      if (mode === 'signup' && password !== confirm) { setMessage('Las contraseñas no coinciden.'); return; }
    }

    setBusy(true); setMessage('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) { setMessage(translateError(error.message)); return; }
        // Navegación completa: el servidor lee la sesión nueva y el navegador ofrece guardar la contraseña.
        window.location.assign('/');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) { setMessage(translateError(error.message)); return; }
        if (data.session) { window.location.assign('/'); return; }
        setMessage('Cuenta creada. Te enviamos un correo para confirmarla (solo esta vez). Después entrarás siempre con tu contraseña.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
        });
        if (error) { setMessage(translateError(error.message)); return; }
        setMessage('Si el correo tiene cuenta, te llegará un enlace para crear una contraseña nueva.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo completar la operación.');
    } finally { setBusy(false); }
  }

  const title = mode === 'login' ? 'Acceso a PayVerify' : mode === 'signup' ? 'Crear cuenta' : 'Recuperar contraseña';
  const action = mode === 'login' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace de recuperación';

  return <main className="auth"><div className="auth-card">
    <div className="brand" aria-label="PayVerify">
      <LogoMark size={46} />
      <span><span className="brand-name">PayVerify</span><span className="brand-tag" style={{ display: 'block' }}>Verificación y Conciliación de Pagos</span></span>
    </div>
    <h1 style={{ fontSize: 24, marginBottom: 6 }}>{title}</h1>
    {mode === 'forgot' && <p className="muted">Te enviaremos un enlace para crear una contraseña nueva.</p>}
    <form onSubmit={onSubmit} method="post" action="#">
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" name="email" type="email" autoComplete={mode === 'signup' ? 'email' : 'username'} required
        value={email} onChange={e => setEmail(e.target.value)} style={input} />
      {mode !== 'forgot' && <>
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={MIN_PASSWORD}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password} onChange={e => setPassword(e.target.value)} style={input} />
      </>}
      {mode === 'signup' && <>
        <label htmlFor="confirm">Repite la contraseña</label>
        <input id="confirm" name="confirm" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password"
          value={confirm} onChange={e => setConfirm(e.target.value)} style={input} />
      </>}
      <button type="submit" className="primary" disabled={busy} style={primary}>{busy ? 'Procesando…' : action}</button>
    </form>
    <p role="status" style={{ minHeight: 24 }}>{message}</p>
    <p className="muted" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {mode !== 'login' && <button type="button" style={link} onClick={() => switchMode('login')}>Ya tengo cuenta</button>}
      {mode !== 'signup' && <button type="button" style={link} onClick={() => switchMode('signup')}>Crear cuenta</button>}
      {mode !== 'forgot' && <button type="button" style={link} onClick={() => switchMode('forgot')}>Olvidé mi contraseña</button>}
    </p>
    <p className="muted" style={{ marginBottom: 0 }}>¿Vas a recibir pagos en un teléfono Android? <a href="/descargar">Descarga la app</a>.</p>
  </div></main>;
}
