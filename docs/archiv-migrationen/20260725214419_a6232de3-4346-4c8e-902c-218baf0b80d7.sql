CREATE TABLE public.form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Standardvorlage',
  title TEXT NOT NULL DEFAULT 'Anmeldung',
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_templates TO authenticated;
GRANT ALL ON public.form_templates TO service_role;

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mitglieder koennen Vorlagen lesen"
ON public.form_templates FOR SELECT
TO authenticated
USING (public.is_member(auth.uid()));

CREATE POLICY "Vorstand kann Vorlagen anlegen"
ON public.form_templates FOR INSERT
TO authenticated
WITH CHECK (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'events.moderate'));

CREATE POLICY "Vorstand kann Vorlagen aendern"
ON public.form_templates FOR UPDATE
TO authenticated
USING (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'events.moderate'));

CREATE POLICY "Vorstand kann Vorlagen loeschen"
ON public.form_templates FOR DELETE
TO authenticated
USING (public.is_vorstand(auth.uid()) OR public.has_permission(auth.uid(), 'events.moderate'));

CREATE TRIGGER form_templates_updated_at
BEFORE UPDATE ON public.form_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();