ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS show_on_map boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS map_lat double precision,
  ADD COLUMN IF NOT EXISTS map_lng double precision;