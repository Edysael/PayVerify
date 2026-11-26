-- PayVerify 0007: trigger-only SECURITY DEFINER functions must not be callable through PostgREST RPC.
-- These functions remain attached to their triggers; this does not alter Mensajero Pro or other app objects.
revoke execute on function public.payverify_sync_order_on_reconcile() from public, anon, authenticated;
revoke execute on function public.pv_log_payment_status_change() from public, anon, authenticated;
