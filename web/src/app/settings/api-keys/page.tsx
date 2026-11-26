import Link from "next/link";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { getOrganizations } from "../../../lib/organization";
import OrganizationPicker from "../../../components/OrganizationPicker";
import ApiKeyManager, { type ApiKeyRow } from "../../../components/ApiKeyManager";

export default async function ApiKeysPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="main"><h1 className="title">Llaves de API</h1><p>Configura Supabase.</p></main>;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="main"><h1 className="title">Llaves de API</h1><Link href="/sign-in">Iniciar sesión</Link></main>;
  const { organizations, activeId } = await getOrganizations(supabase, user.id);
  if (!activeId) return <main className="main"><h1 className="title">Llaves de API</h1><OrganizationPicker organizations={organizations} activeId={activeId} /><p>Selecciona una organización.</p></main>;
  const { data, error } = await supabase.from("payverify_api_keys")
    .select("id,label,created_at,revoked_at,last_used_at").eq("organization_id", activeId).order("created_at", { ascending: false });
  return <main className="main">
    <h1 className="title">Llaves de API</h1>
    <OrganizationPicker organizations={organizations} activeId={activeId} />
    {error ? <p>No se pudieron cargar las llaves. ¿Aplicaste la migración 0005?</p> : <ApiKeyManager organizationId={activeId} keys={(data ?? []) as ApiKeyRow[]} />}
  </main>;
}
