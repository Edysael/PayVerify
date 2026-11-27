import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { getOrganizations } from "../../../../lib/organization";
import OrganizationPicker from "../../../../components/OrganizationPicker";
import { ROLE_LABELS } from "../../../../lib/dashboard";
import { formatDate } from "../../../../lib/format";

const ROLE_HELP: [string, string][] = [
  ["owner", "Control total: organización, usuarios, dispositivos, llaves y conciliación."],
  ["admin", "Gestiona dispositivos, remitentes, llaves de API y cuentas bancarias."],
  ["operator", "Opera el día a día: órdenes, pagos, extractos y conciliación."],
  ["viewer", "Solo consulta: ve pagos, órdenes y reportes sin modificar nada."],
];

export default async function MembersPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="main"><h1 className="title">Usuarios y roles</h1><p className="muted">Configura Supabase.</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { organizations, activeId } = await getOrganizations(supabase, user.id);
  const head = <><p className="muted">Administración</p><h1 className="title">Usuarios y roles</h1></>;
  if (!activeId) return <main className="main">{head}<OrganizationPicker organizations={organizations} activeId={activeId} /><p>Selecciona una organización.</p></main>;
  const { data, error } = await supabase.from("pv_organization_members").select("id,user_id,role,status,created_at")
    .eq("organization_id", activeId).order("created_at", { ascending: true });
  const members = data ?? [];
  return <main className="main">
    {head}
    <OrganizationPicker organizations={organizations} activeId={activeId} />
    <section className="panel" style={{ overflowX: "auto" }}>
      <h2>Miembros ({members.length})</h2>
      {error ? <p>No se pudieron cargar los miembros.</p> : <table>
        <thead><tr>{["Usuario", "Rol", "Estado", "Desde"].map((h) => <th key={h} style={{ textAlign: "left", padding: 12 }}>{h}</th>)}</tr></thead>
        <tbody>{members.map((m) => <tr key={m.id}>
          <td style={{ padding: 12 }}>{m.user_id === user.id ? <><b>{user.email}</b> <span className="badge blue">Tú</span></> : <code style={{ fontSize: 13 }}>{String(m.user_id).slice(0, 8)}…</code>}</td>
          <td style={{ padding: 12 }}><span className="badge purple">{ROLE_LABELS[m.role as string] ?? m.role}</span></td>
          <td style={{ padding: 12 }}><span className={`badge ${m.status === "active" ? "green" : "gray"}`}>{m.status === "active" ? "Activo" : m.status}</span></td>
          <td style={{ padding: 12 }}>{formatDate(m.created_at)}</td>
        </tr>)}</tbody>
      </table>}
    </section>
    <section className="panel">
      <h2>Qué puede hacer cada rol</h2>
      <table><tbody>{ROLE_HELP.map(([r, d]) => <tr key={r}><td style={{ padding: 12, width: 180 }}><span className="badge purple">{ROLE_LABELS[r]}</span></td><td style={{ padding: 12 }}>{d}</td></tr>)}</tbody></table>
      <p className="muted" style={{ marginBottom: 0 }}>Por seguridad, agregar o cambiar miembros todavía se hace desde el soporte de PayVerify; desde aquí solo se consultan.</p>
    </section>
  </main>;
}
