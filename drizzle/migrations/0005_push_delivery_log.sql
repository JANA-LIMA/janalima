CREATE TABLE public.push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid,
  endpoint text NOT NULL,
  user_agent text,
  ok boolean NOT NULL DEFAULT false,
  status int,
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.push_deliveries TO authenticated;
GRANT ALL ON public.push_deliveries TO service_role;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all deliveries" ON public.push_deliveries FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());