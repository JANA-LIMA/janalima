CREATE OR REPLACE FUNCTION public.cleanup_invalid_push_subscriptions(_endpoints text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  removed integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente o admin pode limpar inscrições push' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.push_subscriptions
  WHERE endpoint = ANY(_endpoints);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_invalid_push_subscriptions(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_invalid_push_subscriptions(text[]) TO authenticated;