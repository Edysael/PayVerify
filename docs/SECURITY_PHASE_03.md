# Seguridad — fase 3

- SMS permission is sensitive and must be requested only after explaining the use and obtaining explicit user action.
- Sender allowlist must be configured by the organization; default is empty.
- Raw SMS body is transiently parsed on-device and must not be persisted, logged, exported, or sent to backend.
- Do not request bank passwords, PINs, OTPs, or login credentials.
- Edge Function service role key is server-side only.
- Backend checks JWT, active organization membership, and active device ownership.
- Client roles cannot directly insert/update payment events, devices, or audit logs.
- A server receipt means the server accepted the structured notification; it does not prove bank settlement.
- Manual reconciliation with an account statement is the evidence path for a reconciled status.
