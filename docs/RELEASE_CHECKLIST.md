# Release checklist — PayVerify

## Repositorio y CI
- [x] Repositorio privado `Edysael/PayVerify`, rama `main`.
- [x] CI web, Android debug y SQL: success.
- [x] APK debug artifact `15154955206`.
- [x] Migration 0008 incluida y validada por CI.

## Infraestructura
- [x] Supabase PayVerify 0001–0008 aplicado.
- [x] 13 Edge Functions activas.
- [x] `device-approve` y `device-revoke` v2 verificadas contra repo.
- [x] Cron cada 5 minutos.
- [x] Hardening 0008: 19 índices y políticas RLS verificadas.
- [x] Vercel deployment READY y alias de producción apuntando al deployment nuevo.
- [x] Prueba SQL de producción con rollback: match/reconcile/unreconcile; sin datos QA restantes.
- [ ] Confirmar `/api/health` desde sesión autorizada.
- [ ] Configurar Git integration automática en Vercel o mantener deploy manual.

## Funcionalidad / aceptación
- [ ] Login OTP en teléfono Android real.
- [ ] Enrolar/aprobar/revocar dispositivo desde panel.
- [ ] Captura y sync real de SMS/notificación bancaria autorizada.
- [ ] Checkout real: crear orden, actualizar pistas y consultar estado con API key protegida.
- [ ] Importar cartola CSV anonimizada, revisar candidatos, conciliar y deshacer.
- [ ] Confirmar que solo extracto cambia a `paid_confirmed`.
- [ ] Probar aislamiento multiempresa/roles con usuarios reales.
- [ ] Ajustar parser con muestras bancarias anonimizadas.

## Seguridad / lanzamiento
- [x] Hardening de índices FK y políticas RLS de bancos/remitentes.
- [ ] Revisar avisos restantes de `SECURITY DEFINER` con diseño RLS antes de cambiar permisos.
- [ ] Verificar no almacenamiento/transmisión de SMS completo, OTP, PIN o credenciales.
- [ ] Revisión legal, privacidad, consentimiento y políticas SMS.
- [ ] APK release firmado.
- [ ] Aprobación final antes de habilitar comercios reales.
