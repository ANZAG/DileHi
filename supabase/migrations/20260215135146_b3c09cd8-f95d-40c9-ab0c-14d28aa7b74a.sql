
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('vorstand', 'mitglied');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Sources table
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  file_path TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Announcement files
CREATE TABLE public.announcement_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcement_files ENABLE ROW LEVEL SECURITY;

-- Elections table
CREATE TABLE public.elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'multi_candidate' CHECK (type IN ('yes_no_abstain', 'multi_candidate')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;

-- Candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Votes table (voter_id for duplicate prevention, but results shown anonymously)
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(election_id, voter_id)
);
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Security definer helper functions
CREATE OR REPLACE FUNCTION public.is_vorstand(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'vorstand'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('vorstand', 'mitglied')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_voted(_election_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.votes WHERE election_id = _election_id AND voter_id = _user_id
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Election results view (anonymous aggregation)
CREATE VIEW public.election_results AS
  SELECT c.election_id, c.id AS candidate_id, c.name AS candidate_name, COUNT(v.id) AS vote_count
  FROM public.candidates c
  LEFT JOIN public.votes v ON v.candidate_id = c.id
  GROUP BY c.election_id, c.id, c.name;

-- === RLS POLICIES ===

-- Profiles: all members can read, users can update their own
CREATE POLICY "Members can view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User roles: members can read, vorstand can manage
CREATE POLICY "Members can view roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Vorstand can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_vorstand(auth.uid()));

-- Sources: members can read, all members can create/update/delete their own
CREATE POLICY "Members can view sources" ON public.sources FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Members can create sources" ON public.sources FOR INSERT TO authenticated WITH CHECK (public.is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Members can update own sources" ON public.sources FOR UPDATE TO authenticated USING (public.is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Members can delete own sources" ON public.sources FOR DELETE TO authenticated USING (public.is_member(auth.uid()) AND created_by = auth.uid());

-- Announcements: members read, members create, vorstand manage all
CREATE POLICY "Members can view announcements" ON public.announcements FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Members can create announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Vorstand can update announcements" ON public.announcements FOR UPDATE TO authenticated USING (public.is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can delete announcements" ON public.announcements FOR DELETE TO authenticated USING (public.is_vorstand(auth.uid()));

-- Announcement files
CREATE POLICY "Members can view announcement files" ON public.announcement_files FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Members can create announcement files" ON public.announcement_files FOR INSERT TO authenticated WITH CHECK (public.is_member(auth.uid()));
CREATE POLICY "Vorstand can delete announcement files" ON public.announcement_files FOR DELETE TO authenticated USING (public.is_vorstand(auth.uid()));

-- Elections: members read, vorstand manage
CREATE POLICY "Members can view elections" ON public.elections FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Vorstand can create elections" ON public.elections FOR INSERT TO authenticated WITH CHECK (public.is_vorstand(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Vorstand can update elections" ON public.elections FOR UPDATE TO authenticated USING (public.is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can delete elections" ON public.elections FOR DELETE TO authenticated USING (public.is_vorstand(auth.uid()));

-- Candidates
CREATE POLICY "Members can view candidates" ON public.candidates FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "Vorstand can create candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (public.is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can delete candidates" ON public.candidates FOR DELETE TO authenticated USING (public.is_vorstand(auth.uid()));

-- Votes: no SELECT on individual votes (use view), members can insert if election active & not voted yet
CREATE POLICY "Members can cast vote" ON public.votes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_member(auth.uid())
    AND voter_id = auth.uid()
    AND NOT public.has_voted(election_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.elections WHERE id = election_id AND status = 'active')
    AND EXISTS (SELECT 1 FROM public.candidates WHERE id = candidate_id AND election_id = votes.election_id)
  );

-- Storage bucket for internal files
INSERT INTO storage.buckets (id, name, public) VALUES ('internal-files', 'internal-files', false);

CREATE POLICY "Members can view internal files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'internal-files' AND public.is_member(auth.uid()));
CREATE POLICY "Members can upload internal files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'internal-files' AND public.is_member(auth.uid()));
CREATE POLICY "Vorstand can delete internal files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'internal-files' AND public.is_vorstand(auth.uid()));
