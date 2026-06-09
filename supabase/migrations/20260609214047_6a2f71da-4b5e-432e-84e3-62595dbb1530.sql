
-- Restrict authenticated UPDATE on messages to the read_at column only.
-- RLS row check still limits this to the recipient.
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;
