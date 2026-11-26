import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export type OrganizationOption = { id: string; name: string };
export async function getOrganizations(supabase: SupabaseClient, userId: string) {
  const {data}=await supabase.from("pv_organization_members")
    .select("organization_id,pv_organizations(id,name)")
    .eq("user_id",userId).eq("status","active");
  const options: OrganizationOption[]=[];
  for(const row of data ?? []) {
    const org=row.pv_organizations as unknown as {id:string;name:string}|null;
    if(org && !options.some(item=>item.id===org.id)) options.push({id:org.id,name:org.name});
  }
  const cookieStore=await cookies();
  const selected=cookieStore.get("payverify_org")?.value ?? null;
  const activeId=selected && options.some(item=>item.id===selected) ? selected : options.length===1 ? options[0].id : null;
  return {organizations:options,activeId};
}
