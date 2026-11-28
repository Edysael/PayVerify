import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { adminClient, cors, out, sha256Hex } from "../_shared/auth.ts";

// Alta de un cliente por un administrador de plataforma:
// 1) crea la organización, 2) invita al dueño por correo (o lo suma si ya tiene cuenta),
// 3) deja al administrador como admin para dar soporte, 4) genera la llave de API para TomaYa.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function confirmUrl(base: unknown): string | null {
  if (typeof base !== "string") return null;
  try {
    const u = new URL(base);
    const okHost = u.hostname === "localhost" || u.hostname.endsWith(".vercel.app");
    if (!okHost || (u.protocol !== "https:" && u.hostname !== "localhost")) return null;
    return `${u.origin}/auth/confirm`;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out(405, { error: "method_not_allowed" });
  const ctx = adminClient();
  if (!ctx) return out(503, { error: "server_not_configured" });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return out(401, { error: "unauthorized" });
  const userClient = createClient(ctx.url, ctx.anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return out(401, { error: "invalid_session" });

  const { data: isAdmin } = await ctx.admin.from("pv_platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!isAdmin) return out(403, { error: "forbidden" });

  let b: any;
  try { b = await req.json(); } catch { return out(400, { error: "invalid_json" }); }
  const orgName = typeof b?.organizationName === "string" ? b.organizationName.trim() : "";
  const ownerName = typeof b?.ownerName === "string" ? b.ownerName.trim() : "";
  const email = typeof b?.ownerEmail === "string" ? b.ownerEmail.trim().toLowerCase() : "";
  if (orgName.length < 2 || orgName.length > 160) return out(400, { error: "invalid_organization_name" });
  if (ownerName.length > 120) return out(400, { error: "invalid_owner_name" });
  if (!EMAIL_RE.test(email) || email.length > 254) return out(400, { error: "invalid_email" });
  const redirectTo = confirmUrl(b?.appUrl);
  if (!redirectTo) return out(400, { error: "invalid_app_url" });

  // 1) Organización
  const { data: org, error: orgErr } = await ctx.admin.from("pv_organizations").insert({ name: orgName }).select("id,name").single();
  if (orgErr || !org) return out(500, { error: "organization_create_failed" });
  const rollback = async () => { await ctx.admin.from("pv_organizations").delete().eq("id", org.id); };

  // 2) Dueño: invitación por correo, o cuenta existente
  let ownerId: string | null = null;
  let invited = false;
  const { data: inv, error: invErr } = await ctx.admin.auth.admin.inviteUserByEmail(email, {
    redirectTo, data: { full_name: ownerName || undefined },
  });
  if (!invErr && inv?.user) { ownerId = inv.user.id; invited = true; }
  else {
    // Ya tenía cuenta: se busca y se suma como dueño (sin correo nuevo).
    for (let page = 1; page <= 20 && !ownerId; page++) {
      const { data: list, error: listErr } = await ctx.admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr || !list?.users?.length) break;
      ownerId = list.users.find((u) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
      if (list.users.length < 200) break;
    }
    if (!ownerId) { await rollback(); return out(502, { error: "invite_failed", detail: invErr?.message ?? "unknown" }); }
  }

  // 3) Membresías: cliente = owner; administrador = admin (soporte)
  const members = [{ organization_id: org.id, user_id: ownerId, role: "owner", status: "active" }];
  if (ownerId !== user.id) members.push({ organization_id: org.id, user_id: user.id, role: "admin", status: "active" });
  const { error: memErr } = await ctx.admin.from("pv_organization_members").insert(members);
  if (memErr) { await rollback(); return out(500, { error: "membership_failed" }); }

  // 4) Llave de API para la integración (se muestra una sola vez)
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const apiKey = "pvk_" + Array.from(raw, (x) => x.toString(16).padStart(2, "0")).join("");
  const { data: key, error: keyErr } = await ctx.admin.from("payverify_api_keys")
    .insert({ organization_id: org.id, label: "TomaYa", key_hash: await sha256Hex(apiKey), created_by: user.id })
    .select("id").maybeSingle();

  await ctx.admin.from("pv_audit_logs").insert([
    { organization_id: org.id, user_id: user.id, action: "organization_created", entity_type: "organization", entity_id: org.id },
    { organization_id: org.id, user_id: user.id, action: invited ? "owner_invited" : "owner_added_existing", entity_type: "user", entity_id: ownerId },
    ...(key ? [{ organization_id: org.id, user_id: user.id, action: "api_key_created", entity_type: "api_key", entity_id: key.id }] : []),
  ]);

  return out(201, {
    organization: org, ownerEmail: email, invited,
    apiKey: keyErr || !key ? null : apiKey,
    note: "Guarda la llave de API ahora: no se vuelve a mostrar.",
  });
});
