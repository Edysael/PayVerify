# Release checklist — PayVerify

## Infraestructura
- [ ] Proyecto Supabase separado para PayVerify.
- [ ] Migraciones 0001–0004 aplicadas en staging.
- [ ] Ocho Edge Functions desplegadas y probadas.
- [ ] Auth email OTP, SMTP y redirect URLs configurados.
- [ ] Vercel variables públicas configuradas; service role nunca en cliente.
- [ ] Dominio HTTPS, health endpoint y monitoreo.

## Funcionalidad
- [ ] Crear organización y owner.
- [ ] Login Android por OTP.
- [ ] Enrolar, aprobar y revocar dispositivo.
- [ ] Configurar remitente SMS en panel y móvil.
- [ ] Captura local opt-in, parseo y Room.
- [ ] Sincronización idempotente y reintentos.
- [ ] Importar CSV, preview, detectar candidatos, conciliar y deshacer.
- [ ] Exportar pagos CSV con neutralización de fórmulas.

## Seguridad / aceptación
- [ ] Probar aislamiento multiempresa y roles.
- [ ] Verificar que SMS completo/OTP/PIN no se guarda ni transmite.
- [ ] Probar expiración de sesión, revocación y sender deshabilitado.
- [ ] Probar duplicados y errores de red.
- [ ] Usar extractos reales anonimizados y revisar falsos candidatos.
- [ ] Revisión legal, privacidad, consentimiento y política SMS.
- [ ] Build web, tests y APK firmado.
- [ ] Aprobación del propietario antes de producción.
