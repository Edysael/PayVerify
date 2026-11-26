import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({error:"not_configured"},{status:503});
  const {data:{user}} = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:"unauthorized"},{status:401});
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({error:"invalid_json"},{status:400}); }
  if (!body || typeof body !== "object" || !("organizationId" in body) || typeof (body as {organizationId:unknown}).organizationId !== "string") {
    return NextResponse.json({error:"invalid_organization"},{status:400});
  }
  const organizationId=(body as {organizationId:string}).organizationId;
  const {data:membership,error}=await supabase.from("pv_organization_members").select("id")
    .eq("organization_id",organizationId).eq("user_id",user.id).eq("status","active").maybeSingle();
  if(error || !membership) return NextResponse.json({error:"forbidden"},{status:403});
  const response=NextResponse.json({ok:true});
  response.cookies.set("payverify_org",organizationId,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});
  return response;
}
