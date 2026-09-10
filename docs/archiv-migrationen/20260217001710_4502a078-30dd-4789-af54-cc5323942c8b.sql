
-- Add herold role (must be separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'herold';
