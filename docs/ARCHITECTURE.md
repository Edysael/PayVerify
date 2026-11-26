# Arquitectura
Android (Kotlin/Compose) detecta SMS solo con consentimiento, permiso y remitente permitido; analiza localmente y envía solo datos estructurados mediante flujo autenticado. Supabase/PostgreSQL aplica RLS multiempresa. Next.js consulta datos con Supabase Auth. Conciliación compara CSV/XLSX proporcionados por el comercio; no hay API bancaria directa.
