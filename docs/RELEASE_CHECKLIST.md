# Release checklist — PayVerify

## Repositorio y CI
- [x] Repositorio privado `Edysael/PayVerify`, rama `main`.
- [x] CI web: pruebas y build.
- [x] CI Android: unit tests y APK debug.
- [x] CI SQL: migraciones y pruebas en PostgreSQL 16.
- [x] Migración 0008 incluida y validada por CI.

## Infraestructura
- [x] Supabase PayVerify migraciones 0001–0008 aplicadas.
- [x] 13 Edge Functions activas.
- [x] `device-approve` y `device-revoke` versión 2, verificadas contra repo.
- [x] Cron `payverify-expire-orders` activo cada 5 minutos.
- [x] Proyecto Vercel `payverify` y alias de producción existentes.
- [ ] Confirmar deployment Vercel con el commit actual de GitHub y comprobar `/api/health`.

## Funcionalidad / aceptación
- [ ] Login Android OTP en teléfono real.
- [ ] Enrolar, aprobar y revocar dispositivo desde el panel.
- [ ] Autorizar remitente SMS/app bancaria y validar captura/sync real.
- [ ] Checkout: crear orden, actualizar pistas y consultar estado con API key protegida.
- [ ] Importar cartola CSV anonimizada, revisar candidatos, conciliar y deshacer.
- [ ] Confirmar que solo el extracto cambia a `paid_confirmed`.
- [ ] Probar aislamiento multiempresa y roles en el entorno real.
- [ ] Ajustar parser con muestras bancarias anonimizadas.

## Seguridad / lanzamiento
- [x] Hardening de índices FK y políticas RLS de bancos/remitentes aplicado.
- [ ] Revisar los avisos restantes de `SECURITY DEFINER` con el diseño RLS antes de cambiar permisos.
- [ ] Verificar que SMS completo, OTP, PIN y credenciales no se almacenen ni transmitan.
- [ ] Revisión legal, privacidad, consentimiento y políticas de distribución SMS.
- [ ] APK release firmado.
- [ ] Aprobación final del propietario antes de habilitar comercios reales.
