CREATE UNIQUE INDEX setlist_items_id_show_unique ON public.setlist_items(id, show_id);
CREATE TABLE public.stage_sessions (
 show_id uuid PRIMARY KEY REFERENCES public.shows(id) ON DELETE CASCADE,
 current_item_id uuid,
 active boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (current_item_id, show_id) REFERENCES public.setlist_items(id, show_id),
 CHECK (NOT active OR current_item_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE ON public.stage_sessions TO authenticated;
GRANT ALL ON public.stage_sessions TO service_role;
ALTER TABLE public.stage_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_read ON public.stage_sessions FOR SELECT TO authenticated USING (public.can_see_show(show_id));
CREATE POLICY stage_admin_insert ON public.stage_sessions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY stage_admin_update ON public.stage_sessions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TABLE public.stage_presence (
 id uuid PRIMARY KEY,
 show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
 user_id uuid NOT NULL DEFAULT auth.uid(),
 last_seen timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_presence TO authenticated;
GRANT ALL ON public.stage_presence TO service_role;
ALTER TABLE public.stage_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY stage_presence_read ON public.stage_presence FOR SELECT TO authenticated USING (public.can_see_show(show_id) AND (public.is_admin() OR user_id = auth.uid()));
CREATE POLICY stage_presence_own ON public.stage_presence FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_see_show(show_id));
CREATE POLICY stage_presence_update ON public.stage_presence FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.can_see_show(show_id)) WITH CHECK (user_id = auth.uid() AND public.can_see_show(show_id));
CREATE POLICY stage_presence_delete ON public.stage_presence FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.stage_touch_timestamp() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF TG_TABLE_NAME = 'stage_presence' THEN NEW.last_seen = now(); ELSE NEW.updated_at = now(); END IF; RETURN NEW; END $$;
CREATE TRIGGER stage_session_touch BEFORE INSERT OR UPDATE ON public.stage_sessions FOR EACH ROW EXECUTE FUNCTION public.stage_touch_timestamp();
CREATE TRIGGER stage_presence_touch BEFORE INSERT OR UPDATE ON public.stage_presence FOR EACH ROW EXECUTE FUNCTION public.stage_touch_timestamp();
CREATE INDEX stage_presence_show_seen ON public.stage_presence(show_id, last_seen);
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_sessions, public.stage_presence;