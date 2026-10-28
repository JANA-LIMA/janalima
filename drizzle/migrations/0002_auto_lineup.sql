CREATE OR REPLACE FUNCTION public.tg_show_auto_lineup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.show_lineup (show_id, musician_id, status)
  SELECT NEW.id, m.id, 'confirmado' FROM public.musicians m WHERE m.ativo;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS show_auto_lineup ON public.shows;
CREATE TRIGGER show_auto_lineup AFTER INSERT ON public.shows FOR EACH ROW EXECUTE FUNCTION public.tg_show_auto_lineup();
ALTER TABLE public.show_lineup ALTER COLUMN status SET DEFAULT 'confirmado';
UPDATE public.show_lineup SET status = 'confirmado' WHERE status <> 'confirmado';