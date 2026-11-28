import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { getOrganizations } from "../../lib/organization";
import { initials, ROLE_LABELS } from "../../lib/dashboard";
import Sidebar from "../../components/shell/Sidebar";
import Topbar, { type Alert } from "../../components/shell/Topbar";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <div className="content">{children}</div>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ activeId }, adminRes] = await Promise.all([
    getOrganizations(supabase, user.id),
    supabase.rpc("pv_is_platform_admin"),
  ]);
  const isPlatformAdmin = adminRes.data === true;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? "";
  const metaName = [meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim().length > 0);
  const name = metaName?.trim() || (email ? email.split("@")[0] : "Usuario");

  let role = "Sin organización activa";
  const alerts: Alert[] = [];
  if (activeId) {
    const count = (table: string) => supabase.from(table).select("id", { count: "exact", head: true }).eq("organization_id", activeId);
    const [member, review, dups, orders, devices] = await Promise.all([
      supabase.from("pv_organization_members").select("role").eq("organization_id", activeId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
      count("pv_payment_events").eq("verification_status", "PENDING_REVIEW"),
      count("pv_payment_events").eq("verification_status", "POSSIBLE_DUPLICATE"),
      count("payverify_orders").eq("status", "needs_review"),
      count("pv_devices").eq("device_status", "pending"),
    ]);
    role = ROLE_LABELS[String(member.data?.role ?? "")] ?? "Miembro";
    alerts.push(
      { label: "Pagos pendientes de revisión", href: "/payments", count: review.count ?? 0 },
      { label: "Posibles duplicados", href: "/payments", count: dups.count ?? 0 },
      { label: "Órdenes por revisar", href: "/orders", count: orders.count ?? 0 },
      { label: "Dispositivos por aprobar", href: "/devices", count: devices.count ?? 0 },
    );
  }

  return <div className="app">
    <Sidebar isPlatformAdmin={isPlatformAdmin} />
    <div className="content">
      <Topbar alerts={alerts} name={name} email={email} role={role} initials={initials(name)} />
      {children}
    </div>
  </div>;
}
