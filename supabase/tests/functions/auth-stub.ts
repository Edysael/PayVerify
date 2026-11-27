// Sustituto mínimo de supabase/functions/_shared/auth.ts: simula una llamada ya autenticada con API key.
export const cors = {};
export const out = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
export const isUuid = (v: unknown) => typeof v === "string";
export const adminClient = () => ({ admin: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }), insert: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: { code: "x" } }) }) }) }), rpc: async () => ({ data: null, error: null }) } });
export const resolveCaller = async () => ({ orgId: "o", userId: null });
