import Link from "next/link";
import {createSupabaseServerClient} from "../../../../lib/supabase-server";
import {getOrganizations} from "../../../../lib/organization";
import OrganizationPicker from "../../../../components/OrganizationPicker";
import SenderRules from "../../../../components/SenderRules";
export default async function SenderSettingsPage(){
 const supabase=await createSupabaseServerClient();if(!supabase)return <main className="main"><h1>Remitentes</h1><p>Configura Supabase.</p></main>;
 const {data:{user}}=await supabase.auth.getUser();if(!user)return <main className="main"><h1>Remitentes</h1><Link href="/sign-in">Iniciar sesión</Link></main>;
 const {organizations,activeId}=await getOrganizations(supabase,user.id);
 if(!activeId)return <main className="main"><h1>Remitentes</h1><OrganizationPicker organizations={organizations} activeId={activeId}/><p>Selecciona una organización.</p></main>;
 return <main className="main"><h1 className="title">Configuración de remitentes</h1><OrganizationPicker organizations={organizations} activeId={activeId}/><SenderRules organizationId={activeId}/></main>;
}
