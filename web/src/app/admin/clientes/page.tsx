import Link from "next/link";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import ClientInviteForm from "../../../components/ClientInviteForm";

// Alta de clientes: solo administradores de plataforma (pv_platform_admins).
export default async function NuevoClientePage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="main"><h1 className="title">Nuevo cliente</h1><p>Configura Supabase.</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="main"><h1 className="title">Nuevo cliente</h1><Link href="/sign-in">Iniciar sesión</Link></main>;
  const { data: isAdmin } = await supabase.rpc("pv_is_platform_admin");
  if (!isAdmin) return <main className="main"><h1 className="title">Nuevo cliente</h1><p>Esta sección es solo para administradores de PayVerify.</p><Link href="/">Volver</Link></main>;
  return <main className="main" style={{ maxWidth: 720 }}>
    <p className="muted">ADMINISTRACIÓN</p>
    <h1 className="title">Nuevo cliente</h1>
    <p className="muted">Crea el restaurante o comercio y envía la invitación al dueño. Le llegará un correo para crear su contraseña y descargar la app. Tú quedas como administrador de ese comercio para darle soporte.</p>
    <ClientInviteForm />
    <p><Link href="/">Volver al resumen</Link></p>
  </main>;
}
