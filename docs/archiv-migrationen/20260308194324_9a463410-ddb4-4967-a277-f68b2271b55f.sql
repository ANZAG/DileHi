ALTER TABLE public.profiles ADD COLUMN calendar_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX idx_profiles_calendar_token ON public.profiles (calendar_token);