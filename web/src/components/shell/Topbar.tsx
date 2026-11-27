"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { IconBell, IconChevronDown, IconHelp, IconLogout, IconSearch, IconSettings, IconUsers } from "../ui/Icons";

export type Alert = { label: string; href: string; count: number };

/** Abre/cierra un menú y lo cierra al hacer clic fuera o con Escape. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

function SearchBox() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [mac, setMac] = useState(true);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); input.current?.select(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); const v = q.trim(); if (v) router.push(`/search?q=${encodeURIComponent(v)}`); }}>
    <IconSearch size={20} style={{ color: "#0f172a" }} />
    <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar orden, referencia o monto..." aria-label="Buscar orden, referencia o monto" />
    <span className="kbd" aria-hidden="true">{mac ? "⌘ K" : "Ctrl K"}</span>
  </form>;
}

function Notifications({ alerts }: { alerts: Alert[] }) {
  const { open, setOpen, ref } = usePopover();
  const pending = alerts.filter((a) => a.count > 0);
  return <div className="relative" ref={ref}>
    <button className="icon-btn" aria-label={`Notificaciones${pending.length ? `: ${pending.length} pendientes` : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>
      <IconBell size={24} />{pending.length > 0 && <span className="dot" />}
    </button>
    {open && <div className="popover" role="menu">
      <div className="popover-title">Requiere atención</div>
      {pending.length === 0 ? <p>Todo al día. No hay pendientes.</p>
        : pending.map((a) => <Link key={a.href + a.label} href={a.href} role="menuitem" onClick={() => setOpen(false)}>{a.label}<span className="count">{a.count}</span></Link>)}
    </div>}
  </div>;
}

function Help() {
  const { open, setOpen, ref } = usePopover();
  return <div className="relative" ref={ref}>
    <button className="icon-btn" aria-label="Ayuda" aria-expanded={open} onClick={() => setOpen(!open)}><IconHelp size={24} /></button>
    {open && <div className="popover" role="menu" style={{ width: 340 }}>
      <div className="popover-title">Ayuda rápida</div>
      <p><b>Pago detectado</b>: llegó la notificación del banco (SMS o app) y cuadra con una orden.</p>
      <p><b>Conciliado</b>: el movimiento aparece en el extracto bancario importado. Es la única confirmación definitiva.</p>
      <p><b>Posible duplicado</b>: llegó otro pago con el mismo monto y referencia en 48 h. Revísalo en Pagos.</p>
      <Link href="/statements" role="menuitem" onClick={() => setOpen(false)}>Importar un extracto</Link>
      <Link href="/devices" role="menuitem" onClick={() => setOpen(false)}>Aprobar un dispositivo</Link>
      <Link href="/settings/api-keys" role="menuitem" onClick={() => setOpen(false)}>Conectar tu checkout (llaves de API)</Link>
    </div>}
  </div>;
}

function UserMenu({ name, email, role, initials }: { name: string; email: string; role: string; initials: string }) {
  const { open, setOpen, ref } = usePopover();
  const router = useRouter();
  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut(); router.push("/sign-in"); router.refresh();
  }
  return <div className="relative" ref={ref}>
    <button className="user-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="avatar" aria-hidden="true">{initials}</span>
      <span className="user-meta"><span className="user-name" style={{ display: "block" }}>{name}</span><span className="user-role">{role}</span></span>
      <IconChevronDown size={18} />
    </button>
    {open && <div className="popover" role="menu">
      <p style={{ margin: "8px 10px 10px" }}><b style={{ color: "var(--text)" }}>{name}</b><br />{email}</p>
      <Link href="/settings/members" role="menuitem" onClick={() => setOpen(false)}><IconUsers size={18} />Usuarios y roles</Link>
      <Link href="/settings" role="menuitem" onClick={() => setOpen(false)}><IconSettings size={18} />Configuración</Link>
      <button className="item" role="menuitem" onClick={() => void signOut()}><IconLogout size={18} />Cerrar sesión</button>
    </div>}
  </div>;
}

export default function Topbar(props: { alerts: Alert[]; name: string; email: string; role: string; initials: string }) {
  return <div className="topbar">
    <SearchBox />
    <div className="vsep" />
    <Notifications alerts={props.alerts} />
    <Help />
    <UserMenu name={props.name} email={props.email} role={props.role} initials={props.initials} />
  </div>;
}
