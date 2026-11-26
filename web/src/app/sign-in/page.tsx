'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage('Configura las variables de Supabase.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setMessage(error ? 'No se pudo enviar el enlace. Verifica Supabase Auth.' : 'Revisa tu correo para iniciar sesión.');
    setBusy(false);
  }

  return <main style={{maxWidth:420,margin:'10vh auto',padding:24,background:'white',borderRadius:16}}>
    <h1>Acceso a PayVerify</h1>
    <p>Inicia sesión con un enlace seguro enviado a tu correo.</p>
    <form onSubmit={signIn}>
      <label htmlFor="email">Correo electrónico</label>
      <input id="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',padding:12,margin:'12px 0'}} />
      <button disabled={busy} style={{padding:'12px 18px'}}>{busy?'Enviando…':'Enviar enlace'}</button>
    </form>
    <p role="status">{message}</p>
  </main>;
}
