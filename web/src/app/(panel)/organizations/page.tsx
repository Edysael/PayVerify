import Link from "next/link";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { getOrganizations } from "../../../lib/organization";
import { ROLE_LABELS } from "../../../lib/dashboard";
import { formatDate } from "../../../lib/format";
import SwitchOrganizationButton from "../../../components/SwitchOrganizationButton";

export default async function OrganizationsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="main"><h1 className="title">Organizaciones</h1><p className="muted">Configura Supabase.</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { activeId } = await getOrganizations(supabase, user.id);
  const { data, error } = await supabase.from("pv_organization_members")
    .select("role,created_at,pv_organizations(id,name,legal_name,tax_identifier,status,created_at)")
    .eq("user_id", user.id).eq("status", "active");
  const rows = (data ?? []).map((m) => ({ role: m.role as string, org: m.pv_organizations as unknown as { id: string; name: string; legal_name: string | null; tax_identifier: string | null; status: string | null; created_at: string } | null }))
    .filter((r) => r.org).sort((a, b) => a.org!.name.localeCompare(b.org!.name, "es"));

  return <main className="main">
    <p className="muted">Administración</p><h1 className="title">Organizaciones</h1>
    <div className="page-actions"><Link href="/organizations/new" className="btn-primary">+ Crear organización</Link></div>
    <section className="panel" style={{ overflowX: "auto" }}>
      <h2>Tus organizaciones</h2>
      {error ? <p>No se pudieron cargar las organizaciones.</p> : rows.length === 0 ? <div className="empty">Aún no perteneces a ninguna organización.</div> :
        <table>
          <thead><tr>{["Organización", "Razón social / RIF", "Tu rol", "Creada", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: 12 }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(({ role, org }) => <tr key={org!.id}>
            <td style={{ padding: 12, fontWeight: 600 }}>{org!.name}</td>
            <td style={{ padding: 12 }}>{org!.legal_name ?? "—"}{org!.tax_identifier ? <><br /><small>{org!.tax_identifier}</small></> : null}</td>
            <td style={{ padding: 12 }}><span className="badge purple">{ROLE_LABELS[role] ?? role}</span></td>
            <td style={{ padding: 12 }}>{formatDate(org!.created_at)}</td>
            <td style={{ padding: 12, textAlign: "right" }}><SwitchOrganizationButton organizationId={org!.id} active={org!.id === activeId} /></td>
          </tr>)}</tbody>
        </table>}
    </section>
    <p className="muted">Cada usuario puede ser propietario de hasta 5 organizaciones.</p>
  </main>;
}
