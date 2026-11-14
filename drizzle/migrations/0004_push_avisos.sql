CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin reads subs" ON public.push_subscriptions FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  url text,
  publico text NOT NULL,
  enviado_por uuid,
  total_destinatarios int NOT NULL DEFAULT 0,
  total_entregues int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.announcement_recipients (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  musician_id uuid NOT NULL REFERENCES public.musicians(id) ON DELETE CASCADE,
  PRIMARY KEY (announcement_id, musician_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
GRANT SELECT, INSERT, DELETE ON public.announcement_recipients TO authenticated;
GRANT ALL ON public.announcement_recipients TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_announcement_recipient(_a uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM announcement_recipients r JOIN musicians m ON m.id = r.musician_id
    WHERE r.announcement_id = _a AND m.user_id = auth.uid())
$$;

CREATE POLICY "admin all ann" ON public.announcements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "recipient reads ann" ON public.announcements FOR SELECT TO authenticated USING (public.is_announcement_recipient(id));
CREATE POLICY "admin all rec" ON public.announcement_recipients FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "own rec" ON public.announcement_recipients FOR SELECT TO authenticated
  USING (musician_id IN (SELECT id FROM public.musicians WHERE user_id = auth.uid()));