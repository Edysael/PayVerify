// Devuelve una ruta interna segura para redirigir tras el login.
// Rechaza URLs absolutas, "//host" y "/\host" para evitar redirecciones abiertas.
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
