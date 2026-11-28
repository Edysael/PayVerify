# Plantilla del correo de invitación (Supabase → Authentication → Email Templates → Invite user)

**Asunto:** Te invitaron a PayVerify

**Cuerpo (HTML):**

```html
<h2>Bienvenido a PayVerify</h2>
<p>Te dieron acceso al panel de pagos de tu comercio.</p>
<p><strong>1. Crea tu contraseña:</strong></p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite"
      style="display:inline-block;padding:12px 20px;background:#111b2c;color:#ffffff;border-radius:8px;text-decoration:none">
  Crear mi contraseña</a></p>
<p><strong>2. Instala la app en el teléfono donde te llegan los avisos del banco:</strong><br>
<a href="https://payverify-nine.vercel.app/descargar">payverify-nine.vercel.app/descargar</a></p>
<p>Entra a la app con este mismo correo y la contraseña que crees.</p>
<p style="color:#6b7788;font-size:12px">Si no esperabas este correo, ignóralo.</p>
```

Por qué `{{ .RedirectTo }}` y `token_hash`: el enlace abre `/auth/confirm` del panel, que valida el
token en el servidor. Funciona aunque el cliente abra el correo en otro navegador o en el celular.
