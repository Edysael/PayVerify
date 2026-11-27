import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-payverify-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
export const out = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: cors });

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export async function sha256Hex(value: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return null;
  return {
    url, anon,
    admin: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

export type Caller = { orgId: string; userId: string | null; via: "key" | "jwt" };

/**
 * Who is calling? Either the merchant's own server with an API key (x-payverify-key),
 * or a signed-in operator (Bearer session) who belongs to the organization.
 * Returns a Response (error) or the caller.
 */
export async function resolveCaller(
  req: Request, ctx: NonNullable<ReturnType<typeof adminClient>>, organizationId: unknown,
  roles: string[] = ["owner", "admin", "operator"],
): Promise<Caller | Response> {
  const apiKey = req.headers.get("x-payverify-key");
  if (apiKey) {
    if (!/^pvk_[a-f0-9]{64}$/.test(apiKey)) return out(401, { error: "invalid_api_key" });
    const { data: k } = await ctx.admin.from("payverify_api_keys").select("id,organization_id")
      .eq("key_hash", await sha256Hex(apiKey)).is("revoked_at", null).maybeSingle();
    if (!k) return out(401, { error: "invalid_api_key" });
    await ctx.admin.from("payverify_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id);
    return { orgId: k.organization_id, userId: null, via: "key" };
  }
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return out(401, { error: "unauthorized" });
  if (!isUuid(organizationId)) return out(400, { error: "invalid_organization" });
  const userClient = createClient(ctx.url, ctx.anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return out(401, { error: "invalid_session" });
  const { data: m } = await ctx.admin.from("pv_organization_members").select("role")
    .eq("organization_id", organizationId).eq("user_id", user.id).eq("status", "active")
    .in("role", roles).maybeSingle();
  if (!m) return out(403, { error: "forbidden" });
  return { orgId: organizationId as string, userId: user.id, via: "jwt" };
}
