// Sustituto de _shared/auth.ts para reader-status: llamada autenticada; pv_devices sale de globalThis.__devices.
export const cors = {};
export const out = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const q: any = { select: () => q, eq: () => q, order: () => q, limit: async () => ({ data: (globalThis as any).__devices, error: null }) };
export const adminClient = () => ({ admin: { from: () => q } });
export const resolveCaller = async () => ({ orgId: "o", userId: null, via: "key" });
