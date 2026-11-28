import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { safeNextPath } from "../../../lib/safe-next";

// Enlaces de correo con token_hash (invitación de cliente). Abre la sesión en el servidor
// y lleva a crear la contraseña. Funciona aunque el enlace se abra en otro navegador.
const ALLOWED: EmailOtpType[] = ["invite", "recovery", "signup", "magiclink", "email"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallbackNext = type === "invite" || type === "recovery" ? "/auth/update-password" : "/";
  const next = safeNextPath(searchParams.get("next"), fallbackNext);
  if (tokenHash && type && ALLOWED.includes(type)) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/sign-in?error=link_expired`);
}
