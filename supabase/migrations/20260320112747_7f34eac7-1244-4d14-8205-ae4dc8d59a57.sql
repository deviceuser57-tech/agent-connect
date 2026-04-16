
DROP VIEW IF EXISTS public.workspace_api_keys_safe;

CREATE VIEW public.workspace_api_keys_safe
WITH (security_invoker = true)
AS
SELECT 
  wak.id,
  wak.workspace_id,
  wak.is_active,
  wak.created_by,
  wak.created_at,
  wak.updated_at,
  wak.provider,
  wak.display_name
FROM public.workspace_api_keys wak
WHERE is_workspace_member(wak.workspace_id);
