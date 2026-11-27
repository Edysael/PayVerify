import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { getOrganizations } from "../../../../lib/organization";
import OrganizationPicker from "../../../../components/OrganizationPicker";
import BankAccountManager, { type BankAccount } from "../../../../components/BankAccountManager";

export default async function BankAccountsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="main"><h1 className="title">Cuentas bancarias</h1><p className="muted">Configura Supabase.</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { organizations, activeId } = await getOrganizations(supabase, user.id);
  const head = <><p className="muted">Administración</p><h1 className="title">Cuentas bancarias</h1></>;
  if (!activeId) return <main className="main">{head}<OrganizationPicker organizations={organizations} activeId={activeId} /><p>Selecciona una organización.</p></main>;
  const { data, error } = await supabase.from("pv_bank_accounts").select("id,bank_name,account_alias,account_type,currency,status,created_at")
    .eq("organization_id", activeId).order("created_at", { ascending: true });
  return <main className="main">
    {head}
    <OrganizationPicker organizations={organizations} activeId={activeId} />
    <p className="muted">Las cuentas permiten cruzar cada pago y cada extracto con la cuenta correcta cuando recibes en varias.</p>
    {error ? <div className="panel">No se pudieron cargar las cuentas.</div> : <BankAccountManager organizationId={activeId} accounts={(data ?? []) as BankAccount[]} />}
  </main>;
}
