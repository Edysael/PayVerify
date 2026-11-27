"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  IconBank, IconDevice, IconHome, IconKey, IconLogout, IconMenu, IconOrders, IconOrganizations,
  IconPayments, IconSenders, IconSettings, IconStatements, IconUsers, IconX, LogoMark,
} from "../ui/Icons";

const MAIN = [
  { href: "/", label: "Resumen", Icon: IconHome },
  { href: "/orders", label: "Órdenes", Icon: IconOrders },
  { href: "/payments", label: "Pagos", Icon: IconPayments },
  { href: "/statements", label: "Extractos y conciliación", Icon: IconStatements },
  { href: "/devices", label: "Dispositivos", Icon: IconDevice },
  { href: "/settings/senders", label: "Remitentes (SMS y apps)", Icon: IconSenders },
  { href: "/settings/api-keys", label: "Llaves de API", Icon: IconKey },
];
const ADMIN = [
  { href: "/organizations", label: "Organizaciones", Icon: IconOrganizations },
  { href: "/settings/members", label: "Usuarios y roles", Icon: IconUsers },
  { href: "/settings/bank-accounts", label: "Cuentas bancarias", Icon: IconBank },
  { href: "/settings", label: "Configuración", Icon: IconSettings },
];
const ALL = [...MAIN, ...ADMIN].map((i) => i.href);

/** La ruta más específica que coincide es la activa (así /settings no se marca en /settings/senders). */
function activeHref(pathname: string): string | null {
  const hits = ALL.filter((h) => h === "/" ? pathname === "/" : pathname === h || pathname.startsWith(h + "/"));
  return hits.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function Brand() {
  return <Link href="/" className="brand" aria-label="PayVerify, ir al resumen">
    <LogoMark size={46} />
    <span><span className="brand-name">PayVerify</span><span className="brand-tag" style={{ display: "block" }}>Verificación y Conciliación de Pagos</span></span>
  </Link>;
}

export default function Sidebar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = activeHref(pathname);
  useEffect(() => { setOpen(false); }, [pathname]);

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    try { await supabase.auth.signOut(); router.push("/sign-in"); router.refresh(); }
    finally { setBusy(false); }
  }
  const item = ({ href, label, Icon }: (typeof MAIN)[number]) =>
    <Link key={href} href={href} className={active === href ? "active" : undefined} aria-current={active === href ? "page" : undefined}>
      <Icon size={22} />{label}
    </Link>;

  return <>
    <div className="mobile-bar">
      <button aria-label="Abrir menú" onClick={() => setOpen(true)}><IconMenu size={24} /></button>
      <LogoMark size={30} /><strong style={{ fontSize: 19 }}>PayVerify</strong>
    </div>
    <aside className={`sidebar${open ? " open" : ""}`} aria-label="Navegación principal">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <Brand />
        {open && <button className="icon-btn" style={{ color: "#fff" }} aria-label="Cerrar menú" onClick={() => setOpen(false)}><IconX /></button>}
      </div>
      <nav className="nav">{MAIN.map(item)}</nav>
      <div className="nav-sep" />
      <div className="nav-label">ADMINISTRACIÓN</div>
      <nav className="nav">{ADMIN.map(item)}</nav>
      <div className="nav-sep" />
      <button className="logout" onClick={() => void signOut()} disabled={busy}><IconLogout size={22} />{busy ? "Cerrando…" : "Cerrar sesión"}</button>
      <div className="sidebar-spacer" />
    </aside>
  </>;
}
