REVOKE SELECT ON public.user_wallets FROM authenticated;
GRANT SELECT (user_id, eth_address, sol_address, created_at, updated_at) ON public.user_wallets TO authenticated;