import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { getOrganizations } from "../../../../lib/organization";
import OrganizationPicker from "../../../../components/OrganizationPicker";
import CreateOrderForm from "../../../../components/CreateOrderForm";

export default async function NewOrderPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="main"><h1 className="title">Crear orden de pago</h1><p className="muted">Configura Supabase.</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { organizations, activeId } = await getOrganizations(supabase, user.id);
  const head = <><p className="muted">Operaciones / Cobros</p><h1 className="title">Crear orden de pago</h1></>;
  if (!activeId) return <main className="main">{head}<OrganizationPicker organizations={organizations} activeId={activeId} /><p>Selecciona una organización.</p></main>;
  const { data } = await supabase.from("pv_bank_accounts").select("id,bank_name,account_alias,status")
    .eq("organization_id", activeId).order("created_at", { ascending: true });
  const accounts = (data ?? []).filter((a) => a.status !== "inactive").map((a) => ({ id: a.id as string, label: `${a.bank_name} · ${a.account_alias}` }));
  return <main className="main">
    {head}
    <OrganizationPicker organizations={organizations} activeId={activeId} />
    <p className="muted">La orden queda «Esperando pago». Cuando llegue la notificación del banco con el mismo monto (y la terminación de referencia o teléfono, si los indicas), se vinculará sola.</p>
    <CreateOrderForm organizationId={activeId} bankAccounts={accounts} />
  </main>;
}
