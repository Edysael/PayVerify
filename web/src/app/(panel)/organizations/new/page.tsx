import Link from "next/link";
import {createSupabaseServerClient} from "../../../../lib/supabase-server";
import CreateOrganizationForm from "../../../../components/CreateOrganizationForm";
export default async function NewOrganizationPage(){
 const supabase=await createSupabaseServerClient();
 if(!supabase)return <main className="main"><h1>Crear organización</h1><p>Configura Supabase.</p></main>;
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return <main className="main"><h1>Crear organización</h1><Link href="/sign-in">Inicia sesión</Link></main>;
 return <main className="main"><h1 className="title">Crear organización</h1><p className="muted">Crearás una organización nueva y quedarás como propietario.</p><CreateOrganizationForm/></main>;
}
