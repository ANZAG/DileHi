	-- DING: Ausgangsstand, erzeugt am 2026-09-10 20:58
-- Eine leere Datenbank wird damit zu einer lauffaehigen Installation.
SET check_function_bodies = off;

-- Aufbau des Schemas public, erzeugt am 2026-09-10 20:58:53 UTC

-- ══ Typen ══
CREATE TYPE public.forum_category_status AS ENUM ('vorgeschlagen', 'aktiv', 'archiviert');
CREATE TYPE public.forum_post_kind AS ENUM ('beitrag', 'umfrage', 'mitbringliste');
CREATE TYPE public.forum_watch_level AS ENUM ('beobachten', 'verfolgen', 'stumm');

-- ══ Tabellen ══
CREATE TABLE public.announcement_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  name text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.announcement_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.app_modules (
  key text NOT NULL,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  requires text,
  art text NOT NULL DEFAULT 'grundfunktion'::text
);

CREATE TABLE public.app_settings (
  id boolean NOT NULL DEFAULT true,
  org_name text NOT NULL DEFAULT 'Mein Verein e. V.'::text,
  org_short_name text NOT NULL DEFAULT 'Mein Verein'::text,
  org_tagline text,
  org_street text,
  org_zip text,
  org_city text,
  org_country text NOT NULL DEFAULT 'Deutschland'::text,
  org_email text,
  org_phone text,
  website_url text,
  logo_path text,
  color_primary text NOT NULL DEFAULT '#dd9933'::text,
  color_dark text NOT NULL DEFAULT '#1c1917'::text,
  mail_from_address text,
  mail_from_name text,
  mail_reply_to text,
  mail_transport text NOT NULL DEFAULT 'microsoft_graph'::text,
  calendar_timezone text NOT NULL DEFAULT 'Europe/Berlin'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  forum_event_thread text NOT NULL DEFAULT 'vorgabe_an'::text,
  favicon_path text,
  seo_description text,
  seo_image_path text,
  font_headings text NOT NULL DEFAULT 'DM Serif Display'::text,
  font_body text NOT NULL DEFAULT 'Inter'::text,
  board_members text,
  register_court text,
  register_number text,
  vat_id text,
  privacy_contact text,
  privacy_officer text,
  hosting_provider text,
  hosting_address text,
  footer_navigation_label text NOT NULL DEFAULT 'Navigation'::text,
  footer_legal_label text NOT NULL DEFAULT 'Rechtliches'::text,
  bank_recipient text,
  bank_iban text,
  bank_bic text,
  contribution_model text NOT NULL DEFAULT 'fest'::text,
  logo_in_header boolean NOT NULL DEFAULT true,
  satzung_link boolean NOT NULL DEFAULT true,
  satzung_document_id uuid,
  beitrag_aufbewahrung_jahre integer NOT NULL DEFAULT 5,
  color_surface text NOT NULL DEFAULT '#f4f2ee'::text,
  default_role text
);

CREATE TABLE public.application_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  column_name text,
  type text NOT NULL,
  label text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_message_id uuid NOT NULL,
  replied_by uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.contribution_categories (
  key text NOT NULL,
  label text NOT NULL,
  hinweis text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  geloescht_ab integer
);

CREATE TABLE public.contribution_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  amount numeric NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  category text NOT NULL DEFAULT 'aktiv'::text
);

CREATE TABLE public.contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'offen'::text,
  amount numeric(10,2),
  paid_at date,
  notes text,
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'sonstiges'::text,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.election_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  election_title text NOT NULL,
  election_description text,
  group_title text,
  result_snapshot jsonb,
  total_votes integer DEFAULT 0,
  deleted_by uuid NOT NULL,
  deleted_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.election_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  votes_per_member integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open'::text,
  closed_at timestamp with time zone
);

CREATE TABLE public.elections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'multi_candidate'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  group_id uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.epoch_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  epoch text NOT NULL DEFAULT 'mittelalter'::text,
  text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.epoch_visitor_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  epoch text NOT NULL DEFAULT 'mittelalter'::text,
  text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.event_attendees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'attending'::text
);

CREATE TABLE public.event_form_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL,
  field_id uuid NOT NULL,
  value jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.event_form_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'text'::text,
  label text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  options jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.event_form_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  respondent_name text NOT NULL,
  respondent_email text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  edit_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text)
);

CREATE TABLE public.event_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  title text NOT NULL DEFAULT ''::text,
  description text,
  public_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  is_open boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  all_day boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  location_lat double precision,
  location_lng double precision,
  forum_thread_wanted boolean
);

CREATE TABLE public.form_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL DEFAULT 'default'::text,
  name text NOT NULL DEFAULT 'Standardvorlage'::text,
  title text NOT NULL DEFAULT 'Anmeldung'::text,
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'MessageSquare'::text,
  sort_order integer NOT NULL DEFAULT 0,
  status forum_category_status NOT NULL DEFAULT 'vorgeschlagen'::forum_category_status,
  is_event_room boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  only_auto_threads boolean NOT NULL DEFAULT false
);

CREATE TABLE public.forum_category_roles (
  category_id uuid NOT NULL,
  role text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  can_reply boolean NOT NULL DEFAULT true,
  can_start boolean NOT NULL DEFAULT true,
  is_moderator boolean NOT NULL DEFAULT false
);

CREATE TABLE public.forum_drafts (
  user_id uuid NOT NULL,
  thread_id uuid,
  category_id uuid,
  title text,
  body text NOT NULL DEFAULT ''::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_poll_votes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  option_key text NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_post_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  body text NOT NULL,
  edited_by uuid NOT NULL,
  edited_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  kind forum_post_kind NOT NULL DEFAULT 'beitrag'::forum_post_kind,
  body text NOT NULL DEFAULT ''::text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  reply_to_id uuid,
  edited_at timestamp with time zone,
  edited_by uuid,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_reactions (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL
);

CREATE TABLE public.forum_read_state (
  user_id uuid NOT NULL,
  thread_id uuid NOT NULL,
  last_read_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.forum_subscriptions (
  user_id uuid NOT NULL,
  thread_id uuid,
  category_id uuid,
  level forum_watch_level NOT NULL DEFAULT 'beobachten'::forum_watch_level
);

CREATE TABLE public.forum_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  created_by uuid NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  event_id uuid,
  post_count integer NOT NULL DEFAULT 0,
  last_post_at timestamp with time zone NOT NULL DEFAULT now(),
  last_post_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  event_ends_on date
);

CREATE TABLE public.gallery_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  alt_text text NOT NULL DEFAULT ''::text,
  epoch text NOT NULL DEFAULT 'alle'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  show_subtitle boolean NOT NULL DEFAULT false
);

CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_count integer NOT NULL DEFAULT 1,
  represented_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.mail_templates (
  key text NOT NULL,
  label text NOT NULL,
  hinweis text,
  betreff text NOT NULL DEFAULT ''::text,
  kennzeile text NOT NULL DEFAULT ''::text,
  ueberschrift text NOT NULL DEFAULT ''::text,
  inhalt text NOT NULL DEFAULT ''::text,
  knopf text NOT NULL DEFAULT ''::text,
  fussnote text NOT NULL DEFAULT ''::text,
  platzhalter text[] NOT NULL DEFAULT '{}'::text[],
  standard jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.member_personas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period text NOT NULL DEFAULT ''::text,
  portrayal text NOT NULL DEFAULT ''::text,
  expertise text NOT NULL DEFAULT ''::text,
  images text[] NOT NULL DEFAULT '{}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_public boolean NOT NULL DEFAULT false,
  public_images text[] NOT NULL DEFAULT '{}'::text[],
  published_at timestamp with time zone,
  published_by uuid,
  show_name boolean NOT NULL DEFAULT false
);

CREATE TABLE public.member_tents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  tent_type text NOT NULL,
  shape text NOT NULL DEFAULT 'circle'::text,
  diameter numeric,
  length numeric,
  width numeric,
  guy_rope numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.membership_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  salutation text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  birthdate date,
  street text,
  zip text,
  city text,
  membership_type text NOT NULL DEFAULT 'aktiv'::text,
  contribution_interval text NOT NULL DEFAULT 'jaehrlich'::text,
  statutes_accepted boolean NOT NULL DEFAULT false,
  data_processing_accepted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'::text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_user_id uuid,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.membership_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.onboarding_hilfe (
  key text NOT NULL,
  titel text,
  text text NOT NULL,
  standard jsonb
);

CREATE TABLE public.onboarding_schritte (
  key text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles'::text,
  titel text NOT NULL,
  text text NOT NULL,
  tipp text,
  route text,
  anker text,
  recht text,
  modul text,
  aufgabe text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  standard jsonb,
  tour text NOT NULL DEFAULT 'start'::text
);

CREATE TABLE public.pdf_texts (
  key text NOT NULL,
  label text NOT NULL,
  hinweis text,
  titel text NOT NULL DEFAULT ''::text,
  inhalt text NOT NULL DEFAULT ''::text,
  platzhalter text[] NOT NULL DEFAULT '{}'::text[],
  standard jsonb NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.permission_catalog (
  key text NOT NULL,
  label text NOT NULL,
  category text NOT NULL,
  sort_order integer NOT NULL DEFAULT 99
);

CREATE TABLE public.profile_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  block_key text,
  type text NOT NULL,
  label text NOT NULL,
  description text,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  modul text
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  calendar_token uuid DEFAULT gen_random_uuid(),
  salutation text,
  first_name text,
  last_name text,
  street text,
  zip text,
  city text,
  birthdate date,
  phone text,
  membership_type text DEFAULT 'aktiv'::text,
  contribution_interval text DEFAULT 'jaehrlich'::text,
  entry_date date,
  exit_date date,
  is_active boolean DEFAULT true,
  show_on_map boolean NOT NULL DEFAULT false,
  map_lat double precision,
  map_lng double precision,
  diet text,
  allergies text,
  forum_signature text,
  forum_title text,
  notify_digest boolean NOT NULL DEFAULT true,
  digest_sent_at timestamp with time zone,
  notify_push boolean NOT NULL DEFAULT true,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.push_subscriptions (
  endpoint text NOT NULL,
  user_id uuid NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_sent_at timestamp with time zone,
  failure_count integer NOT NULL DEFAULT 0
);

CREATE TABLE public.representation_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  action text NOT NULL,
  details text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.role_catalog (
  key text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 99,
  description text,
  is_board boolean NOT NULL DEFAULT false,
  public_listed boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  max_holders integer,
  is_leadership boolean NOT NULL DEFAULT false
);

CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.site_categories (
  key text NOT NULL,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.site_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot text NOT NULL,
  label text NOT NULL,
  page text NOT NULL,
  storage_path text,
  alt_text text NOT NULL DEFAULT ''::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.site_menu (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL,
  page_id uuid,
  href text,
  parent_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  opens_new boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  bereich text NOT NULL DEFAULT 'kopf'::text
);

CREATE TABLE public.site_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  content jsonb,
  draft_content jsonb,
  seo_description text,
  seo_image_path text,
  noindex boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  seo_title text,
  seo_type text NOT NULL DEFAULT 'keine'::text
);

CREATE TABLE public.source_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_id uuid,
  epoch text NOT NULL,
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  epoch text NOT NULL,
  title text NOT NULL,
  content text,
  url text,
  file_path text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  folder_id uuid
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_tours (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tour_key text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  voter_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ══ Bedingungen ══
ALTER TABLE public.announcement_files ADD CONSTRAINT announcement_files_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE;
ALTER TABLE public.announcement_files ADD CONSTRAINT announcement_files_pkey PRIMARY KEY (id);
ALTER TABLE public.announcement_replies ADD CONSTRAINT announcement_replies_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE;
ALTER TABLE public.announcement_replies ADD CONSTRAINT announcement_replies_pkey PRIMARY KEY (id);
ALTER TABLE public.announcements ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.announcements ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);
ALTER TABLE public.app_modules ADD CONSTRAINT app_modules_art_check CHECK ((art = ANY (ARRAY['grundfunktion'::text, 'zusatz'::text])));
ALTER TABLE public.app_modules ADD CONSTRAINT app_modules_pkey PRIMARY KEY (key);
ALTER TABLE public.app_modules ADD CONSTRAINT app_modules_requires_fkey FOREIGN KEY (requires) REFERENCES app_modules(key) ON DELETE SET NULL;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_aufbewahrung_check CHECK (((beitrag_aufbewahrung_jahre >= 1) AND (beitrag_aufbewahrung_jahre <= 30)));
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_contribution_model_check CHECK ((contribution_model = ANY (ARRAY['fest'::text, 'umlage'::text, 'keiner'::text])));
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_default_role_fkey FOREIGN KEY (default_role) REFERENCES role_catalog(key) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_forum_event_thread_check CHECK ((forum_event_thread = ANY (ARRAY['immer'::text, 'vorgabe_an'::text, 'vorgabe_aus'::text, 'aus'::text])));
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_id_check CHECK (id);
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_mail_transport_check CHECK ((mail_transport = ANY (ARRAY['microsoft_graph'::text, 'smtp'::text])));
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_satzung_document_fk FOREIGN KEY (satzung_document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE public.application_fields ADD CONSTRAINT application_fields_column_name_key UNIQUE (column_name);
ALTER TABLE public.application_fields ADD CONSTRAINT application_fields_pkey PRIMARY KEY (id);
ALTER TABLE public.candidates ADD CONSTRAINT candidates_election_id_fkey FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE;
ALTER TABLE public.candidates ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);
ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.contact_replies ADD CONSTRAINT contact_replies_contact_message_id_fkey FOREIGN KEY (contact_message_id) REFERENCES contact_messages(id) ON DELETE CASCADE;
ALTER TABLE public.contact_replies ADD CONSTRAINT contact_replies_pkey PRIMARY KEY (id);
ALTER TABLE public.contribution_categories ADD CONSTRAINT contribution_categories_pkey PRIMARY KEY (key);
ALTER TABLE public.contribution_rates ADD CONSTRAINT contribution_rates_pkey PRIMARY KEY (id);
ALTER TABLE public.contributions ADD CONSTRAINT contributions_pkey PRIMARY KEY (id);
ALTER TABLE public.contributions ADD CONSTRAINT contributions_user_id_year_key UNIQUE (user_id, year);
ALTER TABLE public.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
ALTER TABLE public.election_audit_log ADD CONSTRAINT election_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.election_groups ADD CONSTRAINT election_groups_pkey PRIMARY KEY (id);
ALTER TABLE public.elections ADD CONSTRAINT elections_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.elections ADD CONSTRAINT elections_group_id_fkey FOREIGN KEY (group_id) REFERENCES election_groups(id) ON DELETE CASCADE;
ALTER TABLE public.elections ADD CONSTRAINT elections_pkey PRIMARY KEY (id);
ALTER TABLE public.elections ADD CONSTRAINT elections_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text])));
ALTER TABLE public.elections ADD CONSTRAINT elections_type_check CHECK ((type = ANY (ARRAY['yes_no_abstain'::text, 'multi_candidate'::text])));
ALTER TABLE public.epoch_sources ADD CONSTRAINT epoch_sources_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.epoch_sources ADD CONSTRAINT epoch_sources_pkey PRIMARY KEY (id);
ALTER TABLE public.epoch_visitor_items ADD CONSTRAINT epoch_visitor_items_pkey PRIMARY KEY (id);
ALTER TABLE public.event_attendees ADD CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.event_attendees ADD CONSTRAINT event_attendees_event_id_user_id_key UNIQUE (event_id, user_id);
ALTER TABLE public.event_attendees ADD CONSTRAINT event_attendees_pkey PRIMARY KEY (id);
ALTER TABLE public.event_form_answers ADD CONSTRAINT event_form_answers_field_id_fkey FOREIGN KEY (field_id) REFERENCES event_form_fields(id) ON DELETE CASCADE;
ALTER TABLE public.event_form_answers ADD CONSTRAINT event_form_answers_pkey PRIMARY KEY (id);
ALTER TABLE public.event_form_answers ADD CONSTRAINT event_form_answers_response_id_fkey FOREIGN KEY (response_id) REFERENCES event_form_responses(id) ON DELETE CASCADE;
ALTER TABLE public.event_form_fields ADD CONSTRAINT event_form_fields_form_id_fkey FOREIGN KEY (form_id) REFERENCES event_forms(id) ON DELETE CASCADE;
ALTER TABLE public.event_form_fields ADD CONSTRAINT event_form_fields_pkey PRIMARY KEY (id);
ALTER TABLE public.event_form_responses ADD CONSTRAINT event_form_responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES event_forms(id) ON DELETE CASCADE;
ALTER TABLE public.event_form_responses ADD CONSTRAINT event_form_responses_pkey PRIMARY KEY (id);
ALTER TABLE public.event_forms ADD CONSTRAINT event_forms_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE public.event_forms ADD CONSTRAINT event_forms_pkey PRIMARY KEY (id);
ALTER TABLE public.event_forms ADD CONSTRAINT event_forms_public_token_key UNIQUE (public_token);
ALTER TABLE public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE public.form_templates ADD CONSTRAINT form_templates_pkey PRIMARY KEY (id);
ALTER TABLE public.form_templates ADD CONSTRAINT form_templates_slug_key UNIQUE (slug);
ALTER TABLE public.forum_categories ADD CONSTRAINT forum_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.forum_categories ADD CONSTRAINT forum_categories_slug_key UNIQUE (slug);
ALTER TABLE public.forum_category_roles ADD CONSTRAINT forum_category_roles_category_id_fkey FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE;
ALTER TABLE public.forum_category_roles ADD CONSTRAINT forum_category_roles_pkey PRIMARY KEY (category_id, role);
ALTER TABLE public.forum_category_roles ADD CONSTRAINT forum_category_roles_role_fkey FOREIGN KEY (role) REFERENCES role_catalog(key) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.forum_drafts ADD CONSTRAINT forum_drafts_category_id_fkey FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE;
ALTER TABLE public.forum_drafts ADD CONSTRAINT forum_drafts_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE;
ALTER TABLE public.forum_poll_votes ADD CONSTRAINT forum_poll_votes_pkey PRIMARY KEY (post_id, user_id, option_key);
ALTER TABLE public.forum_poll_votes ADD CONSTRAINT forum_poll_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE;
ALTER TABLE public.forum_post_revisions ADD CONSTRAINT forum_post_revisions_pkey PRIMARY KEY (id);
ALTER TABLE public.forum_post_revisions ADD CONSTRAINT forum_post_revisions_post_id_fkey FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE;
ALTER TABLE public.forum_posts ADD CONSTRAINT forum_posts_pkey PRIMARY KEY (id);
ALTER TABLE public.forum_posts ADD CONSTRAINT forum_posts_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES forum_posts(id) ON DELETE SET NULL;
ALTER TABLE public.forum_posts ADD CONSTRAINT forum_posts_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE;
ALTER TABLE public.forum_reactions ADD CONSTRAINT forum_reactions_pkey PRIMARY KEY (post_id, user_id, emoji);
ALTER TABLE public.forum_reactions ADD CONSTRAINT forum_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE;
ALTER TABLE public.forum_read_state ADD CONSTRAINT forum_read_state_pkey PRIMARY KEY (user_id, thread_id);
ALTER TABLE public.forum_read_state ADD CONSTRAINT forum_read_state_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE;
ALTER TABLE public.forum_subscriptions ADD CONSTRAINT forum_subscriptions_category_id_fkey FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE;
ALTER TABLE public.forum_subscriptions ADD CONSTRAINT forum_subscriptions_check CHECK ((num_nonnulls(thread_id, category_id) = 1));
ALTER TABLE public.forum_subscriptions ADD CONSTRAINT forum_subscriptions_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE;
ALTER TABLE public.forum_threads ADD CONSTRAINT forum_threads_category_id_fkey FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE;
ALTER TABLE public.forum_threads ADD CONSTRAINT forum_threads_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE public.forum_threads ADD CONSTRAINT forum_threads_pkey PRIMARY KEY (id);
ALTER TABLE public.gallery_images ADD CONSTRAINT gallery_images_pkey PRIMARY KEY (id);
ALTER TABLE public.group_members ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES election_groups(id) ON DELETE CASCADE;
ALTER TABLE public.group_members ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);
ALTER TABLE public.group_members ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);
ALTER TABLE public.mail_templates ADD CONSTRAINT mail_templates_pkey PRIMARY KEY (key);
ALTER TABLE public.member_personas ADD CONSTRAINT member_personas_pkey PRIMARY KEY (id);
ALTER TABLE public.member_tents ADD CONSTRAINT member_tents_pkey PRIMARY KEY (id);
ALTER TABLE public.member_tents ADD CONSTRAINT member_tents_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public.membership_applications ADD CONSTRAINT membership_applications_pkey PRIMARY KEY (id);
ALTER TABLE public.membership_files ADD CONSTRAINT membership_files_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.onboarding_hilfe ADD CONSTRAINT onboarding_hilfe_pkey PRIMARY KEY (key);
ALTER TABLE public.onboarding_schritte ADD CONSTRAINT onboarding_schritte_pkey PRIMARY KEY (key);
ALTER TABLE public.pdf_texts ADD CONSTRAINT pdf_texts_pkey PRIMARY KEY (key);
ALTER TABLE public.permission_catalog ADD CONSTRAINT permission_catalog_pkey PRIMARY KEY (key);
ALTER TABLE public.profile_fields ADD CONSTRAINT profile_fields_block_key_key UNIQUE (block_key);
ALTER TABLE public.profile_fields ADD CONSTRAINT profile_fields_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (endpoint);
ALTER TABLE public.representation_log ADD CONSTRAINT representation_log_group_id_fkey FOREIGN KEY (group_id) REFERENCES election_groups(id) ON DELETE CASCADE;
ALTER TABLE public.representation_log ADD CONSTRAINT representation_log_pkey PRIMARY KEY (id);
ALTER TABLE public.role_catalog ADD CONSTRAINT role_catalog_pkey PRIMARY KEY (key);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_fkey FOREIGN KEY (role) REFERENCES role_catalog(key) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_permission_key UNIQUE (role, permission);
ALTER TABLE public.site_categories ADD CONSTRAINT site_categories_pkey PRIMARY KEY (key);
ALTER TABLE public.site_images ADD CONSTRAINT site_images_pkey PRIMARY KEY (id);
ALTER TABLE public.site_images ADD CONSTRAINT site_images_slot_key UNIQUE (slot);
ALTER TABLE public.site_menu ADD CONSTRAINT site_menu_bereich_check CHECK ((bereich = ANY (ARRAY['kopf'::text, 'fuss_rechtliches'::text])));
ALTER TABLE public.site_menu ADD CONSTRAINT site_menu_page_fk FOREIGN KEY (page_id) REFERENCES site_pages(id) ON DELETE CASCADE;
ALTER TABLE public.site_menu ADD CONSTRAINT site_menu_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES site_menu(id) ON DELETE CASCADE;
ALTER TABLE public.site_menu ADD CONSTRAINT site_menu_pkey PRIMARY KEY (id);
ALTER TABLE public.site_menu ADD CONSTRAINT site_menu_ziel CHECK ((num_nonnulls(page_id, href) = 1));
ALTER TABLE public.site_pages ADD CONSTRAINT site_pages_pkey PRIMARY KEY (id);
ALTER TABLE public.site_pages ADD CONSTRAINT site_pages_seo_type_check CHECK ((seo_type = ANY (ARRAY['keine'::text, 'organisation'::text, 'ueber_uns'::text, 'angebot'::text, 'artikel'::text])));
ALTER TABLE public.site_pages ADD CONSTRAINT site_pages_slug_key UNIQUE (slug);
ALTER TABLE public.source_folders ADD CONSTRAINT source_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES source_folders(id) ON DELETE CASCADE;
ALTER TABLE public.source_folders ADD CONSTRAINT source_folders_pkey PRIMARY KEY (id);
ALTER TABLE public.sources ADD CONSTRAINT sources_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.sources ADD CONSTRAINT sources_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES source_folders(id) ON DELETE CASCADE;
ALTER TABLE public.sources ADD CONSTRAINT sources_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_fkey FOREIGN KEY (role) REFERENCES role_catalog(key) ON UPDATE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_tours ADD CONSTRAINT user_tours_pkey PRIMARY KEY (id);
ALTER TABLE public.user_tours ADD CONSTRAINT user_tours_user_id_tour_key_key UNIQUE (user_id, tour_key);
ALTER TABLE public.votes ADD CONSTRAINT votes_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;
ALTER TABLE public.votes ADD CONSTRAINT votes_election_id_fkey FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE;
ALTER TABLE public.votes ADD CONSTRAINT votes_pkey PRIMARY KEY (id);
ALTER TABLE public.votes ADD CONSTRAINT votes_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES auth.users(id);

-- ══ Indizes ══
CREATE UNIQUE INDEX contribution_rates_jahr_kategorie ON public.contribution_rates USING btree (year, category);
CREATE UNIQUE INDEX event_form_fields_role_unique ON public.event_form_fields USING btree (form_id, ((settings ->> 'role'::text))) WHERE ((settings ->> 'role'::text) IS NOT NULL);
CREATE UNIQUE INDEX forum_draft_category_idx ON public.forum_drafts USING btree (user_id, category_id) WHERE (category_id IS NOT NULL);
CREATE UNIQUE INDEX forum_draft_thread_idx ON public.forum_drafts USING btree (user_id, thread_id) WHERE (thread_id IS NOT NULL);
CREATE UNIQUE INDEX forum_one_event_room ON public.forum_categories USING btree ((true)) WHERE is_event_room;
CREATE INDEX forum_posts_thread_idx ON public.forum_posts USING btree (thread_id, created_at);
CREATE UNIQUE INDEX forum_sub_category_idx ON public.forum_subscriptions USING btree (user_id, category_id) WHERE (category_id IS NOT NULL);
CREATE UNIQUE INDEX forum_sub_thread_idx ON public.forum_subscriptions USING btree (user_id, thread_id) WHERE (thread_id IS NOT NULL);
CREATE INDEX forum_threads_category_idx ON public.forum_threads USING btree (category_id, is_pinned DESC, last_post_at DESC);
CREATE UNIQUE INDEX forum_threads_event_idx ON public.forum_threads USING btree (event_id) WHERE (event_id IS NOT NULL);
CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);
CREATE UNIQUE INDEX idx_profiles_calendar_token ON public.profiles USING btree (calendar_token);
CREATE INDEX member_personas_user_idx ON public.member_personas USING btree (user_id);
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions USING btree (user_id);
CREATE INDEX site_menu_sort_idx ON public.site_menu USING btree (bereich, parent_id, sort_order);
CREATE INDEX site_pages_slug_idx ON public.site_pages USING btree (slug) WHERE is_published;

-- ══ Funktionen ══
CREATE OR REPLACE FUNCTION public.assign_response_to_member(_response_id uuid, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _event_owner uuid;
BEGIN
  SELECT e.created_by INTO _event_owner
  FROM event_form_responses r
  JOIN event_forms ef ON ef.id = r.form_id
  JOIN events e ON e.id = ef.event_id
  WHERE r.id = _response_id;

  IF _event_owner IS NULL THEN
    RAISE EXCEPTION 'Anmeldung nicht gefunden';
  END IF;

  IF NOT (
    _event_owner = auth.uid()
    OR public.is_vorstand(auth.uid())
    OR public.has_permission(auth.uid(), 'events.moderate')
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  IF _user_id IS NOT NULL AND NOT public.is_member(_user_id) THEN
    RAISE EXCEPTION 'Zielnutzer ist kein aktives Mitglied';
  END IF;

  UPDATE event_form_responses
  SET user_id = _user_id, updated_at = now()
  WHERE id = _response_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.backup_manifest()
 RETURNS TABLE(table_name text, approx_rows bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.relname::text, GREATEST(c.reltuples::bigint, 0)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relname;
$function$
;

CREATE OR REPLACE FUNCTION public.backup_schema_ddl()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _out text := '-- Aufbau des Schemas public, erzeugt am ' ||
               to_char(now(), 'YYYY-MM-DD HH24:MI:SS TZ') || E'\n';
  _part text;
BEGIN
  -- ── Aufzählungstypen ──────────────────────────────────────────────────────
  SELECT COALESCE(string_agg(
           format('CREATE TYPE public.%I AS ENUM (%s);', typname, labels),
           E'\n' ORDER BY typname), '')
    INTO _part
  FROM (
    SELECT t.typname::text AS typname,
           string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
  ) enums;
  _out := _out || E'\n-- ══ Typen ══\n' || _part || E'\n';

  -- ── Tabellen mit Spalten ──────────────────────────────────────────────────
  SELECT COALESCE(string_agg(
           format(E'CREATE TABLE public.%I (\n%s\n);', relname, cols),
           E'\n\n' ORDER BY relname), '')
    INTO _part
  FROM (
    SELECT c.relname::text AS relname,
           string_agg(
             format('  %I %s%s%s',
                    a.attname,
                    format_type(a.atttypid, a.atttypmod),
                    CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END,
                    COALESCE(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')),
             E',\n' ORDER BY a.attnum) AS cols
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND NOT a.attisdropped
    GROUP BY c.relname
  ) tabs;
  _out := _out || E'\n-- ══ Tabellen ══\n' || _part || E'\n';

  -- ── Schlüssel, Fremdschlüssel, Prüfbedingungen ────────────────────────────
  SELECT COALESCE(string_agg(
           format('ALTER TABLE public.%I ADD CONSTRAINT %I %s;', tbl, con, def),
           E'\n' ORDER BY tbl, con), '')
    INTO _part
  FROM (
    SELECT c.relname::text AS tbl, con.conname::text AS con,
           pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  ) cons;
  _out := _out || E'\n-- ══ Bedingungen ══\n' || _part || E'\n';

  -- ── Indizes (die zu Bedingungen gehörenden stehen schon oben) ─────────────
  SELECT COALESCE(string_agg(indexdef || ';', E'\n' ORDER BY indexname), '')
    INTO _part
  FROM pg_indexes i
  WHERE i.schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class ic ON ic.oid = con.conindid
      WHERE ic.relname = i.indexname
    );
  _out := _out || E'\n-- ══ Indizes ══\n' || _part || E'\n';

  -- ── Funktionen ────────────────────────────────────────────────────────────
  SELECT COALESCE(string_agg(def, E'\n\n' ORDER BY def), '')
    INTO _part
  FROM (
    SELECT pg_get_functiondef(p.oid) || ';' AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
  ) fns;
  _out := _out || E'\n-- ══ Funktionen ══\n' || _part || E'\n';

  -- ── Trigger ───────────────────────────────────────────────────────────────
  SELECT COALESCE(string_agg(pg_get_triggerdef(t.oid) || ';', E'\n' ORDER BY t.tgname), '')
    INTO _part
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal;
  _out := _out || E'\n-- ══ Trigger ══\n' || _part || E'\n';

  -- ── Zugriffsschutz ────────────────────────────────────────────────────────
  --
  -- Der wichtigste Teil überhaupt: Ohne die Policies stünden die Daten nach
  -- einer Wiederherstellung offen.
  SELECT COALESCE(string_agg(
           format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', relname),
           E'\n' ORDER BY relname), '')
    INTO _part
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity;
  _out := _out || E'\n-- ══ Zugriffsschutz ══\n' || _part || E'\n\n';

  SELECT COALESCE(string_agg(
           format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
                  policyname, tablename, permissive, cmd,
                  array_to_string(roles, ', '),
                  COALESCE(' USING (' || qual || ')', ''),
                  COALESCE(' WITH CHECK (' || with_check || ')', '')),
           E'\n' ORDER BY tablename, policyname), '')
    INTO _part
  FROM pg_policies
  WHERE schemaname = 'public';
  _out := _out || _part || E'\n';

  RETURN _out;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.beitragsstufe_angeboten(_is_active boolean, _geloescht_ab integer, _jahr integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT _is_active
     AND (_geloescht_ab IS NULL
          OR COALESCE(_jahr, EXTRACT(YEAR FROM CURRENT_DATE)::int) < _geloescht_ab);
$function$
;

CREATE OR REPLACE FUNCTION public.beitragsstufe_entfernen(_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jahr       int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_frist      int;
  v_mitglieder int;
  v_ehemalige  int;
  v_letztes    int;
  v_geloescht  int;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'contributions.manage') THEN
    RAISE EXCEPTION 'Keine Berechtigung.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contribution_categories WHERE key = _key) THEN
    RETURN jsonb_build_object('ok', false, 'grund', 'unbekannt');
  END IF;

  -- Die letzte Stufe darf nicht weg: Ohne eine einzige stuende im Antrag keine
  -- Auswahl, und jedes neue Mitglied bekaeme einen leeren Wert.
  IF (SELECT count(*) FROM public.contribution_categories) <= 1 THEN
    RETURN jsonb_build_object('ok', false, 'grund', 'letzte');
  END IF;

  SELECT s.beitrag_aufbewahrung_jahre INTO v_frist
  FROM public.app_settings s WHERE s.id;
  v_frist := COALESCE(v_frist, 5);

  SELECT
    count(*) FILTER (WHERE p.is_active IS DISTINCT FROM false),
    count(*) FILTER (WHERE p.is_active IS false)
  INTO v_mitglieder, v_ehemalige
  FROM public.profiles p WHERE p.membership_type = _key;

  IF v_mitglieder > 0 OR v_ehemalige > 0 THEN
    RETURN jsonb_build_object('ok', false, 'grund', 'mitglieder',
                              'mitglieder', v_mitglieder, 'ehemalige', v_ehemalige);
  END IF;

  SELECT max(r.year) INTO v_letztes
  FROM public.contribution_rates r WHERE r.category = _key;

  -- Kein Satz, nie in Gebrauch: weg damit.
  IF v_letztes IS NULL THEN
    DELETE FROM public.contribution_categories WHERE key = _key;
    RETURN jsonb_build_object('ok', true, 'aktion', 'geloescht');
  END IF;

  -- Aufbewahrungsfrist abgelaufen: Jetzt darf auch die Zeile weg. Die alten
  -- Saetze gehen mit, sie ergeben ohne die Stufe keinen Sinn mehr und
  -- unterliegen derselben Frist.
  IF v_letztes + v_frist < v_jahr THEN
    DELETE FROM public.contribution_rates WHERE category = _key;
    DELETE FROM public.contribution_categories WHERE key = _key;
    RETURN jsonb_build_object('ok', true, 'aktion', 'geloescht',
                              'letztes_datenjahr', v_letztes);
  END IF;

  -- Steht für dieses Jahr schon ein Satz, gilt die Stufe noch bis Jahresende.
  v_geloescht := CASE WHEN v_letztes >= v_jahr THEN v_jahr + 1 ELSE v_jahr END;

  UPDATE public.contribution_categories
  SET geloescht_ab = v_geloescht
  WHERE key = _key;

  RETURN jsonb_build_object(
    'ok', true,
    'aktion', CASE WHEN v_letztes >= v_jahr THEN 'vermerkt' ELSE 'stillgelegt' END,
    'geloescht_ab', v_geloescht,
    'loeschbar_ab', v_letztes + v_frist + 1,
    'letztes_datenjahr', v_letztes
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.beitragsstufe_wieder_anbieten(_key text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.contribution_categories
  SET geloescht_ab = NULL, is_active = true
  WHERE key = _key
    AND public.has_permission(auth.uid(), 'contributions.manage');
$function$
;

CREATE OR REPLACE FUNCTION public.beitragsstufen_status()
 RETURNS TABLE(key text, label text, hinweis text, sort_order integer, is_active boolean, geloescht_ab integer, angeboten boolean, mitglieder integer, ehemalige integer, letztes_datenjahr integer, loeschbar_ab integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.key, c.label, c.hinweis, c.sort_order, c.is_active, c.geloescht_ab,
    public.beitragsstufe_angeboten(c.is_active, c.geloescht_ab),
    (SELECT count(*)::int FROM public.profiles p
      WHERE p.membership_type = c.key AND p.is_active IS DISTINCT FROM false),
    (SELECT count(*)::int FROM public.profiles p
      WHERE p.membership_type = c.key AND p.is_active IS false),
    letzt.jahr,
    CASE WHEN letzt.jahr IS NULL THEN NULL
         ELSE letzt.jahr + COALESCE(
                (SELECT s.beitrag_aufbewahrung_jahre FROM public.app_settings s WHERE s.id), 5
              ) + 1
    END
  FROM public.contribution_categories c
  LEFT JOIN LATERAL (
    SELECT max(r.year) AS jahr FROM public.contribution_rates r WHERE r.category = c.key
  ) letzt ON true
  WHERE public.has_permission(auth.uid(), 'contributions.manage')
  ORDER BY c.sort_order, c.label;
$function$
;

CREATE OR REPLACE FUNCTION public.can_vote(_election_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    is_member(_user_id)
    AND EXISTS (
      SELECT 1 FROM elections
      WHERE id = _election_id AND status = 'active'
    )
    AND (
      -- ✅ NEU: darf wählen, solange genutzte Stimmen < erlaubte Stimmen
      (SELECT COUNT(*) FROM votes WHERE election_id = _election_id AND voter_id = _user_id)
      <
      COALESCE(
        (
          SELECT gm.vote_count
          FROM elections e
          JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = _user_id
          WHERE e.id = _election_id
        ),
        1
      )
    )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.cast_votes(_election_id uuid, _voter_id uuid, _votes jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _total integer;
  _allowed integer;
  _used integer;
  _remaining integer;
  _v jsonb;
  _i integer;
BEGIN
  IF auth.uid() IS NULL OR _voter_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Keine Berechtigung: Stimmen können nur für den eigenen Account abgegeben werden';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_election_id::text || ':' || _voter_id::text));

  IF NOT can_vote(_election_id, _voter_id) THEN
    RAISE EXCEPTION 'Abstimmung nicht möglich';
  END IF;

  SELECT COALESCE(gm.vote_count, 1) INTO _allowed
  FROM elections e
  LEFT JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = _voter_id
  WHERE e.id = _election_id;

  SELECT COUNT(*) INTO _used
  FROM votes
  WHERE election_id = _election_id AND voter_id = _voter_id;

  _remaining := GREATEST(_allowed - _used, 0);

  IF _remaining <= 0 THEN
    RAISE EXCEPTION 'Keine weiteren Stimmen verfügbar';
  END IF;

  SELECT COALESCE(SUM((v->>'count')::integer), 0) INTO _total
  FROM jsonb_array_elements(_votes) v;

  IF _total != _remaining THEN
    RAISE EXCEPTION 'Genau % Stimmen erforderlich, % abgegeben', _remaining, _total;
  END IF;

  FOR _v IN SELECT * FROM jsonb_array_elements(_votes)
  LOOP
    IF (_v->>'count')::integer > 0 THEN
      FOR _i IN 1..(_v->>'count')::integer
      LOOP
        INSERT INTO votes (election_id, candidate_id, voter_id)
        VALUES (_election_id, (_v->>'candidate_id')::uuid, _voter_id);
      END LOOP;
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.count_members()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT user_id) FROM public.user_roles
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_event_thread(_event_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _event       public.events%ROWTYPE;
  _mode        text;
  _category_id uuid;
  _thread_id   uuid;
  _slug        text;
BEGIN
  SELECT * INTO _event FROM public.events WHERE id = _event_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(forum_event_thread, 'vorgabe_an') INTO _mode FROM public.app_settings WHERE id;
  IF _mode = 'aus' THEN RETURN NULL; END IF;
  IF _mode <> 'immer' AND COALESCE(_event.forum_thread_wanted, _mode = 'vorgabe_an') IS NOT TRUE THEN
    RETURN NULL;
  END IF;

  SELECT id INTO _thread_id FROM public.forum_threads WHERE event_id = _event_id;
  IF _thread_id IS NOT NULL THEN RETURN _thread_id; END IF;

  SELECT id INTO _category_id FROM public.forum_categories
   WHERE is_event_room AND status = 'aktiv' LIMIT 1;
  IF _category_id IS NULL THEN RETURN NULL; END IF;

  _slug := left(regexp_replace(lower(
             translate(_event.title, 'äöüßÄÖÜ', 'aousAOU')
           ), '[^a-z0-9]+', '-', 'g'), 60);
  IF _slug = '' OR _slug IS NULL THEN _slug := 'termin'; END IF;

  INSERT INTO public.forum_threads (category_id, title, slug, created_by, event_id, event_ends_on)
  VALUES (_category_id, _event.title, _slug, _event.created_by, _event_id,
          COALESCE(_event.end_date, _event.start_date)::date)
  RETURNING id INTO _thread_id;

  INSERT INTO public.forum_posts (thread_id, body, created_by)
  VALUES (
    _thread_id,
    '<p>Hier könnt ihr alles zu <strong>' ||
      replace(replace(_event.title, '&', '&amp;'), '<', '&lt;') ||
      '</strong> besprechen – Fahrgemeinschaften, Material, wer was mitbringt.</p>',
    _event.created_by
  );

  RETURN _thread_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.events_archive_thread()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.forum_threads
  SET is_archived = true,
      event_id = NULL
  WHERE event_id = OLD.id;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.events_create_thread()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.ensure_event_thread(NEW.id);
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.events_sync_thread_title()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.forum_threads
  SET title = NEW.title,
      event_ends_on = COALESCE(NEW.end_date, NEW.start_date)::date
  WHERE event_id = NEW.id
    AND (title IS DISTINCT FROM NEW.title
         OR event_ends_on IS DISTINCT FROM COALESCE(NEW.end_date, NEW.start_date)::date);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.forum_can(_category_id uuid, _what text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_permission(auth.uid(), 'forum.moderate')
      OR EXISTS (
        SELECT 1
        FROM public.forum_category_roles cr
        JOIN public.user_roles ur ON ur.role = cr.role AND ur.user_id = auth.uid()
        WHERE cr.category_id = _category_id
          AND CASE _what
                WHEN 'view'  THEN cr.can_view
                WHEN 'reply' THEN cr.can_reply
                WHEN 'start' THEN cr.can_start
                WHEN 'mod'   THEN cr.is_moderator
                ELSE false
              END
      );
$function$
;

CREATE OR REPLACE FUNCTION public.forum_keep_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    INSERT INTO public.forum_post_revisions (post_id, body, edited_by)
    VALUES (OLD.id, OLD.body, COALESCE(auth.uid(), OLD.created_by));
    NEW.edited_at := now();
    NEW.edited_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.forum_mentioned_users(_body text)
 RETURNS TABLE(user_id uuid)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT m[1]::uuid
  FROM regexp_matches(
         COALESCE(_body, ''),
         'data-mention-id="([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"',
         'g'
       ) AS m;
$function$
;

CREATE OR REPLACE FUNCTION public.forum_notify_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _thread    public.forum_threads%ROWTYPE;
  _actor     text;
  _mentioned uuid[];
BEGIN
  SELECT * INTO _thread FROM public.forum_threads WHERE id = NEW.thread_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Ein Mitglied')
    INTO _actor FROM public.profiles WHERE id = NEW.created_by;

  -- Nur Mitglieder, die die Rubrik auch sehen dürfen – sonst verrät eine
  -- Erwähnung die Existenz eines Themas, das für den Betreffenden gesperrt ist.
  SELECT COALESCE(array_agg(m.user_id), '{}')
    INTO _mentioned
  FROM public.forum_mentioned_users(NEW.body) m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.user_id IS DISTINCT FROM NEW.created_by
    AND COALESCE(p.is_active, false)
    -- forum_can() fragt immer nach dem angemeldeten Nutzer; hier geht es um
    -- einen anderen, deshalb die Prüfung ausgeschrieben.
    AND (
      public.has_permission(m.user_id, 'forum.moderate')
      OR EXISTS (
        SELECT 1
        FROM public.forum_category_roles cr
        JOIN public.user_roles ur ON ur.role = cr.role AND ur.user_id = m.user_id
        WHERE cr.category_id = _thread.category_id AND cr.can_view
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.forum_subscriptions s
      WHERE s.user_id = m.user_id AND s.thread_id = NEW.thread_id AND s.level = 'stumm'
    );

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
  SELECT u,
         NEW.created_by,
         'forum_mention',
         _actor || ' hat dich erwähnt',
         _thread.title,
         '/intern/forum/thema/' || _thread.id,
         'forum_thread',
         _thread.id
  FROM unnest(_mentioned) AS u;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
  SELECT a.user_id,
         NEW.created_by,
         'forum_reply',
         _actor || ' hat geantwortet',
         _thread.title,
         '/intern/forum/thema/' || _thread.id,
         'forum_thread',
         _thread.id
  FROM public.forum_thread_audience(NEW.thread_id, NEW.created_by) a
  WHERE NOT (a.user_id = ANY(_mentioned));

  -- Wer antwortet, beobachtet das Thema künftig – abbestellen geht jederzeit.
  -- Die Bedingung hinter ON CONFLICT muss sein: der Unique-Index ist teilweise
  -- (siehe 20260908030000), ohne sie findet Postgres ihn nicht.
  INSERT INTO public.forum_subscriptions (user_id, thread_id, level)
  VALUES (NEW.created_by, NEW.thread_id, 'beobachten')
  ON CONFLICT (user_id, thread_id) WHERE thread_id IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.forum_notify_thread()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _actor text;
  _category text;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Ein Mitglied')
    INTO _actor FROM public.profiles WHERE id = NEW.created_by;
  SELECT name INTO _category FROM public.forum_categories WHERE id = NEW.category_id;

  -- Nur an Leute, die diese Rubrik beobachten – sonst wird die Glocke zur Last.
  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, entity_type, entity_id)
  SELECT s.user_id,
         NEW.created_by,
         'forum_thread',
         _actor || ' hat ein Thema eröffnet',
         COALESCE(_category || ': ', '') || NEW.title,
         '/intern/forum/thema/' || NEW.id,
         'forum_thread',
         NEW.id
  FROM public.forum_subscriptions s
  WHERE s.category_id = NEW.category_id
    AND s.level <> 'stumm'
    AND s.user_id IS DISTINCT FROM NEW.created_by;

  INSERT INTO public.forum_subscriptions (user_id, thread_id, level)
  VALUES (NEW.created_by, NEW.id, 'beobachten')
  ON CONFLICT (user_id, thread_id) WHERE thread_id IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.forum_poll_results(_post_id uuid)
 RETURNS TABLE(option_key text, stimmen integer, namen text[], note_by text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _anonym boolean;
  _thread uuid;
BEGIN
  SELECT COALESCE((p.payload ->> 'anonym')::boolean, false), p.thread_id
    INTO _anonym, _thread
  FROM public.forum_posts p WHERE p.id = _post_id;

  IF _thread IS NULL THEN RETURN; END IF;

  -- Nur wer den Thread sehen darf, sieht auch das Ergebnis.
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_threads t
    WHERE t.id = _thread AND public.forum_can(t.category_id, 'view')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.option_key,
         COUNT(*)::integer,
         CASE WHEN _anonym THEN '{}'::text[]
              ELSE array_agg(COALESCE(NULLIF(TRIM(pr.display_name), ''), 'Mitglied') ORDER BY pr.display_name)
         END,
         array_remove(array_agg(v.note ORDER BY v.created_at), NULL)
  FROM public.forum_poll_votes v
  LEFT JOIN public.profiles pr ON pr.id = v.user_id
  WHERE v.post_id = _post_id
  GROUP BY v.option_key;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.forum_thread_audience(_thread_id uuid, _exclude uuid)
 RETURNS TABLE(user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT u.user_id
  FROM (
    SELECT t.created_by AS user_id FROM public.forum_threads t WHERE t.id = _thread_id
    UNION
    SELECT p.created_by FROM public.forum_posts p WHERE p.thread_id = _thread_id
    UNION
    SELECT s.user_id FROM public.forum_subscriptions s
     WHERE s.thread_id = _thread_id AND s.level <> 'stumm'
  ) u
  WHERE u.user_id IS DISTINCT FROM _exclude
    -- Ausdrücklich stummgeschaltete Themen schlagen alles andere.
    AND NOT EXISTS (
      SELECT 1 FROM public.forum_subscriptions s2
      WHERE s2.user_id = u.user_id AND s2.thread_id = _thread_id AND s2.level = 'stumm'
    );
$function$
;

CREATE OR REPLACE FUNCTION public.forum_threads_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.event_id IS NOT NULL THEN
      RAISE EXCEPTION 'Diese Absprache gehoert zu einer Veranstaltung. Sie verschwindet, wenn der Termin geloescht wird.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- Der Termin wird gerade gelöscht (event_id fällt in derselben Änderung
  -- weg) – dann ist das Archivieren gewollt.
  IF OLD.event_id IS NOT NULL AND NEW.event_id IS NOT DISTINCT FROM OLD.event_id THEN
    IF NEW.is_archived AND NOT OLD.is_archived THEN
      IF OLD.event_ends_on IS NULL OR OLD.event_ends_on >= CURRENT_DATE THEN
        RAISE EXCEPTION 'Solange der Termin laeuft, kann die Absprache nicht archiviert werden.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.forum_touch_thread()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_threads
    SET post_count = post_count + 1, last_post_at = NEW.created_at, last_post_by = NEW.created_by
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_threads
    SET post_count = GREATEST(post_count - 1, 0)
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_board_members()
 RETURNS TABLE(role_key text, role_label text, sort_order integer, display_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT rc.key,
         rc.label,
         rc.sort_order,
         COALESCE(
           NULLIF(TRIM(p.display_name), ''),
           NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), '')
         )
  FROM public.role_catalog rc
  LEFT JOIN LATERAL (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text = rc.key
    ORDER BY ur.created_at, ur.user_id
    LIMIT 1
  ) held ON true
  LEFT JOIN public.profiles p ON p.id = held.user_id AND p.is_active IS DISTINCT FROM false
  WHERE rc.public_listed
  ORDER BY rc.sort_order, rc.key
$function$
;

CREATE OR REPLACE FUNCTION public.get_contribution_rate(_category text, _year integer DEFAULT NULL::integer)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT amount FROM public.contribution_rates
      WHERE category = _category
        AND year <= COALESCE(_year, EXTRACT(YEAR FROM CURRENT_DATE)::int)
      ORDER BY year DESC LIMIT 1),
    (SELECT r.amount FROM public.contribution_rates r
      JOIN public.contribution_categories c ON c.key = r.category
      WHERE r.year <= COALESCE(_year, EXTRACT(YEAR FROM CURRENT_DATE)::int)
      ORDER BY c.sort_order, r.year DESC LIMIT 1)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_contribution_rate()
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT amount
  FROM public.contribution_rates
  WHERE year <= EXTRACT(YEAR FROM CURRENT_DATE)::int
  ORDER BY year DESC
  LIMIT 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_satzung_path()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    -- Das ausdruecklich gewaehlte Dokument.
    (SELECT d.storage_path
       FROM public.documents d
       JOIN public.app_settings s ON s.satzung_document_id = d.id
      WHERE s.id),
    -- Sonst wie bisher: das neueste der Kategorie.
    (SELECT storage_path
       FROM public.documents
      WHERE category = 'satzung'
      ORDER BY created_at DESC
      LIMIT 1)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_election_results()
 RETURNS TABLE(candidate_id uuid, candidate_name text, election_id uuid, vote_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.name, c.election_id, count(v.id)
  FROM public.candidates c
  LEFT JOIN public.votes v ON v.candidate_id = c.id
  WHERE public.is_member(auth.uid())
  GROUP BY c.id, c.name, c.election_id;
$function$
;

CREATE OR REPLACE FUNCTION public.get_form_by_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'form', jsonb_build_object('id', f.id, 'title', f.title, 'description', f.description, 'is_open', f.is_open, 'event_id', f.event_id, 'settings', f.settings),
    'event', jsonb_build_object('title', e.title, 'start_date', e.start_date, 'end_date', e.end_date, 'location', e.location, 'all_day', e.all_day),
    'fields', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ff.id, 'type', ff.type, 'label', ff.label, 'description', ff.description, 'required', ff.required, 'sort_order', ff.sort_order, 'options', ff.options, 'settings', ff.settings) ORDER BY ff.sort_order) FROM event_form_fields ff WHERE ff.form_id = f.id), '[]'::jsonb)
  ) INTO _result
  FROM event_forms f
  JOIN events e ON e.id = f.event_id
  WHERE f.public_token = _token AND f.is_open = true;
  
  RETURN _result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_map_members()
 RETURNS TABLE(id uuid, display_name text, city text, zip text, map_lat double precision, map_lng double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.city, p.zip, p.map_lat, p.map_lng
  FROM public.profiles p
  WHERE p.show_on_map = true
    AND p.is_active = true
    AND public.is_member(auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.get_member_directory()
 RETURNS TABLE(id uuid, display_name text, is_active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.is_active
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
$function$
;

CREATE OR REPLACE FUNCTION public.get_member_ids()
 RETURNS TABLE(user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE public.is_member(ur.user_id)
$function$
;

CREATE OR REPLACE FUNCTION public.get_pending_application_count()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer FROM public.membership_applications WHERE status = 'pending';
$function$
;

CREATE OR REPLACE FUNCTION public.get_permission_catalog()
 RETURNS TABLE(key text, label text, category text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT key, label, category FROM public.permission_catalog ORDER BY category, sort_order
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_personas()
 RETURNS TABLE(period text, portrayal text, expertise text, images text[], name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.period, p.portrayal, p.expertise, p.public_images,
         -- Nur bei ausdrücklicher Zustimmung, und nur der Anzeigename. Die
         -- Kennung des Kontos bleibt aussen vor: Sie taugt zum Verknüpfen mit
         -- anderen Daten, der Anzeigename nicht.
         CASE WHEN p.show_name THEN pr.display_name END
  FROM public.member_personas p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.is_public
  ORDER BY p.period, p.sort_order, p.id
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_settings()
 RETURNS TABLE(org_name text, org_short_name text, org_tagline text, website_url text, logo_path text, color_primary text, color_dark text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.org_name, s.org_short_name, s.org_tagline,
         s.website_url, s.logo_path, s.color_primary, s.color_dark
  FROM public.app_settings s
  WHERE s.id
$function$
;

CREATE OR REPLACE FUNCTION public.get_response_by_edit_token(_edit_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'form', jsonb_build_object('id', f.id, 'title', f.title, 'description', f.description, 'is_open', f.is_open, 'event_id', f.event_id, 'settings', f.settings),
    'event', jsonb_build_object('title', e.title, 'start_date', e.start_date, 'end_date', e.end_date, 'location', e.location, 'all_day', e.all_day),
    'fields', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ff.id, 'type', ff.type, 'label', ff.label, 'description', ff.description, 'required', ff.required, 'sort_order', ff.sort_order, 'options', ff.options, 'settings', ff.settings) ORDER BY ff.sort_order) FROM event_form_fields ff WHERE ff.form_id = f.id), '[]'::jsonb),
    'response', jsonb_build_object('id', r.id, 'respondent_name', r.respondent_name, 'respondent_email', r.respondent_email),
    'answers', COALESCE((SELECT jsonb_agg(jsonb_build_object('field_id', a.field_id, 'value', a.value)) FROM event_form_answers a WHERE a.response_id = r.id), '[]'::jsonb)
  ) INTO _result
  FROM event_form_responses r
  JOIN event_forms f ON f.id = r.form_id
  JOIN events e ON e.id = f.event_id
  WHERE r.edit_token = _edit_token AND f.is_open = true;

  RETURN _result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_role_catalog()
 RETURNS TABLE(key text, label text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT key, label FROM public.role_catalog ORDER BY sort_order
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT rp.permission), '{}')
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = _user_id
    AND rp.granted = true
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_vote_count(_election_id uuid, _user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT gm.vote_count FROM elections e
     JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = _user_id
     WHERE e.id = _election_id),
    1
  )
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
      AND rp.granted = true
  )
$function$
;

CREATE OR REPLACE FUNCTION public.has_voted(_election_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.votes WHERE election_id = _election_id AND voter_id = _user_id
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_member(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$function$
;

CREATE OR REPLACE FUNCTION public.is_vorstand(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_catalog rc ON rc.key = ur.role
    WHERE ur.user_id = _user_id AND rc.is_leadership
  )
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH updated AS (
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = auth.uid()
      AND is_read = false
      AND (_ids IS NULL OR id = ANY(_ids))
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM updated;
$function$
;

CREATE OR REPLACE FUNCTION public.module_enabled(_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH RECURSIVE kette AS (
    SELECT key, enabled, requires FROM public.app_modules WHERE key = _key
    UNION ALL
    SELECT m.key, m.enabled, m.requires
    FROM public.app_modules m
    JOIN kette k ON m.key = k.requires
  )
  -- Unbekannte Schluessel gelten als eingeschaltet: Ein Modul, das der Code
  -- schon kennt und die Datenbank noch nicht, soll sichtbar sein und nicht
  -- stillschweigend fehlen.
  SELECT COALESCE(bool_and(enabled), true) FROM kette;
$function$
;

CREATE OR REPLACE FUNCTION public.module_status()
 RETURNS TABLE(key text, label text, description text, art text, requires text, sort_order integer, enabled boolean, aktiv boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.key, m.label, m.description, m.art, m.requires, m.sort_order,
         m.enabled, public.module_enabled(m.key)
  FROM public.app_modules m
  ORDER BY m.sort_order, m.label;
$function$
;

CREATE OR REPLACE FUNCTION public.onboarding_erledigt()
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(k), ARRAY[]::text[]) FROM (
    SELECT 'profil' AS k WHERE EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.first_name, '') <> ''
        AND COALESCE(p.last_name, '') <> ''
        AND COALESCE(p.city, '') <> ''
    )
    UNION ALL
    SELECT 'zelte' WHERE EXISTS (
      SELECT 1 FROM public.member_tents t WHERE t.user_id = auth.uid()
    )
    UNION ALL
    SELECT 'steckbrief' WHERE EXISTS (
      SELECT 1 FROM public.member_personas m WHERE m.user_id = auth.uid()
    )
    UNION ALL
    SELECT 'zusage' WHERE EXISTS (
      SELECT 1 FROM public.event_attendees a WHERE a.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.event_form_responses r WHERE r.user_id = auth.uid()
    )
    UNION ALL
    SELECT 'forum' WHERE EXISTS (
      SELECT 1 FROM public.forum_posts f WHERE f.created_by = auth.uid()
    )
    -- Ab hier die Einrichtung. Sie haengt nicht an der Person, sondern am
    -- Verein: Wer das Logo hochlaedt, erledigt es fuer alle.
    UNION ALL
    SELECT 'verein_benannt' WHERE EXISTS (
      SELECT 1 FROM public.app_settings s
      WHERE s.id AND s.org_name <> 'Mein Verein e. V.'
    )
    UNION ALL
    SELECT 'logo' WHERE EXISTS (
      SELECT 1 FROM public.app_settings s WHERE s.id AND COALESCE(s.logo_path, '') <> ''
    )
    UNION ALL
    SELECT 'bankverbindung' WHERE EXISTS (
      SELECT 1 FROM public.app_settings s WHERE s.id AND COALESCE(s.bank_iban, '') <> ''
    )
    UNION ALL
    SELECT 'seite' WHERE EXISTS (
      SELECT 1 FROM public.site_pages p WHERE p.is_published
    )
    UNION ALL
    SELECT 'mitglieder' WHERE (SELECT count(*) FROM public.profiles) > 1
  ) t;
$function$
;

CREATE OR REPLACE FUNCTION public.pending_digests()
 RETURNS TABLE(user_id uuid, display_name text, items jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id,
         p.display_name,
         jsonb_agg(jsonb_build_object(
           'title', n.title, 'body', n.body, 'link', n.link, 'created_at', n.created_at
         ) ORDER BY n.created_at)
  FROM public.profiles p
  JOIN public.notifications n
    ON n.user_id = p.id
   AND NOT n.is_read
   AND n.created_at > COALESCE(p.digest_sent_at, now() - interval '7 days')
  WHERE p.notify_digest AND p.is_active IS DISTINCT FROM false
  GROUP BY p.id, p.display_name;
$function$
;

CREATE OR REPLACE FUNCTION public.public_branding()
 RETURNS TABLE(org_name text, org_short_name text, org_tagline text, org_street text, org_zip text, org_city text, org_country text, org_email text, org_phone text, logo_path text, favicon_path text, logo_in_header boolean, color_primary text, color_dark text, color_surface text, seo_description text, seo_image_path text, website_url text, font_headings text, font_body text, board_members text, register_court text, register_number text, vat_id text, privacy_contact text, privacy_officer text, hosting_provider text, hosting_address text, footer_navigation_label text, footer_legal_label text, satzung_link boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT org_name, org_short_name, org_tagline, org_street, org_zip, org_city,
         org_country, org_email, org_phone,
         logo_path, favicon_path, logo_in_header, color_primary, color_dark,
         color_surface, seo_description, seo_image_path, website_url,
         font_headings, font_body,
         board_members, register_court, register_number, vat_id,
         privacy_contact, privacy_officer, hosting_provider, hosting_address,
         footer_navigation_label, footer_legal_label, satzung_link
  FROM public.app_settings
  WHERE id;
$function$
;

CREATE OR REPLACE FUNCTION public.public_contribution_settings()
 RETURNS TABLE(model text, options jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE((SELECT s.contribution_model FROM public.app_settings s WHERE s.id), 'fest'),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'key', c.key,
               'label', c.label,
               'hinweis', c.hinweis,
               'amount', public.get_contribution_rate(c.key)
             ) ORDER BY c.sort_order, c.label)
      FROM public.contribution_categories c
      WHERE public.beitragsstufe_angeboten(c.is_active, c.geloescht_ab)
    ), '[]'::jsonb);
$function$
;

CREATE OR REPLACE FUNCTION public.push_mark_failure(_endpoint text, _gone boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _gone THEN
    -- 404/410 vom Push-Dienst heisst: Das Geraet gibt es nicht mehr.
    DELETE FROM public.push_subscriptions WHERE endpoint = _endpoint;
  ELSE
    UPDATE public.push_subscriptions
    SET failure_count = failure_count + 1
    WHERE endpoint = _endpoint;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.push_targets_for_thread(_thread_id uuid, _exclude uuid)
 RETURNS TABLE(endpoint text, p256dh text, auth text, user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.endpoint, s.p256dh, s.auth, s.user_id
  FROM public.forum_thread_audience(_thread_id, _exclude) a
  JOIN public.profiles p ON p.id = a.user_id AND p.notify_push AND p.is_active IS DISTINCT FROM false
  JOIN public.push_subscriptions s ON s.user_id = a.user_id
  WHERE s.failure_count < 5;
$function$
;

CREATE OR REPLACE FUNCTION public.role_catalog_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = OLD.key) THEN
    RAISE EXCEPTION 'An der Rolle „%" hängen noch Mitglieder. Trage sie erst um.', OLD.label;
  END IF;

  IF EXISTS (SELECT 1 FROM public.app_settings WHERE id AND default_role = OLD.key) THEN
    RAISE EXCEPTION 'Die Rolle „%" ist die Standardrolle für neue Mitglieder. Stelle erst eine andere ein.', OLD.label;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role = OLD.key AND permission = 'roles.manage' AND granted
  ) AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role <> OLD.key AND permission = 'roles.manage' AND granted
  ) THEN
    RAISE EXCEPTION 'Das ist die letzte Rolle, die Rechte vergeben darf. Ohne sie kommt niemand mehr in die Rechteverwaltung.';
  END IF;

  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.role_status()
 RETURNS TABLE(key text, label text, description text, sort_order integer, is_board boolean, is_leadership boolean, public_listed boolean, is_system boolean, is_default boolean, max_holders integer, member_count integer, permission_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT rc.key, rc.label, rc.description, rc.sort_order,
         rc.is_board, rc.is_leadership, rc.public_listed, rc.is_system,
         rc.key = (SELECT s.default_role FROM public.app_settings s WHERE s.id),
         rc.max_holders,
         (SELECT count(*)::int FROM public.user_roles ur WHERE ur.role = rc.key),
         (SELECT count(*)::int FROM public.role_permissions rp
           WHERE rp.role = rc.key AND rp.granted)
  FROM public.role_catalog rc
  WHERE public.has_permission(auth.uid(), 'roles.manage')
  ORDER BY rc.sort_order, rc.label;
$function$
;

CREATE OR REPLACE FUNCTION public.satzung_auswahl()
 RETURNS TABLE(id uuid, title text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.id, d.title, d.created_at
  FROM public.documents d
  WHERE d.category = 'satzung'
    AND public.has_permission(auth.uid(), 'system.settings')
  ORDER BY d.created_at DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.seo_organisation_seiten()
 RETURNS TABLE(id uuid, title text, slug text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.title, p.slug
  FROM public.site_pages p
  WHERE p.seo_type = 'organisation'
    AND public.has_permission(auth.uid(), 'site.content_edit')
  ORDER BY p.title;
$function$
;

CREATE OR REPLACE FUNCTION public.set_persona_public(_persona_id uuid, _is_public boolean, _public_images text[] DEFAULT '{}'::text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_permission(auth.uid(), 'personas.publish') THEN
    RAISE EXCEPTION 'Keine Berechtigung, Darstellungen freizugeben';
  END IF;

  UPDATE public.member_personas
  SET is_public     = _is_public,
      public_images = CASE WHEN _is_public THEN _public_images ELSE '{}'::text[] END,
      published_at  = CASE WHEN _is_public THEN now() ELSE NULL END,
      published_by  = CASE WHEN _is_public THEN auth.uid() ELSE NULL END,
      updated_at    = now()
  WHERE id = _persona_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Darstellung nicht gefunden';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.setup_needed()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles)
$function$
;

CREATE OR REPLACE FUNCTION public.site_pages_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_form_response(_token text, _name text, _email text, _answers jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _form_id uuid;
  _response_id uuid;
  _edit_token text;
  _answer jsonb;
  _user_id uuid;
  _matched_id uuid;
BEGIN
  SELECT id INTO _form_id FROM event_forms WHERE public_token = _token AND is_open = true;
  IF _form_id IS NULL THEN
    RAISE EXCEPTION 'Formular nicht gefunden oder geschlossen';
  END IF;

  _user_id := auth.uid();

  -- If not logged in but email matches an active member, auto-link
  IF _user_id IS NULL AND _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    SELECT u.id INTO _matched_id
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = lower(trim(_email))
      AND COALESCE(p.is_active, true) = true
      AND public.is_member(u.id)
    LIMIT 1;
    IF _matched_id IS NOT NULL THEN
      _user_id := _matched_id;
    END IF;
  END IF;

  INSERT INTO event_form_responses (form_id, respondent_name, respondent_email, user_id)
  VALUES (_form_id, _name, _email, _user_id)
  RETURNING id, edit_token INTO _response_id, _edit_token;

  FOR _answer IN SELECT * FROM jsonb_array_elements(_answers)
  LOOP
    INSERT INTO event_form_answers (response_id, field_id, value)
    VALUES (_response_id, (_answer->>'field_id')::uuid, _answer->'value');
  END LOOP;

  RETURN _edit_token;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_election_on_vote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.elections
  SET updated_at = now()
  WHERE id = COALESCE(NEW.election_id, OLD.election_id);
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_form_settings(_form_id uuid, _patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _created_by uuid;
  _result jsonb;
BEGIN
  IF jsonb_typeof(_patch) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Einstellungen müssen ein JSON-Objekt sein';
  END IF;

  SELECT created_by INTO _created_by FROM public.event_forms WHERE id = _form_id;
  IF _created_by IS NULL THEN
    RAISE EXCEPTION 'Formular nicht gefunden';
  END IF;

  -- Dieselbe Bedingung wie die UPDATE-Policy auf event_forms.
  IF NOT (_created_by = auth.uid() OR public.has_permission(auth.uid(), 'events.moderate')) THEN
    RAISE EXCEPTION 'Keine Berechtigung, dieses Formular zu ändern';
  END IF;

  -- Verhindert, dass zwei gleichzeitige Änderungen einander überholen.
  PERFORM pg_advisory_xact_lock(hashtext(_form_id::text));

  UPDATE public.event_forms
  SET settings = COALESCE(settings, '{}'::jsonb) || _patch,
      updated_at = now()
  WHERE id = _form_id
  RETURNING settings INTO _result;

  RETURN _result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_response_by_edit_token(_edit_token text, _name text, _email text, _answers jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _response_id uuid;
  _answer jsonb;
BEGIN
  SELECT r.id INTO _response_id
  FROM event_form_responses r
  JOIN event_forms f ON f.id = r.form_id
  WHERE r.edit_token = _edit_token AND f.is_open = true;

  IF _response_id IS NULL THEN
    RAISE EXCEPTION 'Anmeldung nicht gefunden oder Formular geschlossen';
  END IF;

  UPDATE event_form_responses SET respondent_name = _name, respondent_email = _email, updated_at = now()
  WHERE id = _response_id;

  DELETE FROM event_form_answers WHERE response_id = _response_id;

  FOR _answer IN SELECT * FROM jsonb_array_elements(_answers)
  LOOP
    INSERT INTO event_form_answers (response_id, field_id, value)
    VALUES (_response_id, (_answer->>'field_id')::uuid, _answer->'value');
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.vorlagen_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$function$
;

-- ══ Trigger ══
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_forum_thread AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION events_create_thread();
CREATE TRIGGER events_forum_thread_archive BEFORE DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION events_archive_thread();
CREATE TRIGGER events_forum_thread_title BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION events_sync_thread_title();
CREATE TRIGGER form_templates_updated_at BEFORE UPDATE ON public.form_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER forum_posts_keep_revision BEFORE UPDATE ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION forum_keep_revision();
CREATE TRIGGER forum_posts_notify AFTER INSERT ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION forum_notify_post();
CREATE TRIGGER forum_posts_touch_thread AFTER INSERT OR DELETE ON public.forum_posts FOR EACH ROW EXECUTE FUNCTION forum_touch_thread();
CREATE TRIGGER forum_threads_guard_del BEFORE DELETE ON public.forum_threads FOR EACH ROW EXECUTE FUNCTION forum_threads_guard();
CREATE TRIGGER forum_threads_guard_upd BEFORE UPDATE ON public.forum_threads FOR EACH ROW EXECUTE FUNCTION forum_threads_guard();
CREATE TRIGGER forum_threads_notify AFTER INSERT ON public.forum_threads FOR EACH ROW EXECUTE FUNCTION forum_notify_thread();
CREATE TRIGGER mail_templates_touch_trg BEFORE UPDATE ON public.mail_templates FOR EACH ROW EXECUTE FUNCTION vorlagen_touch();
CREATE TRIGGER member_personas_touch BEFORE UPDATE ON public.member_personas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pdf_texts_touch_trg BEFORE UPDATE ON public.pdf_texts FOR EACH ROW EXECUTE FUNCTION vorlagen_touch();
CREATE TRIGGER role_catalog_guard_trigger BEFORE DELETE ON public.role_catalog FOR EACH ROW EXECUTE FUNCTION role_catalog_guard();
CREATE TRIGGER site_pages_touch_trg BEFORE UPDATE ON public.site_pages FOR EACH ROW EXECUTE FUNCTION site_pages_touch();
CREATE TRIGGER trg_touch_election_on_vote AFTER INSERT OR DELETE ON public.votes FOR EACH ROW EXECUTE FUNCTION touch_election_on_vote();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_event_form_responses_updated_at BEFORE UPDATE ON public.event_form_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_event_forms_updated_at BEFORE UPDATE ON public.event_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══ Zugriffsschutz ══
ALTER TABLE public.announcement_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epoch_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epoch_visitor_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_category_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_read_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_tents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_hilfe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_schritte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can create announcement files" ON public.announcement_files AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_member(auth.uid()));
CREATE POLICY "Members can view announcement files" ON public.announcement_files AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Perm: announcements.moderate delete files" ON public.announcement_files AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'announcements.moderate'::text));
CREATE POLICY "Members can create replies" ON public.announcement_replies AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_member(auth.uid()) AND (created_by = auth.uid())));
CREATE POLICY "Members can view replies" ON public.announcement_replies AS PERMISSIVE FOR SELECT TO public USING (is_member(auth.uid()));
CREATE POLICY "Perm: delete replies" ON public.announcement_replies AS PERMISSIVE FOR DELETE TO authenticated USING (((created_by = auth.uid()) OR has_permission(auth.uid(), 'announcements.moderate'::text)));
CREATE POLICY "Members can create announcements" ON public.announcements AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_member(auth.uid()) AND (created_by = auth.uid())));
CREATE POLICY "Members can view announcements" ON public.announcements AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Perm: announcements.moderate delete" ON public.announcements AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'announcements.moderate'::text));
CREATE POLICY "Perm: announcements.moderate update" ON public.announcements AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'announcements.moderate'::text));
CREATE POLICY "Modulstatus ist oeffentlich lesbar" ON public.app_modules AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Systemverwaltung schaltet Module" ON public.app_modules AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'system.modules'::text)) WITH CHECK (has_permission(auth.uid(), 'system.modules'::text));
CREATE POLICY "Mitglieder lesen Vereinsdaten" ON public.app_settings AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Systemverwaltung aendert Vereinsdaten" ON public.app_settings AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'system.settings'::text)) WITH CHECK (has_permission(auth.uid(), 'system.settings'::text));
CREATE POLICY application_fields_lesen ON public.application_fields AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY application_fields_pflegen ON public.application_fields AS PERMISSIVE FOR ALL TO authenticated USING (has_permission(auth.uid(), 'system.settings'::text)) WITH CHECK (has_permission(auth.uid(), 'system.settings'::text));
CREATE POLICY "Members can view candidates" ON public.candidates AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Perm: elections.manage create candidates" ON public.candidates AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Perm: elections.manage delete candidates" ON public.candidates AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Anyone can send contact" ON public.contact_messages AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Perm: contacts.delete" ON public.contact_messages AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'contacts.delete'::text));
CREATE POLICY "Perm: contacts.view" ON public.contact_messages AS PERMISSIVE FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'contacts.view'::text));
CREATE POLICY "Perm: contacts.reply" ON public.contact_replies AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_permission(auth.uid(), 'contacts.reply'::text) AND (replied_by = auth.uid())));
CREATE POLICY "Perm: contacts.view replies" ON public.contact_replies AS PERMISSIVE FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'contacts.view'::text));
CREATE POLICY contribution_categories_lesen ON public.contribution_categories AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY contribution_categories_pflegen ON public.contribution_categories AS PERMISSIVE FOR ALL TO authenticated USING (has_permission(auth.uid(), 'contributions.manage'::text)) WITH CHECK (has_permission(auth.uid(), 'contributions.manage'::text));
CREATE POLICY "Members can view rates" ON public.contribution_rates AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Perm: contributions.manage insert rates" ON public.contribution_rates AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'contributions.manage'::text));
CREATE POLICY "Perm: contributions.manage update rates" ON public.contribution_rates AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'contributions.manage'::text));
CREATE POLICY "Perm: contributions view" ON public.contributions AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_permission(auth.uid(), 'contributions.manage'::text)));
CREATE POLICY "Perm: contributions.manage delete" ON public.contributions AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'contributions.manage'::text));
CREATE POLICY "Perm: contributions.manage insert" ON public.contributions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'contributions.manage'::text));
CREATE POLICY "Perm: contributions.manage update" ON public.contributions AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'contributions.manage'::text));
CREATE POLICY "Members can view documents" ON public.documents AS PERMISSIVE FOR SELECT TO authenticated USING ((is_member(auth.uid()) AND ((category <> ALL (ARRAY['vorstand'::text, 'vorlagen'::text, 'vereinsshirts'::text])) OR ((category = ANY (ARRAY['vorstand'::text, 'vorlagen'::text])) AND (has_permission(auth.uid(), 'profiles.view_all'::text) OR has_permission(auth.uid(), 'documents.manage'::text))) OR ((category = 'vereinsshirts'::text) AND has_permission(auth.uid(), 'documents.manage'::text)))));
CREATE POLICY "Perm: documents.manage delete" ON public.documents AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'documents.manage'::text));
CREATE POLICY "Perm: documents.manage insert" ON public.documents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'documents.manage'::text));
CREATE POLICY "Perm: audit.view" ON public.election_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'audit.view'::text));
CREATE POLICY "Perm: elections.manage audit insert" ON public.election_audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Members can view election groups" ON public.election_groups AS PERMISSIVE FOR SELECT TO public USING (is_member(auth.uid()));
CREATE POLICY "Perm: elections.manage create groups" ON public.election_groups AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_permission(auth.uid(), 'elections.manage'::text) AND (created_by = auth.uid())));
CREATE POLICY "Perm: elections.manage delete groups" ON public.election_groups AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Perm: elections.manage update groups" ON public.election_groups AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Members can view elections" ON public.elections AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Perm: elections.manage create" ON public.elections AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_permission(auth.uid(), 'elections.manage'::text) AND (created_by = auth.uid())));
CREATE POLICY "Perm: elections.manage delete" ON public.elections AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Perm: elections.manage update" ON public.elections AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Anyone can read epoch_sources" ON public.epoch_sources AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Perm: epoch_sources.manage delete" ON public.epoch_sources AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'epoch_sources.manage'::text));
CREATE POLICY "Perm: epoch_sources.manage insert" ON public.epoch_sources AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'epoch_sources.manage'::text));
CREATE POLICY "Perm: epoch_sources.manage update" ON public.epoch_sources AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'epoch_sources.manage'::text));
CREATE POLICY "Anyone can read epoch_visitor_items" ON public.epoch_visitor_items AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Perm: visitor_highlights.manage delete" ON public.epoch_visitor_items AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'visitor_highlights.manage'::text));
CREATE POLICY "Perm: visitor_highlights.manage insert" ON public.epoch_visitor_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'visitor_highlights.manage'::text));
CREATE POLICY "Perm: visitor_highlights.manage update" ON public.epoch_visitor_items AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'visitor_highlights.manage'::text));
CREATE POLICY "Members can RSVP" ON public.event_attendees AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_member(auth.uid()) AND (user_id = auth.uid())));
CREATE POLICY "Members can remove own RSVP" ON public.event_attendees AS PERMISSIVE FOR DELETE TO public USING ((user_id = auth.uid()));
CREATE POLICY "Members can update own RSVP" ON public.event_attendees AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Members can view attendees" ON public.event_attendees AS PERMISSIVE FOR SELECT TO public USING (is_member(auth.uid()));
CREATE POLICY "Answers viewable with response access" ON public.event_form_answers AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((event_form_responses r
     JOIN event_forms ef ON ((ef.id = r.form_id)))
     JOIN events e ON ((e.id = ef.event_id)))
  WHERE ((r.id = event_form_answers.response_id) AND ((r.user_id = auth.uid()) OR (e.created_by = auth.uid()) OR is_vorstand(auth.uid()))))));
CREATE POLICY "Can delete own answers" ON public.event_form_answers AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM event_form_responses r
  WHERE ((r.id = event_form_answers.response_id) AND (r.user_id = auth.uid())))));
CREATE POLICY "Can insert answers for own response" ON public.event_form_answers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM event_form_responses r
  WHERE ((r.id = event_form_answers.response_id) AND (r.user_id = auth.uid())))));
CREATE POLICY "Can update own answers" ON public.event_form_answers AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM event_form_responses r
  WHERE ((r.id = event_form_answers.response_id) AND (r.user_id = auth.uid())))));
CREATE POLICY "Form owner can delete fields" ON public.event_form_fields AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM event_forms
  WHERE ((event_forms.id = event_form_fields.form_id) AND ((event_forms.created_by = auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text))))));
CREATE POLICY "Form owner can insert fields" ON public.event_form_fields AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM event_forms
  WHERE ((event_forms.id = event_form_fields.form_id) AND ((event_forms.created_by = auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text))))));
CREATE POLICY "Form owner can update fields" ON public.event_form_fields AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM event_forms
  WHERE ((event_forms.id = event_form_fields.form_id) AND ((event_forms.created_by = auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text))))));
CREATE POLICY "Members can view fields" ON public.event_form_fields AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM event_forms f
  WHERE ((f.id = event_form_fields.form_id) AND (is_member(auth.uid()) OR (f.created_by = auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text))))));
CREATE POLICY "Can delete own or manage responses" ON public.event_form_responses AS PERMISSIVE FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (event_forms ef
     JOIN events e ON ((e.id = ef.event_id)))
  WHERE ((ef.id = event_form_responses.form_id) AND ((e.created_by = auth.uid()) OR is_vorstand(auth.uid())))))));
CREATE POLICY "Can update own response" ON public.event_form_responses AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Event owner or vorstand can view responses" ON public.event_form_responses AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (event_forms ef
     JOIN events e ON ((e.id = ef.event_id)))
  WHERE ((ef.id = event_form_responses.form_id) AND ((e.created_by = auth.uid()) OR is_vorstand(auth.uid())))))));
CREATE POLICY "Members can submit responses" ON public.event_form_responses AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_member(auth.uid()) AND (user_id = auth.uid())));
CREATE POLICY "Creator can insert forms" ON public.event_forms AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_member(auth.uid()) AND (created_by = auth.uid())));
CREATE POLICY "Creator or moderator can delete forms" ON public.event_forms AS PERMISSIVE FOR DELETE TO authenticated USING (((created_by = auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text)));
CREATE POLICY "Creator or moderator can update forms" ON public.event_forms AS PERMISSIVE FOR UPDATE TO authenticated USING (((created_by = auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text)));
CREATE POLICY "Members can view forms" ON public.event_forms AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Anyone can view public events" ON public.events AS PERMISSIVE FOR SELECT TO public USING ((is_public = true));
CREATE POLICY "Members can create events" ON public.events AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_member(auth.uid()) AND (created_by = auth.uid())));
CREATE POLICY "Members can view events" ON public.events AS PERMISSIVE FOR SELECT TO public USING (is_member(auth.uid()));
CREATE POLICY "Perm: events.moderate delete" ON public.events AS PERMISSIVE FOR DELETE TO authenticated USING (((created_by = auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text)));
CREATE POLICY "Perm: events.moderate update" ON public.events AS PERMISSIVE FOR UPDATE TO authenticated USING (((created_by = auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text)));
CREATE POLICY "Mitglieder koennen Vorlagen lesen" ON public.form_templates AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Vorstand kann Vorlagen aendern" ON public.form_templates AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text)));
CREATE POLICY "Vorstand kann Vorlagen anlegen" ON public.form_templates AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text)));
CREATE POLICY "Vorstand kann Vorlagen loeschen" ON public.form_templates AS PERMISSIVE FOR DELETE TO authenticated USING ((is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text)));
CREATE POLICY "Rubrik vorschlagen" ON public.forum_categories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_permission(auth.uid(), 'forum.use'::text) AND (created_by = auth.uid()) AND ((status = 'vorgeschlagen'::forum_category_status) OR has_permission(auth.uid(), 'forum.categories_manage'::text))));
CREATE POLICY "Rubriken loeschen" ON public.forum_categories AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'forum.categories_manage'::text));
CREATE POLICY "Rubriken sehen" ON public.forum_categories AS PERMISSIVE FOR SELECT TO authenticated USING ((has_permission(auth.uid(), 'forum.use'::text) AND (((status = 'aktiv'::forum_category_status) AND forum_can(id, 'view'::text)) OR (created_by = auth.uid()) OR has_permission(auth.uid(), 'forum.categories_manage'::text))));
CREATE POLICY "Rubriken verwalten" ON public.forum_categories AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'forum.categories_manage'::text));
CREATE POLICY "Rubrikrechte sehen" ON public.forum_category_roles AS PERMISSIVE FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'forum.use'::text));
CREATE POLICY "Rubrikrechte verwalten" ON public.forum_category_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_permission(auth.uid(), 'forum.categories_manage'::text)) WITH CHECK (has_permission(auth.uid(), 'forum.categories_manage'::text));
CREATE POLICY "Eigene Entwuerfe" ON public.forum_drafts AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Eigene Stimme" ON public.forum_poll_votes AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Stimmen sehen" ON public.forum_poll_votes AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (forum_posts p
     JOIN forum_threads t ON ((t.id = p.thread_id)))
  WHERE ((p.id = forum_poll_votes.post_id) AND forum_can(t.category_id, 'view'::text)))));
CREATE POLICY "Verlauf sehen" ON public.forum_post_revisions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (forum_posts p
     JOIN forum_threads t ON ((t.id = p.thread_id)))
  WHERE ((p.id = forum_post_revisions.post_id) AND forum_can(t.category_id, 'view'::text)))));
CREATE POLICY "Beitraege sehen" ON public.forum_posts AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM forum_threads t
  WHERE ((t.id = forum_posts.thread_id) AND forum_can(t.category_id, 'view'::text)))));
CREATE POLICY "Beitrag aendern" ON public.forum_posts AS PERMISSIVE FOR UPDATE TO authenticated USING (((created_by = auth.uid()) OR has_permission(auth.uid(), 'forum.moderate'::text) OR (EXISTS ( SELECT 1
   FROM forum_threads t
  WHERE ((t.id = forum_posts.thread_id) AND forum_can(t.category_id, 'mod'::text))))));
CREATE POLICY "Beitrag entfernen" ON public.forum_posts AS PERMISSIVE FOR DELETE TO authenticated USING ((has_permission(auth.uid(), 'forum.moderate'::text) OR (EXISTS ( SELECT 1
   FROM forum_threads t
  WHERE ((t.id = forum_posts.thread_id) AND forum_can(t.category_id, 'mod'::text))))));
CREATE POLICY "Beitrag schreiben" ON public.forum_posts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM forum_threads t
  WHERE ((t.id = forum_posts.thread_id) AND (NOT t.is_locked) AND (NOT t.is_archived) AND forum_can(t.category_id, 'reply'::text))))));
CREATE POLICY "Eigene Reaktion" ON public.forum_reactions AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Reaktionen sehen" ON public.forum_reactions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (forum_posts p
     JOIN forum_threads t ON ((t.id = p.thread_id)))
  WHERE ((p.id = forum_reactions.post_id) AND forum_can(t.category_id, 'view'::text)))));
CREATE POLICY "Eigener Lesestand" ON public.forum_read_state AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Eigene Abos" ON public.forum_subscriptions AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Thema aendern" ON public.forum_threads AS PERMISSIVE FOR UPDATE TO authenticated USING ((((created_by = auth.uid()) AND (NOT is_locked)) OR forum_can(category_id, 'mod'::text) OR has_permission(auth.uid(), 'forum.moderate'::text)));
CREATE POLICY "Thema eroeffnen" ON public.forum_threads AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((forum_can(category_id, 'start'::text) AND (created_by = auth.uid()) AND (NOT (EXISTS ( SELECT 1
   FROM forum_categories c
  WHERE ((c.id = forum_threads.category_id) AND c.only_auto_threads))))));
CREATE POLICY "Thema loeschen" ON public.forum_threads AS PERMISSIVE FOR DELETE TO authenticated USING ((forum_can(category_id, 'mod'::text) OR has_permission(auth.uid(), 'forum.moderate'::text)));
CREATE POLICY "Themen sehen" ON public.forum_threads AS PERMISSIVE FOR SELECT TO authenticated USING (forum_can(category_id, 'view'::text));
CREATE POLICY "Anyone can view gallery" ON public.gallery_images AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Perm: gallery.manage delete" ON public.gallery_images AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'gallery.manage'::text));
CREATE POLICY "Perm: gallery.manage insert" ON public.gallery_images AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'gallery.manage'::text));
CREATE POLICY "Perm: gallery.manage update" ON public.gallery_images AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'gallery.manage'::text));
CREATE POLICY "Members can view group members" ON public.group_members AS PERMISSIVE FOR SELECT TO public USING (is_member(auth.uid()));
CREATE POLICY "Perm: elections.manage delete members" ON public.group_members AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Perm: elections.manage insert members" ON public.group_members AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Perm: elections.manage update members" ON public.group_members AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY mail_templates_aendern ON public.mail_templates AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'system.settings'::text)) WITH CHECK (has_permission(auth.uid(), 'system.settings'::text));
CREATE POLICY mail_templates_lesen ON public.mail_templates AS PERMISSIVE FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'system.settings'::text));
CREATE POLICY "Members can view personas" ON public.member_personas AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Users can create own personas" ON public.member_personas AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND is_member(auth.uid())));
CREATE POLICY "Users or Vorstand can delete personas" ON public.member_personas AS PERMISSIVE FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'members.manage'::text)));
CREATE POLICY "Users or Vorstand can update personas" ON public.member_personas AS PERMISSIVE FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'members.manage'::text))) WITH CHECK (((auth.uid() = user_id) OR is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'members.manage'::text)));
CREATE POLICY "Members can view member tents" ON public.member_tents AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Users can delete own tents" ON public.member_tents AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can insert own tents" ON public.member_tents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own tents" ON public.member_tents AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Members managers can delete applications" ON public.membership_applications AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'members.manage'::text));
CREATE POLICY "Members managers can update applications" ON public.membership_applications AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'members.manage'::text));
CREATE POLICY "Members managers can view applications" ON public.membership_applications AS PERMISSIVE FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'members.manage'::text));
CREATE POLICY "Perm: membership_files view" ON public.membership_files AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_permission(auth.uid(), 'membership_files.view'::text)));
CREATE POLICY "Perm: membership_files.manage delete" ON public.membership_files AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'membership_files.manage'::text));
CREATE POLICY "Perm: membership_files.manage insert" ON public.membership_files AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'membership_files.manage'::text));
CREATE POLICY "Service role can insert notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Users can delete own notifications" ON public.notifications AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY onboarding_hilfe_lesen ON public.onboarding_hilfe AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY onboarding_hilfe_pflegen ON public.onboarding_hilfe AS PERMISSIVE FOR ALL TO authenticated USING (has_permission(auth.uid(), 'system.settings'::text)) WITH CHECK (has_permission(auth.uid(), 'system.settings'::text));
CREATE POLICY onboarding_schritte_lesen ON public.onboarding_schritte AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY onboarding_schritte_pflegen ON public.onboarding_schritte AS PERMISSIVE FOR ALL TO authenticated USING (has_permission(auth.uid(), 'system.settings'::text)) WITH CHECK (has_permission(auth.uid(), 'system.settings'::text));
CREATE POLICY pdf_texts_aendern ON public.pdf_texts AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'system.settings'::text)) WITH CHECK (has_permission(auth.uid(), 'system.settings'::text));
CREATE POLICY pdf_texts_oeffentlich ON public.pdf_texts AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Members can view permission catalog" ON public.permission_catalog AS PERMISSIVE FOR SELECT TO public USING (is_member(auth.uid()));
CREATE POLICY profile_fields_lesen ON public.profile_fields AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY profile_fields_pflegen ON public.profile_fields AS PERMISSIVE FOR ALL TO authenticated USING (has_permission(auth.uid(), 'system.settings'::text)) WITH CHECK (has_permission(auth.uid(), 'system.settings'::text));
CREATE POLICY "Perm: profiles.view_all" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'profiles.view_all'::text));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = id));
CREATE POLICY "Eigene Geraete" ON public.push_subscriptions AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Perm: elections.manage insert rep log" ON public.representation_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Perm: elections.manage view rep log" ON public.representation_log AS PERMISSIVE FOR SELECT TO authenticated USING (has_permission(auth.uid(), 'elections.manage'::text));
CREATE POLICY "Members can view role catalog" ON public.role_catalog AS PERMISSIVE FOR SELECT TO public USING (is_member(auth.uid()));
CREATE POLICY role_catalog_lesen ON public.role_catalog AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY role_catalog_pflegen ON public.role_catalog AS PERMISSIVE FOR ALL TO authenticated USING (has_permission(auth.uid(), 'roles.manage'::text)) WITH CHECK (has_permission(auth.uid(), 'roles.manage'::text));
CREATE POLICY "Vorstand can delete permissions" ON public.role_permissions AS PERMISSIVE FOR DELETE TO authenticated USING (is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can insert permissions" ON public.role_permissions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can update permissions" ON public.role_permissions AS PERMISSIVE FOR UPDATE TO authenticated USING (is_vorstand(auth.uid()));
CREATE POLICY "Vorstand can view permissions" ON public.role_permissions AS PERMISSIVE FOR SELECT TO authenticated USING (is_vorstand(auth.uid()));
CREATE POLICY "Kategorien lesen" ON public.site_categories AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Kategorien verwalten" ON public.site_categories AS PERMISSIVE FOR ALL TO authenticated USING ((has_permission(auth.uid(), 'site.content_edit'::text) OR has_permission(auth.uid(), 'site.layout_edit'::text))) WITH CHECK ((has_permission(auth.uid(), 'site.content_edit'::text) OR has_permission(auth.uid(), 'site.layout_edit'::text)));
CREATE POLICY "Anyone can view site_images" ON public.site_images AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Perm: site_images.manage delete" ON public.site_images AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'site_images.manage'::text));
CREATE POLICY "Perm: site_images.manage insert" ON public.site_images AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'site_images.manage'::text));
CREATE POLICY "Perm: site_images.manage update" ON public.site_images AS PERMISSIVE FOR UPDATE TO authenticated USING (has_permission(auth.uid(), 'site_images.manage'::text));
CREATE POLICY "Menue oeffentlich lesen" ON public.site_menu AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Menue verwalten" ON public.site_menu AS PERMISSIVE FOR ALL TO authenticated USING (has_permission(auth.uid(), 'site.layout_edit'::text)) WITH CHECK (has_permission(auth.uid(), 'site.layout_edit'::text));
CREATE POLICY "Seiten anlegen" ON public.site_pages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'site.layout_edit'::text));
CREATE POLICY "Seiten bearbeiten" ON public.site_pages AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_permission(auth.uid(), 'site.content_edit'::text) OR has_permission(auth.uid(), 'site.layout_edit'::text))) WITH CHECK ((has_permission(auth.uid(), 'site.content_edit'::text) OR has_permission(auth.uid(), 'site.layout_edit'::text)));
CREATE POLICY "Seiten loeschen" ON public.site_pages AS PERMISSIVE FOR DELETE TO authenticated USING ((has_permission(auth.uid(), 'site.layout_edit'::text) AND (NOT is_system)));
CREATE POLICY "Seiten oeffentlich lesen" ON public.site_pages AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_published OR has_permission(auth.uid(), 'site.content_edit'::text) OR has_permission(auth.uid(), 'site.layout_edit'::text)));
CREATE POLICY "Members can create folders" ON public.source_folders AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_member(auth.uid()) AND (created_by = auth.uid())));
CREATE POLICY "Members can delete own folders" ON public.source_folders AS PERMISSIVE FOR DELETE TO public USING (((created_by = auth.uid()) OR is_vorstand(auth.uid())));
CREATE POLICY "Members can view folders" ON public.source_folders AS PERMISSIVE FOR SELECT TO public USING (is_member(auth.uid()));
CREATE POLICY "Members can create sources" ON public.sources AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_member(auth.uid()) AND (created_by = auth.uid())));
CREATE POLICY "Members can delete own sources" ON public.sources AS PERMISSIVE FOR DELETE TO authenticated USING ((is_member(auth.uid()) AND (created_by = auth.uid())));
CREATE POLICY "Members can update own sources" ON public.sources AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_member(auth.uid()) AND (created_by = auth.uid())));
CREATE POLICY "Members can view sources" ON public.sources AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Members can view roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (is_member(auth.uid()));
CREATE POLICY "Perm: members.manage delete roles" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated USING (has_permission(auth.uid(), 'members.manage'::text));
CREATE POLICY "Perm: members.manage insert roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (has_permission(auth.uid(), 'members.manage'::text));
CREATE POLICY "Users can delete own tours" ON public.user_tours AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can insert own tours" ON public.user_tours AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can update own tours" ON public.user_tours AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can view own tours" ON public.user_tours AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Members can cast vote" ON public.votes AS PERMISSIVE FOR INSERT TO public WITH CHECK (((voter_id = auth.uid()) AND can_vote(election_id, auth.uid()) AND (EXISTS ( SELECT 1
   FROM candidates
  WHERE ((candidates.id = votes.candidate_id) AND (candidates.election_id = votes.election_id))))));
CREATE POLICY "Members can view own votes" ON public.votes AS PERMISSIVE FOR SELECT TO public USING ((is_member(auth.uid()) AND (voter_id = auth.uid())));


-- == Rechte ==
REVOKE ALL ON FUNCTION public.assign_response_to_member(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backup_manifest() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backup_schema_ddl() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beitragsstufe_angeboten(boolean,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beitragsstufe_entfernen(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beitragsstufe_wieder_anbieten(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.beitragsstufen_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_vote(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cast_votes(uuid,uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_members() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_event_thread(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.events_archive_thread() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.events_create_thread() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.events_sync_thread_title() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forum_can(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forum_keep_revision() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forum_mentioned_users(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forum_notify_post() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forum_notify_thread() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forum_poll_results(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forum_thread_audience(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forum_threads_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forum_touch_thread() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_board_members() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_contribution_rate(text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_current_contribution_rate() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_current_satzung_path() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_election_results() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_form_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_map_members() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_member_directory() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_member_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_application_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_permission_catalog() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_personas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_settings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_response_by_edit_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_role_catalog() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_permissions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_vote_count(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_permission(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_voted(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_vorstand(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.module_enabled(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.module_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.onboarding_erledigt() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pending_digests() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_branding() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_contribution_settings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.push_mark_failure(text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.push_targets_for_thread(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.role_catalog_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.role_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.satzung_auswahl() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seo_organisation_seiten() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_persona_public(uuid,boolean,text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.setup_needed() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.site_pages_touch() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_form_response(text,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_election_on_vote() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_form_settings(uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_response_by_edit_token(text,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vorlagen_touch() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_response_to_member(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.backup_manifest() TO service_role;
GRANT EXECUTE ON FUNCTION public.backup_schema_ddl() TO service_role;
GRANT EXECUTE ON FUNCTION public.beitragsstufe_angeboten(boolean,integer,integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.beitragsstufe_entfernen(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.beitragsstufe_wieder_anbieten(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.beitragsstufen_status() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_vote(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cast_votes(uuid,uuid,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_members() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_event_thread(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.events_archive_thread() TO service_role;
GRANT EXECUTE ON FUNCTION public.events_create_thread() TO service_role;
GRANT EXECUTE ON FUNCTION public.events_sync_thread_title() TO service_role;
GRANT EXECUTE ON FUNCTION public.forum_can(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.forum_keep_revision() TO service_role;
GRANT EXECUTE ON FUNCTION public.forum_mentioned_users(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.forum_notify_post() TO service_role;
GRANT EXECUTE ON FUNCTION public.forum_notify_thread() TO service_role;
GRANT EXECUTE ON FUNCTION public.forum_poll_results(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.forum_thread_audience(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.forum_threads_guard() TO service_role;
GRANT EXECUTE ON FUNCTION public.forum_touch_thread() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_board_members() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_contribution_rate(text,integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_contribution_rate() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_satzung_path() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_election_results() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_form_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_map_members() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_member_directory() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_member_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pending_application_count() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_permission_catalog() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_personas() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_settings() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_response_by_edit_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_role_catalog() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_vote_count(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_voted(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_vorstand(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.module_enabled(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.module_status() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.onboarding_erledigt() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pending_digests() TO service_role;
GRANT EXECUTE ON FUNCTION public.public_branding() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_contribution_settings() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.push_mark_failure(text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.push_targets_for_thread(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.role_catalog_guard() TO service_role;
GRANT EXECUTE ON FUNCTION public.role_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.satzung_auswahl() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.seo_organisation_seiten() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_persona_public(uuid,boolean,text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.setup_needed() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.site_pages_touch() TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_form_response(text,text,text,jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.touch_election_on_vote() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_form_settings(uuid,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_response_by_edit_token(text,text,text,jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.vorlagen_touch() TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcement_files TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcement_files TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcement_files TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcement_replies TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcement_replies TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcement_replies TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcements TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcements TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.announcements TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.app_modules TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.app_modules TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.app_modules TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.app_settings TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.app_settings TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.app_settings TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.application_fields TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.application_fields TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.application_fields TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.candidates TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.candidates TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.candidates TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contact_messages TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contact_messages TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contact_messages TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contact_replies TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contact_replies TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contact_replies TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contribution_categories TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contribution_categories TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contribution_categories TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contribution_rates TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contribution_rates TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contribution_rates TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contributions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contributions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contributions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.documents TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.documents TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.documents TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.election_audit_log TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.election_audit_log TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.election_audit_log TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.election_groups TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.election_groups TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.election_groups TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.elections TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.elections TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.elections TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.epoch_sources TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.epoch_sources TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.epoch_sources TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.epoch_visitor_items TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.epoch_visitor_items TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.epoch_visitor_items TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_attendees TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_attendees TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_attendees TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_form_answers TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_form_answers TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_form_answers TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_form_fields TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_form_fields TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_form_fields TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_form_responses TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_form_responses TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_form_responses TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_forms TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_forms TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.event_forms TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.events TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.events TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.events TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.form_templates TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.form_templates TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.form_templates TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_categories TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_categories TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_categories TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_category_roles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_category_roles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_category_roles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_drafts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_drafts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_drafts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_poll_votes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_poll_votes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_poll_votes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_post_revisions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_post_revisions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_post_revisions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_posts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_posts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_posts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_reactions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_reactions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_reactions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_read_state TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_read_state TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_read_state TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_subscriptions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_subscriptions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_subscriptions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_threads TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_threads TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.forum_threads TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gallery_images TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gallery_images TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gallery_images TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.group_members TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.group_members TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.group_members TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.mail_templates TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.mail_templates TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.mail_templates TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.member_personas TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.member_personas TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.member_personas TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.member_tents TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.member_tents TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.member_tents TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.membership_applications TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.membership_applications TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.membership_files TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.membership_files TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.membership_files TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notifications TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notifications TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notifications TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.onboarding_hilfe TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.onboarding_hilfe TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.onboarding_hilfe TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.onboarding_schritte TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.onboarding_schritte TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.onboarding_schritte TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pdf_texts TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pdf_texts TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pdf_texts TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.permission_catalog TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.permission_catalog TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.permission_catalog TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profile_fields TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profile_fields TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profile_fields TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.push_subscriptions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.push_subscriptions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.push_subscriptions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.representation_log TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.representation_log TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.representation_log TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.role_catalog TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.role_catalog TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.role_catalog TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.role_permissions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.role_permissions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.role_permissions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_categories TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_categories TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_categories TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_images TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_images TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_images TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_menu TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_menu TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_menu TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_pages TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_pages TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.site_pages TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.source_folders TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.source_folders TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.source_folders TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.sources TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.sources TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.sources TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_roles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_roles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_roles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_tours TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_tours TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_tours TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.votes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.votes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.votes TO service_role;
GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.membership_applications TO anon;

-- == Speicher ==
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('documents', 'documents', 'f', 26214400, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,text/plain}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('forum-images', 'forum-images', 'f', 8388608, '{image/jpeg,image/png,image/webp,image/avif,image/gif}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('gallery', 'gallery', 't', 10485760, '{image/jpeg,image/png,image/webp,image/avif,image/gif}'::text[]) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('internal-files', 'internal-files', 'f', 26214400, '{image/jpeg,image/png,image/webp,image/avif,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,text/plain}'::text[]) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Forumbilder hochladen" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'forum-images'::text) AND is_member(auth.uid()) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Forumbilder lesen" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'forum-images'::text) AND is_member(auth.uid())));
CREATE POLICY "Forumbilder löschen" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'forum-images'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR has_permission(auth.uid(), 'forum.moderate'::text))));
CREATE POLICY "Gallery managers can delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'gallery'::text) AND (has_permission(auth.uid(), 'gallery.manage'::text) OR has_permission(auth.uid(), 'site_images.manage'::text))));
CREATE POLICY "Gallery managers can upload" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'gallery'::text) AND (has_permission(auth.uid(), 'gallery.manage'::text) OR has_permission(auth.uid(), 'site_images.manage'::text))));
CREATE POLICY "Members can read documents" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'documents'::text) AND is_member(auth.uid()) AND (EXISTS ( SELECT 1
   FROM documents d
  WHERE ((d.storage_path = objects.name) AND ((d.category <> ALL (ARRAY['vorstand'::text, 'vorlagen'::text, 'vereinsshirts'::text])) OR ((d.category = ANY (ARRAY['vorstand'::text, 'vorlagen'::text])) AND (has_permission(auth.uid(), 'profiles.view_all'::text) OR has_permission(auth.uid(), 'documents.manage'::text))) OR ((d.category = 'vereinsshirts'::text) AND has_permission(auth.uid(), 'documents.manage'::text))))))));
CREATE POLICY "Members can upload internal files" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'internal-files'::text) AND is_member(auth.uid()) AND ((((storage.foldername(name))[1] = 'personas'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)) OR (((storage.foldername(name))[1] = 'membership'::text) AND has_permission(auth.uid(), 'membership_files.manage'::text)) OR (((storage.foldername(name))[1] = 'event-maps'::text) AND (is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text))) OR (((storage.foldername(name))[1] = 'sources'::text) AND (is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'epoch_sources.manage'::text))) OR (((storage.foldername(name))[1] = 'announcements'::text) AND (has_permission(auth.uid(), 'announcements.moderate'::text) OR (EXISTS ( SELECT 1
   FROM announcements a
  WHERE (((a.id)::text = (storage.foldername(objects.name))[2]) AND (a.created_by = auth.uid())))))))));
CREATE POLICY "Members can view internal files" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'internal-files'::text) AND is_member(auth.uid()) AND (((storage.foldername(name))[1] <> 'membership'::text) OR ((storage.foldername(name))[2] = (auth.uid())::text) OR has_permission(auth.uid(), 'membership_files.manage'::text) OR has_permission(auth.uid(), 'membership_files.view'::text))));
CREATE POLICY "Organizers can delete event map files" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'internal-files'::text) AND ((storage.foldername(name))[1] = 'event-maps'::text) AND (is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text))));
CREATE POLICY "Owners can update internal files" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'internal-files'::text) AND ((((storage.foldername(name))[1] = 'personas'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)) OR (((storage.foldername(name))[1] = 'event-maps'::text) AND (is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text))) OR (((storage.foldername(name))[1] = 'membership'::text) AND has_permission(auth.uid(), 'membership_files.manage'::text)) OR (((storage.foldername(name))[1] = 'sources'::text) AND (is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'epoch_sources.manage'::text)))))) WITH CHECK (((bucket_id = 'internal-files'::text) AND ((((storage.foldername(name))[1] = 'personas'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)) OR (((storage.foldername(name))[1] = 'event-maps'::text) AND (is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'events.moderate'::text))) OR (((storage.foldername(name))[1] = 'membership'::text) AND has_permission(auth.uid(), 'membership_files.manage'::text)) OR (((storage.foldername(name))[1] = 'sources'::text) AND (is_vorstand(auth.uid()) OR has_permission(auth.uid(), 'epoch_sources.manage'::text))))));
CREATE POLICY "Public gallery view" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'gallery'::text));
CREATE POLICY "Users can delete own persona images" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'internal-files'::text) AND ((storage.foldername(name))[1] = 'personas'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));
CREATE POLICY "Vorstand can delete documents" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'documents'::text) AND is_vorstand(auth.uid())));
CREATE POLICY "Vorstand can delete internal files" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'internal-files'::text) AND is_vorstand(auth.uid())));
CREATE POLICY "Vorstand can upload documents" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'documents'::text) AND is_vorstand(auth.uid())));

-- == Startdaten ==
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('admin.access', 'Verwaltungsbereich öffnen', 'Allgemein', '1') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('announcements.moderate', 'Ankündigungen erstellen & moderieren', 'Kommunikation', '1') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('audit.view', 'Audit-Log einsehen', 'Allgemein', '3') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('contacts.delete', 'Kontaktanfragen löschen', 'Kontakt', '3') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('contacts.reply', 'Kontaktanfragen beantworten', 'Kontakt', '2') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('contacts.view', 'Kontaktanfragen sehen', 'Kontakt', '1') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('contributions.manage', 'Beiträge verwalten', 'Finanzen', '1') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('documents.manage', 'Dokumente verwalten', 'Verein', '1') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('elections.manage', 'Abstimmungen verwalten', 'Verein', '2') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('epoch_sources.manage', 'Epochen-Quellen verwalten', 'Inhalte', '2') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('events.moderate', 'Alle Veranstaltungen bearbeiten & löschen', 'Kommunikation', '2') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('events.publish', 'Veranstaltungen öffentlich stellen', 'Kommunikation', '3') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('forum.categories_manage', 'Rubriken anlegen und freigeben', 'forum', '320') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('forum.moderate', 'Forum moderieren', 'forum', '310') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('forum.use', 'Forum nutzen', 'forum', '300') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('gallery.manage', 'Galerie verwalten', 'Inhalte', '1') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('members.manage', 'Mitglieder verwalten', 'Mitglieder', '1') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('membership_files.manage', 'Mitgliedsunterlagen verwalten', 'Mitglieder', '3') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('membership_files.view', 'Mitgliedsunterlagen einsehen', 'Mitglieder', '4') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('personas.publish', 'Darstellungen öffentlich freigeben', 'inhalte', '250') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('profiles.view_all', 'Alle Profile einsehen', 'Mitglieder', '2') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('roles.manage', 'Rollen & Berechtigungen verwalten', 'Allgemein', '2') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('site_images.manage', 'Seitenbilder verwalten', 'Inhalte', '4') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('site.content_edit', 'Seiteninhalte bearbeiten (Texte und Bilder)', 'system', '950') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('site.layout_edit', 'Seitenaufbau und Menü ändern', 'system', '960') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('system.email', 'E-Mail-Versand & Vorlagen', 'system', '920') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('system.integrations', 'Einbindungen & Schnittstellen', 'system', '930') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('system.maintenance', 'Wartung, Export & Protokolle', 'system', '940') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('system.modules', 'Module an- und abschalten', 'system', '910') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('system.settings', 'Vereinsdaten & Erscheinungsbild', 'system', '900') ON CONFLICT DO NOTHING;
INSERT INTO public.permission_catalog (key, label, category, sort_order) VALUES ('visitor_highlights.manage', 'Besucher-Highlights verwalten', 'Inhalte', '3') ON CONFLICT DO NOTHING;
INSERT INTO public.role_catalog (key, label, is_board, is_system, sort_order, description, max_holders, is_leadership, public_listed) VALUES ('herold', 'Herold', 'false', 'false', '4', 'Beisitzer, Öffentlichkeitsarbeit und Außendarstellung', NULL, 'false', 'false') ON CONFLICT DO NOTHING;
INSERT INTO public.role_catalog (key, label, is_board, is_system, sort_order, description, max_holders, is_leadership, public_listed) VALUES ('mitglied', 'Mitglied', 'false', 'true', '5', 'Aktives oder förderndes Mitglied', NULL, 'false', 'false') ON CONFLICT DO NOTHING;
INSERT INTO public.role_catalog (key, label, is_board, is_system, sort_order, description, max_holders, is_leadership, public_listed) VALUES ('officiatus_1', '1. Officiatus', 'true', 'true', '1', 'Erster Vorsitzender, vertritt den Verein nach außen', '1', 'true', 'true') ON CONFLICT DO NOTHING;
INSERT INTO public.role_catalog (key, label, is_board, is_system, sort_order, description, max_holders, is_leadership, public_listed) VALUES ('officiatus_2', '2. Officiatus', 'true', 'true', '2', 'Zweiter Vorsitzender, Vertretung des 1. Officiatus', '1', 'true', 'true') ON CONFLICT DO NOTHING;
INSERT INTO public.role_catalog (key, label, is_board, is_system, sort_order, description, max_holders, is_leadership, public_listed) VALUES ('schatzmeister', 'Schatzmeister', 'true', 'false', '3', 'Kasse, Beiträge und Mitgliedsunterlagen', '1', 'false', 'true') ON CONFLICT DO NOTHING;
INSERT INTO public.role_catalog (key, label, is_board, is_system, sort_order, description, max_holders, is_leadership, public_listed) VALUES ('vorstand', 'vorstand', 'false', 'true', '99', NULL, NULL, 'false', 'false') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('018a26ed-2787-467a-acb5-54fb28b72137', 'officiatus_1', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.modules') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('01a2fb33-8680-411e-9c7d-e1420916bb9d', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'gallery.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('04833ebc-a9d2-458e-8206-7c131f9f0cc1', 'officiatus_1', 'true', '2026-09-08T13:23:31.564873+00:00', 'site.layout_edit') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('04b68fd5-4534-4bab-b24a-dec976811c67', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'announcements.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('056b2fcb-d436-4265-abc7-147ec3ca99ee', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'announcements.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('05ca8bf6-3f4d-473a-bf82-2438da2c4f56', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'elections.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('0717fa4b-0c19-4e73-9af4-4f1de190ec44', 'officiatus_1', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.email') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('08a424d5-46a1-4023-82a4-fd0e6a3d2c85', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'contacts.reply') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('0a6d7b33-9616-4319-84a2-b2fd26311282', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'epoch_sources.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('0b27948b-8b37-4998-9cf0-eb0c109ded19', 'herold', 'true', '2026-03-12T23:26:11.591565+00:00', 'contacts.reply') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('11dda156-da5f-4ea1-983a-73cc3e6bacd1', 'herold', 'true', '2026-03-12T23:11:01.413703+00:00', 'contacts.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('135acb74-87b5-4e83-a838-57a4a782eaa3', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'profiles.view_all') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('150b2a81-99b0-42f3-9631-8b855cd837f9', 'officiatus_2', 'true', '2026-09-08T13:23:31.564873+00:00', 'site.content_edit') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('16d88192-e40c-4b4b-b41c-b003f1fbe309', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'roles.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('1ab4741a-0cee-4f1b-9f17-f58cb1f4f3a5', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'membership_files.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('1cc57cdf-9d06-4889-bdbe-e61a4071ae99', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'gallery.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('1f4aeb19-21e1-4db4-a6bb-1fb405f6cde9', 'officiatus_1', 'true', '2026-09-07T20:57:50.406715+00:00', 'forum.categories_manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('23688ac6-4b38-4444-ac56-606448e806c1', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'epoch_sources.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('23abe7ae-3ee5-4be2-a3de-a2ac9c81cc27', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'contacts.delete') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('249ef90c-207b-4157-b896-e0ba4dc47bae', 'schatzmeister', 'true', '2026-03-12T23:11:01.413703+00:00', 'admin.access') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('28ac2b24-4d51-4f4a-ae24-322fb9a75247', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'admin.access') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('2a3ea15e-b71d-4a7a-963c-ab618364d786', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'profiles.view_all') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('2aba5926-1d9a-4731-89ca-64fe0cb38193', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'visitor_highlights.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('2c1258dc-b713-465f-819e-d1cac3e6f070', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'visitor_highlights.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('2fd7958d-5919-4681-b1bc-585c69c1bbff', 'schatzmeister', 'true', '2026-03-12T23:11:01.413703+00:00', 'membership_files.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('31bf629e-451d-4af1-852d-6a0cc653832d', 'mitglied', 'true', '2026-09-07T20:57:50.406715+00:00', 'forum.use') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('32cd51e7-1296-430e-8bed-540e767c521e', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'elections.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('342a0e3d-e7e6-4581-8cdc-124e9577631d', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'contributions.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('35716f83-9838-48a1-9885-c935d3d79b94', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'events.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('39ddc67c-77d0-4981-97f9-fe8e799788be', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'gallery.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('3a40dc47-25e9-465c-a792-0e05e3bec7cf', 'herold', 'true', '2026-03-12T23:26:30.174412+00:00', 'contacts.delete') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('40bc9d2e-63e1-4820-b3db-b5722d034f89', 'officiatus_2', 'true', '2026-09-07T20:57:50.406715+00:00', 'forum.categories_manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('41d327c8-920f-4a37-a6a9-6b2b1fb0a12f', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'roles.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('4408549c-6e14-4576-bf58-b3be48281558', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'documents.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('47a79a98-af05-4d0b-89b3-a13fe41d2f4a', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'site_images.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('4cb56227-b350-4475-8f88-c5b7137a4ba2', 'officiatus_2', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.email') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('4ef344b6-70ac-45f4-979b-c644136c0007', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'epoch_sources.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('51a220bb-ebfa-409b-aaed-f8c2fa31c97b', 'schatzmeister', 'true', '2026-03-12T23:11:01.413703+00:00', 'contributions.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('5b81dc90-2000-4f18-a5d9-89cedc3be6bf', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'contacts.delete') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('5d6b3bd5-3e19-4614-b825-1771a38170b6', 'herold', 'true', '2026-09-07T20:57:50.406715+00:00', 'forum.use') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('5e3bc8b5-1ffc-47b8-987d-9d747113bd65', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'events.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('5e427892-9e96-4f82-8c11-62a6f83286c4', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'site_images.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('5ef17a9d-0896-4c2e-8253-a03426b5ffa8', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'site_images.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('64b40b14-539f-4b7f-9ad3-ec7352b83616', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'profiles.view_all') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('65402381-8e53-4c25-98d5-7f3860225a1a', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'events.publish') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('6545c9dc-5e2c-47a0-94fd-171234b96665', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'membership_files.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('655361af-df78-4512-a05e-d9915714dfd7', 'officiatus_1', 'true', '2026-09-07T20:57:50.406715+00:00', 'forum.use') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('661caa51-9e12-452f-9cde-ec1219612620', 'herold', 'true', '2026-03-12T23:11:01.413703+00:00', 'admin.access') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('682925ba-39be-4e90-a5c6-de333c3f1770', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'audit.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('6ca43db0-b3e5-40ff-acdf-e76ef641802b', 'herold', 'true', '2026-03-12T23:11:01.413703+00:00', 'profiles.view_all') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('6d4db602-250a-4422-aae6-cdcd2f8a92d1', 'officiatus_2', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.maintenance') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('6f686a02-e42c-4aa5-be11-9bc8268df816', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'members.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('72ca72a4-1e00-41e8-80cb-6d6f57d96f11', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'membership_files.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('72ea29c1-089d-411d-a70d-4953f00b2e1b', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'contacts.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('736df539-5ce7-4138-845a-fac1eb8b6692', 'officiatus_1', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.integrations') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('75123942-9ff2-4b4e-b317-9177091cd670', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'contacts.reply') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('75ca913a-569b-4f8e-9262-ec52119d2b42', 'officiatus_2', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.integrations') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('76cd5d51-1c2d-4c46-a523-ea62b2861340', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'contributions.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('771534db-7a20-46ad-8fbc-963261b3e386', 'herold', 'true', '2026-03-12T23:57:12.286745+00:00', 'events.publish') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('7a0e481c-8684-4962-aa8b-cd02ab336912', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'documents.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('7c50510c-aaa2-4622-a613-2fc71bbacec3', 'schatzmeister', 'true', '2026-03-12T23:11:01.413703+00:00', 'contacts.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('7fbeb131-59dc-45b3-bc9c-f949948568a3', 'officiatus_1', 'true', '2026-09-08T13:23:31.564873+00:00', 'site.content_edit') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('823a08e0-8272-4290-a9c2-8f999333c762', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'contacts.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('8854179d-e6a0-4a64-96a2-07859a408879', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'members.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('88ffbaac-b1f5-47e2-9112-7bb18f9ff9b2', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'contributions.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('8cf20075-833e-40a5-883c-66acc4c5e6a6', 'officiatus_2', 'true', '2026-09-07T20:57:50.406715+00:00', 'forum.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('8fe4f437-33a6-4daa-b722-a09a0564ca86', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'roles.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('94900bd5-14fa-4421-ac0d-549c221b3f16', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'audit.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('960c641d-c1a0-4b6e-905d-4b626871d965', 'officiatus_2', 'true', '2026-09-07T20:57:50.406715+00:00', 'forum.use') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('96ae76dc-6fc6-4ec8-8705-0df79cd22e2e', 'schatzmeister', 'true', '2026-03-12T23:11:01.413703+00:00', 'profiles.view_all') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('9ce2941e-bd22-44d8-9fa0-916504ba54cd', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'documents.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('a2b5712d-dd6d-428b-a645-4b44ddde3d33', 'officiatus_2', 'true', '2026-09-07T20:26:53.420804+00:00', 'personas.publish') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('a4a91171-065f-4892-b82a-a82b730a6aba', 'herold', 'true', '2026-03-12T23:11:01.413703+00:00', 'epoch_sources.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('a7aecd7e-cb0e-4d8d-93dd-110b785aa41a', 'schatzmeister', 'true', '2026-09-07T20:57:50.406715+00:00', 'forum.use') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('b03a974a-b2fa-43b8-ac69-c965a723d897', 'herold', 'true', '2026-03-12T23:11:01.413703+00:00', 'visitor_highlights.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('b2e349c9-31fa-42c8-acbf-c96bfb66fe5f', 'officiatus_1', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.maintenance') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('b5c5f357-5299-427b-8b29-3613c199ffd0', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'contacts.reply') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('ba56ba97-b38d-40b9-a166-b3248a4a544c', 'officiatus_2', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.settings') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('bc6676a2-653f-402e-bb9d-39e57a02a5cc', 'herold', 'true', '2026-03-12T23:11:01.413703+00:00', 'gallery.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('c0038671-659d-4ac5-a783-97f98f88b2e5', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'membership_files.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('cd44fcb5-3b10-4498-87d3-2268ea3eb146', 'herold', 'true', '2026-03-12T23:11:01.413703+00:00', 'site_images.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('cdf95e24-55ef-4d40-8744-ddf3dd2a3cd6', 'vorstand', 'true', '2026-03-12T23:57:11.389998+00:00', 'events.publish') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('d3f5dc61-f16c-4bd9-a576-4e3a0333beeb', 'officiatus_1', 'true', '2026-09-07T20:26:53.420804+00:00', 'personas.publish') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('d601f6a1-1099-459f-92f8-0ef46e78a0d6', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'admin.access') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('d7b96642-d57c-4122-a8f7-8ed80b24a520', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'members.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('d8dea863-4c67-4bd7-ac66-155217452b6d', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'elections.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('dc98143e-ad41-4e9d-99b6-3576711e7e83', 'officiatus_2', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.modules') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('deb101de-fcd2-4075-8802-7dcf566fc73f', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'membership_files.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('e04d0dd2-c60e-456e-8549-13acba51791a', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'visitor_highlights.manage') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('e0b745ce-be09-4669-8a2e-12607ebb687f', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'admin.access') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('e539bcdb-a13a-4aba-b12e-2e1b7dd6262f', 'officiatus_1', 'true', '2026-09-07T18:53:59.867211+00:00', 'system.settings') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('e89d08b0-0567-411c-96b6-87a870c90ccc', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'contacts.delete') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('eb0e1613-48d8-46e5-9186-38bc05c376cb', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'contacts.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('edeec4dd-d277-4a5c-b350-37977f51d9b8', 'officiatus_1', 'true', '2026-05-31T23:54:52.1713+00:00', 'events.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('f0131a40-5772-4f31-bb52-39bba23a21ac', 'herold', 'true', '2026-09-08T13:23:31.564873+00:00', 'site.content_edit') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('f1416b5b-cf16-4148-a8d6-f49f0bd16fd6', 'officiatus_1', 'true', '2026-09-07T20:57:50.406715+00:00', 'forum.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('f1b5d960-7860-4ed8-a06b-31962e4be991', 'officiatus_2', 'true', '2026-09-08T13:23:31.564873+00:00', 'site.layout_edit') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('f5519e4a-d086-4dcf-9d61-16ec121cb122', 'vorstand', 'true', '2026-03-12T23:11:01.413703+00:00', 'membership_files.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('f7fff923-1a02-488b-9bbf-7be91091152f', 'herold', 'true', '2026-09-07T20:26:53.420804+00:00', 'personas.publish') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('fb040307-1b72-4b01-ab26-dd12d406813f', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'events.publish') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('fcc2c611-caeb-4bb4-9938-b80578b25148', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'audit.view') ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (id, role, granted, created_at, permission) VALUES ('fdf29cfc-d33f-418d-bb4c-a103204b26aa', 'officiatus_2', 'true', '2026-05-31T23:54:52.1713+00:00', 'announcements.moderate') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'announcements', 'Pinnwand', 'true', NULL, '30', 'Ankündigungen, Einladungen und Protokolle') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'applications', 'Aufnahmeanträge', 'true', NULL, '120', 'Online-Aufnahmeantrag mit PDF und Prüfung') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'besucher_highlights', 'Besucher-Highlights', 'true', NULL, '130', 'Die Blöcke „Das erwartet euch" auf den öffentlichen Themenseiten.') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'contact', 'Kontaktformular', 'true', NULL, '110', 'Kontaktanfragen über die öffentliche Website') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'contributions', 'Beiträge', 'true', NULL, '60', 'Mitgliedsbeiträge und Zahlungsstatus') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'documents', 'Dokumente', 'true', NULL, '50', 'Satzung, Ordnungen und Berichte zum Download') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'einbindung', 'Einbindung in fremde Seiten', 'true', NULL, '140', 'Terminliste, die andere Websites einbetten können.') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'elections', 'Abstimmungen', 'true', NULL, '40', 'Wahlen und Beschlüsse der Mitgliederversammlung') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'event_forms', 'Anmeldeformulare', 'true', 'events', '20', 'Formulare und Auswertungen zu Veranstaltungen') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'events', 'Veranstaltungen', 'true', NULL, '10', 'Terminkalender, Zu- und Absagen, Kalender-Abo') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'forum', 'Forum', 'true', NULL, '5', 'Diskussionen, Absprachen und Umfragen zu Veranstaltungen') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'gallery', 'Galerie', 'true', NULL, '100', 'Bildergalerien für die öffentliche Website') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'member_map', 'Mitgliederkarte', 'true', NULL, '90', 'Wohnorte der Mitglieder auf einer Karte') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'personas', 'Steckbriefe', 'true', NULL, '80', 'Darstellungen und Kenntnisse der Mitglieder') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('grundfunktion', 'sources', 'Quellensammlung', 'true', NULL, '70', 'Gemeinsame Recherche-Bibliothek') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('zusatz', 'fahrgemeinschaften', 'Fahrgemeinschaften', 'true', 'event_forms', '240', 'Wer fährt, wer hat eine Anhängerkupplung, wie viele Plätze sind frei.') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('zusatz', 'helfer', 'Helferaufgaben', 'true', 'event_forms', '230', 'Auf- und Abbau mit Zeitfenstern und Mindestbesetzung.') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('zusatz', 'lagerlogistik', 'Lagerlogistik', 'true', 'event_forms', '210', 'Zelte der Mitglieder, Flächenberechnung, Zeltplan und Lageplan in der Auswertung.') ON CONFLICT DO NOTHING;
INSERT INTO public.app_modules (art, key, label, enabled, requires, sort_order, description) VALUES ('zusatz', 'verpflegung', 'Verpflegung', 'true', 'event_forms', '220', 'Allergien und Ernährungsweise in Anmeldung und Auswertung, vorbelegt aus dem Profil.') ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('278e451f-e0e8-4b60-8f9a-e19a56e8f906', 'text', 'E-Mail', '[]', 'true', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '50', 'email', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('2df59e3f-3636-4f1c-8b76-d2e41a82c3d9', 'text', 'Nachname', '[]', 'true', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '40', 'last_name', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('4a4cb35b-d514-4f15-a089-963bbf139f76', 'text', 'Vorname', '[]', 'true', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '30', 'first_name', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('624c3885-f5f9-4e62-b46c-58ee711484fe', 'section', 'Persönliche Angaben', '[]', 'false', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '10', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('62f3233d-cad5-487b-855e-582369261893', 'text', 'Telefon / Handy', '[]', 'false', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '60', 'phone', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('bb515f91-a5c7-4462-b0aa-091e1c547d0c', 'select', 'Anrede', '["Herr", "Frau"]', 'false', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '20', 'salutation', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('d577b7b2-1af6-4379-89d2-909ebd1183b7', 'text', 'Wohnort', '[]', 'true', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '100', 'city', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('e9154643-463e-4a8a-b969-c76c3a61b698', 'text', 'PLZ', '[]', 'true', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '90', 'zip', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('fa5175fc-56b8-413f-9c4c-de557095a0ad', 'text', 'Straße und Hausnummer', '[]', 'true', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '80', 'street', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.application_fields (id, type, label, options, required, settings, is_active, created_at, sort_order, column_name, description) VALUES ('fb69a4ff-b3b3-4e7c-8892-7d98265013b9', 'date', 'Geburtsdatum', '[]', 'true', '{}', 'true', '2026-09-09T08:00:32.56459+00:00', '70', 'birthdate', 'Die Mitgliedschaft ist ab 16 Jahren möglich. Bei unter 18-Jährigen muss der Antrag von einem Erziehungsberechtigten mitunterschrieben werden – wir kommen in diesem Fall per E-Mail auf dich zu.') ON CONFLICT DO NOTHING;
INSERT INTO public.contribution_categories (key, label, hinweis, is_active, created_at, sort_order, geloescht_ab) VALUES ('aktiv', 'Aktives Mitglied', NULL, 'true', '2026-09-09T07:43:45.999028+00:00', '10', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.mail_templates (key, knopf, label, inhalt, betreff, hinweis, fussnote, standard, kennzeile, sort_order, updated_at, updated_by, platzhalter, ueberschrift) VALUES ('einladung', 'Konto aktivieren', 'Einladung in den Mitgliederbereich', '<p>Du wurdest als <strong>{{rolle}}</strong> zum internen Bereich von {{verein}} eingeladen.</p><p>Klicke auf den folgenden Button, um dein Konto zu aktivieren und ein Passwort zu setzen:</p>', 'Einladung – {{verein}}', 'Geht an ein neues Mitglied, sobald es angelegt wird, und enthält den Link zum Aktivieren des Kontos.', '', '{"knopf": "Konto aktivieren", "inhalt": "<p>Du wurdest als <strong>{{rolle}}</strong> zum internen Bereich von {{verein}} eingeladen.</p><p>Klicke auf den folgenden Button, um dein Konto zu aktivieren und ein Passwort zu setzen:</p>", "betreff": "Einladung – {{verein}}", "fussnote": "", "kennzeile": "Einladung", "ueberschrift": "Willkommen im Mitgliederbereich"}', 'Einladung', '10', '2026-09-09T07:43:12.668857+00:00', NULL, '["verein", "rolle"]', 'Willkommen im Mitgliederbereich') ON CONFLICT DO NOTHING;
INSERT INTO public.mail_templates (key, knopf, label, inhalt, betreff, hinweis, fussnote, standard, kennzeile, sort_order, updated_at, updated_by, platzhalter, ueberschrift) VALUES ('kontakt_antwort', '', 'Antwort auf eine Kontaktanfrage', '<p>Guten Tag{{anrede}},</p>{{block}}', 'Ihre Anfrage – {{verein}}', 'Der Rahmen um eine Antwort, die im Verwaltungsbereich geschrieben wird. {{anrede}} ist der Name mit einem Leerzeichen davor – und leer, wenn keiner bekannt ist. {{block}} ist die geschriebene Antwort.', '', '{"knopf": "", "inhalt": "<p>Guten Tag{{anrede}},</p>{{block}}", "betreff": "Ihre Anfrage – {{verein}}", "fussnote": "", "kennzeile": "", "ueberschrift": ""}', '', '70', '2026-09-09T07:43:12.668857+00:00', NULL, '["verein", "anrede", "block"]', '') ON CONFLICT DO NOTHING;
INSERT INTO public.mail_templates (key, knopf, label, inhalt, betreff, hinweis, fussnote, standard, kennzeile, sort_order, updated_at, updated_by, platzhalter, ueberschrift) VALUES ('kontakt_eingang', '', 'Neue Kontaktanfrage (an den Verein)', '{{block}}', 'Neue Kontaktanfrage von {{name}}', 'Meldung an die Vereinsadresse, wenn jemand das Kontaktformular ausfüllt. {{block}} enthält Absenderadresse und Nachricht.', '', '{"knopf": "", "inhalt": "{{block}}", "betreff": "Neue Kontaktanfrage von {{name}}", "fussnote": "", "kennzeile": "Neue Kontaktanfrage", "ueberschrift": "{{name}}"}', 'Neue Kontaktanfrage', '60', '2026-09-09T07:43:12.668857+00:00', NULL, '["name", "block"]', '{{name}}') ON CONFLICT DO NOTHING;
INSERT INTO public.mail_templates (key, knopf, label, inhalt, betreff, hinweis, fussnote, standard, kennzeile, sort_order, updated_at, updated_by, platzhalter, ueberschrift) VALUES ('passwort_vergessen', 'Neues Passwort setzen', 'Passwort vergessen', '<p>Du hast angefordert, dein Passwort für den Mitgliederbereich von {{verein}} zurückzusetzen.</p><p>Klicke auf den folgenden Button, um ein neues Passwort zu setzen:</p>', 'Passwort zurücksetzen – {{verein}}', 'Wird verschickt, wenn jemand auf der Anmeldeseite ein neues Passwort anfordert.', 'Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.', '{"knopf": "Neues Passwort setzen", "inhalt": "<p>Du hast angefordert, dein Passwort für den Mitgliederbereich von {{verein}} zurückzusetzen.</p><p>Klicke auf den folgenden Button, um ein neues Passwort zu setzen:</p>", "betreff": "Passwort zurücksetzen – {{verein}}", "fussnote": "Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.", "kennzeile": "Sicherheit", "ueberschrift": "Passwort zurücksetzen"}', 'Sicherheit', '30', '2026-09-09T07:43:12.668857+00:00', NULL, '["verein"]', 'Passwort zurücksetzen') ON CONFLICT DO NOTHING;
INSERT INTO public.mail_templates (key, knopf, label, inhalt, betreff, hinweis, fussnote, standard, kennzeile, sort_order, updated_at, updated_by, platzhalter, ueberschrift) VALUES ('passwort_zurueckgesetzt', 'Neues Passwort setzen', 'Passwort durch die Verwaltung zurückgesetzt', '<p>Dein Passwort für den Mitgliederbereich von {{verein}} wurde zurückgesetzt.</p><p>Klicke auf den folgenden Button, um ein neues Passwort zu setzen:</p>', 'Passwort zurücksetzen – {{verein}}', 'Wird verschickt, wenn ein Verwalter das Passwort eines Mitglieds zurücksetzt.', '', '{"knopf": "Neues Passwort setzen", "inhalt": "<p>Dein Passwort für den Mitgliederbereich von {{verein}} wurde zurückgesetzt.</p><p>Klicke auf den folgenden Button, um ein neues Passwort zu setzen:</p>", "betreff": "Passwort zurücksetzen – {{verein}}", "fussnote": "", "kennzeile": "Sicherheit", "ueberschrift": "Passwort zurücksetzen"}', 'Sicherheit', '40', '2026-09-09T07:43:12.668857+00:00', NULL, '["verein"]', 'Passwort zurücksetzen') ON CONFLICT DO NOTHING;
INSERT INTO public.mail_templates (key, knopf, label, inhalt, betreff, hinweis, fussnote, standard, kennzeile, sort_order, updated_at, updated_by, platzhalter, ueberschrift) VALUES ('probeversand', '', 'Probeversand', '<p>Diese Nachricht wurde über <strong>{{versandweg}}</strong> verschickt. Damit funktionieren Einladungen, das Zurücksetzen von Passwörtern, Kontaktanfragen und die Abendzusammenfassung.</p>', 'Probeversand', 'Die Testmail aus den Einstellungen unter „Erscheinungsbild".', 'Angefordert am {{zeitpunkt}}.', '{"knopf": "", "inhalt": "<p>Diese Nachricht wurde über <strong>{{versandweg}}</strong> verschickt. Damit funktionieren Einladungen, das Zurücksetzen von Passwörtern, Kontaktanfragen und die Abendzusammenfassung.</p>", "betreff": "Probeversand", "fussnote": "Angefordert am {{zeitpunkt}}.", "kennzeile": "Einstellungen", "ueberschrift": "Der Probeversand hat geklappt"}', 'Einstellungen', '90', '2026-09-09T07:43:12.668857+00:00', NULL, '["versandweg", "zeitpunkt"]', 'Der Probeversand hat geklappt') ON CONFLICT DO NOTHING;
INSERT INTO public.mail_templates (key, knopf, label, inhalt, betreff, hinweis, fussnote, standard, kennzeile, sort_order, updated_at, updated_by, platzhalter, ueberschrift) VALUES ('veranstaltung_anmeldung', '', 'Anmeldung zu einer Veranstaltung', '<p>Hallo {{name}},</p><p>deine Anmeldung für <strong>{{veranstaltung}}</strong> ist bei uns eingegangen. Vielen Dank!</p>{{block}}', 'Anmeldung bestätigt: {{veranstaltung}}', 'Bestätigung an Gäste, die sich über ein Veranstaltungsformular angemeldet haben. {{block}} enthält Datum, Ort und – falls vorhanden – den Link zum Ändern der Anmeldung.', 'Bei Fragen kannst du dich jederzeit an {{vereinsmail}} wenden.', '{"knopf": "", "inhalt": "<p>Hallo {{name}},</p><p>deine Anmeldung für <strong>{{veranstaltung}}</strong> ist bei uns eingegangen. Vielen Dank!</p>{{block}}", "betreff": "Anmeldung bestätigt: {{veranstaltung}}", "fussnote": "Bei Fragen kannst du dich jederzeit an {{vereinsmail}} wenden.", "kennzeile": "Anmeldebestätigung", "ueberschrift": "{{veranstaltung}}"}', 'Anmeldebestätigung', '50', '2026-09-09T07:43:12.668857+00:00', NULL, '["name", "veranstaltung", "vereinsmail", "block"]', '{{veranstaltung}}') ON CONFLICT DO NOTHING;
INSERT INTO public.mail_templates (key, knopf, label, inhalt, betreff, hinweis, fussnote, standard, kennzeile, sort_order, updated_at, updated_by, platzhalter, ueberschrift) VALUES ('willkommen', '', 'Willkommen im Verein', '<p>Hallo {{vorname}},</p><p>wir freuen uns sehr, dich als neues Mitglied in unserem Verein <strong>{{verein}}</strong> willkommen zu heißen!</p><p>Mit deiner Anmeldung bist du nun Teil unserer lebendigen Gemeinschaft, die sich mit viel Herzblut der Darstellung und Vermittlung historischer Lebenswelten widmet. Wir sind gespannt auf deine Ideen, dein Engagement und die gemeinsamen Erlebnisse, die vor uns liegen.</p><p>Alle wichtigen Infos rund um den Verein, Termine und Mitmachmöglichkeiten findest du auf unserer Website <a href="{{webseite}}">{{webseiteName}}</a> und in unserer WhatsApp-Gruppe, der wir dich in Kürze hinzufügen.</p><p>Wenn du Fragen hast oder etwas unklar ist, melde dich jederzeit gern bei uns. Schön, dass du dabei bist – auf eine spannende Zeit mit dir!</p>', 'Herzlich willkommen bei {{verein}}!', 'Die Aufnahmebestätigung an das neue Mitglied, in Kopie an die Vereinsadresse. Darunter steht der Name des ersten Vorstandsmitglieds, das im System hinterlegt ist.', '', E'{"knopf": "", "inhalt": "<p>Hallo {{vorname}},</p><p>wir freuen uns sehr, dich als neues Mitglied in unserem Verein <strong>{{verein}}</strong> willkommen zu heißen!</p><p>Mit deiner Anmeldung bist du nun Teil unserer lebendigen Gemeinschaft, die sich mit viel Herzblut der Darstellung und Vermittlung historischer Lebenswelten widmet. Wir sind gespannt auf deine Ideen, dein Engagement und die gemeinsamen Erlebnisse, die vor uns liegen.</p><p>Alle wichtigen Infos rund um den Verein, Termine und Mitmachmöglichkeiten findest du auf unserer Website <a href=\\"{{webseite}}\\">{{webseiteName}}</a> und in unserer WhatsApp-Gruppe, der wir dich in Kürze hinzufügen.</p><p>Wenn du Fragen hast oder etwas unklar ist, melde dich jederzeit gern bei uns. Schön, dass du dabei bist – auf eine spannende Zeit mit dir!</p>", "betreff": "Herzlich willkommen bei {{verein}}!", "fussnote": "", "kennzeile": "Aufnahmebestätigung", "ueberschrift": "Herzlich willkommen!"}', 'Aufnahmebestätigung', '20', '2026-09-09T07:43:12.668857+00:00', NULL, '["verein", "vorname", "webseite", "webseiteName"]', 'Herzlich willkommen!') ON CONFLICT DO NOTHING;
INSERT INTO public.mail_templates (key, knopf, label, inhalt, betreff, hinweis, fussnote, standard, kennzeile, sort_order, updated_at, updated_by, platzhalter, ueberschrift) VALUES ('zusammenfassung', 'Im Forum ansehen', 'Tägliche Zusammenfassung', '<p>Hallo {{name}}, seit deinem letzten Besuch gibt es {{neuigkeiten}}:</p>{{block}}', '{{neuigkeitenGross}} für dich', 'Die Abendmail mit allem, was seit dem letzten Besuch neu ist. {{neuigkeiten}} lautet „eine Neuigkeit" oder „3 Neuigkeiten"; {{neuigkeitenGross}} ist dasselbe für den Satzanfang.', 'Diese Zusammenfassung lässt sich in deinem Profil abstellen.', '{"knopf": "Im Forum ansehen", "inhalt": "<p>Hallo {{name}}, seit deinem letzten Besuch gibt es {{neuigkeiten}}:</p>{{block}}", "betreff": "{{neuigkeitenGross}} für dich", "fussnote": "Diese Zusammenfassung lässt sich in deinem Profil abstellen.", "kennzeile": "Neu für dich", "ueberschrift": ""}', 'Neu für dich', '80', '2026-09-09T07:43:12.668857+00:00', NULL, '["name", "neuigkeiten", "neuigkeitenGross", "anzahl", "block"]', '') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('beitragsintervall', 'Wie oft du zahlen möchtest. Der Jahresbetrag bleibt derselbe, er wird nur auf mehr Termine verteilt. Wenn du unsicher bist: jährlich.', 'Beitragseinzug', '{"text": "Wie oft du zahlen möchtest. Der Jahresbetrag bleibt derselbe, er wird nur auf mehr Termine verteilt. Wenn du unsicher bist: jährlich.", "titel": "Beitragseinzug"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('darstellung', 'Was du zeigst, wenn der Verein auftritt: Zeit, Rolle und was du dazu kannst. Der Vorstand gibt frei, was davon öffentlich wird; dein Name steht dort nie.', 'Darstellungssteckbrief', '{"text": "Was du zeigst, wenn der Verein auftritt: Zeit, Rolle und was du dazu kannst. Der Vorstand gibt frei, was davon öffentlich wird; dein Name steht dort nie.", "titel": "Darstellungssteckbrief"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('einladung_rolle', 'Die Rolle bestimmt, was jemand darf. Im Zweifel „Mitglied“ – ändern kannst du sie jederzeit, und zu wenige Rechte fallen schneller auf als zu viele.', 'Welche Rolle?', '{"text": "Die Rolle bestimmt, was jemand darf. Im Zweifel „Mitglied“ – ändern kannst du sie jederzeit, und zu wenige Rechte fallen schneller auf als zu viele.", "titel": "Welche Rolle?"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('ernaehrung', 'Wird bei Anmeldungen automatisch vorgeschlagen, damit die Küche planen kann. Allergien bitte dazuschreiben, auch wenn sie selten auftreten.', 'Ernährung', '{"text": "Wird bei Anmeldungen automatisch vorgeschlagen, damit die Küche planen kann. Allergien bitte dazuschreiben, auch wenn sie selten auftreten.", "titel": "Ernährung"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('forum_rechte', 'Lesen, schreiben und moderieren werden getrennt vergeben. So kann eine Rubrik für alle sichtbar sein, in der aber nur der Vorstand schreibt – etwa für Beschlüsse.', 'Rechte je Rubrik', '{"text": "Lesen, schreiben und moderieren werden getrennt vergeben. So kann eine Rubrik für alle sichtbar sein, in der aber nur der Vorstand schreibt – etwa für Beschlüsse.", "titel": "Rechte je Rubrik"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('karte_sichtbar', 'Nur andere Mitglieder sehen die Karte, nie die Öffentlichkeit. Angezeigt wird dein Ort, nicht deine Anschrift. Du kannst das jederzeit wieder abschalten.', 'Auf der Karte erscheinen', '{"text": "Nur andere Mitglieder sehen die Karte, nie die Öffentlichkeit. Angezeigt wird dein Ort, nicht deine Anschrift. Du kannst das jederzeit wieder abschalten.", "titel": "Auf der Karte erscheinen"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('mitgliedsart', 'Bestimmt, welcher Beitragssatz für dich gilt. Ändern kann sie nur der Vorstand, weil daran die Beiträge hängen.', 'Art der Mitgliedschaft', '{"text": "Bestimmt, welcher Beitragssatz für dich gilt. Ändern kann sie nur der Vorstand, weil daran die Beiträge hängen.", "titel": "Art der Mitgliedschaft"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('rolle_leitung', 'Diese Rolle bekommt die Rechte, die in den Zugriffsregeln an der Leitung hängen: Abstimmungen führen, Protokolle einsehen, Beiträge anderer sehen. Sparsam vergeben – das ist der weitreichendste Schalter auf dieser Seite.', 'Vereinsleitung', '{"text": "Diese Rolle bekommt die Rechte, die in den Zugriffsregeln an der Leitung hängen: Abstimmungen führen, Protokolle einsehen, Beiträge anderer sehen. Sparsam vergeben – das ist der weitreichendste Schalter auf dieser Seite.", "titel": "Vereinsleitung"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('rolle_oeffentlich', 'Die Rolle wird nach aussen ausgewiesen, etwa im Impressum oder auf dem Aufnahmeantrag. Namen erscheinen dort nur, wenn die Person selbst zugestimmt hat.', 'Öffentlich nennen', '{"text": "Die Rolle wird nach aussen ausgewiesen, etwa im Impressum oder auf dem Aufnahmeantrag. Namen erscheinen dort nur, wenn die Person selbst zugestimmt hat.", "titel": "Öffentlich nennen"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('rolle_standard', 'Diese Rolle bekommt, wer neu eingeladen wird oder dessen Aufnahmeantrag angenommen wird. Es kann immer nur eine sein; ein Klick hier verschiebt sie. Solange eine Rolle die Standardrolle ist, lässt sie sich nicht löschen.', 'Standard für Neue', '{"text": "Diese Rolle bekommt, wer neu eingeladen wird oder dessen Aufnahmeantrag angenommen wird. Es kann immer nur eine sein; ein Klick hier verschiebt sie. Solange eine Rolle die Standardrolle ist, lässt sie sich nicht löschen.", "titel": "Standard für Neue"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('rolle_vorstand', 'Gehört die Rolle dem Vorstand im Sinne der Satzung an? Das ist eine Angabe über den Verein, keine Berechtigung: Sie erscheint im Impressum und auf dem Aufnahmeantrag. Wer welche Rechte hat, steht daneben unter „Vereinsleitung“.', 'Vorstand', '{"text": "Gehört die Rolle dem Vorstand im Sinne der Satzung an? Das ist eine Angabe über den Verein, keine Berechtigung: Sie erscheint im Impressum und auf dem Aufnahmeantrag. Wer welche Rechte hat, steht daneben unter „Vereinsleitung“.", "titel": "Vorstand"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('seite_versteckt', 'Die Seite bleibt öffentlich erreichbar, taucht aber nicht in Google auf. Sinnvoll für Seiten, die nur über einen Link gefunden werden sollen. Für Impressum und Datenschutzerklärung nicht setzen: Die müssen auffindbar sein.', 'Nicht in Suchmaschinen aufnehmen', '{"text": "Die Seite bleibt öffentlich erreichbar, taucht aber nicht in Google auf. Sinnvoll für Seiten, die nur über einen Link gefunden werden sollen. Für Impressum und Datenschutzerklärung nicht setzen: Die müssen auffindbar sein.", "titel": "Nicht in Suchmaschinen aufnehmen"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('stimmenanzahl', 'Wie viele der Vorschläge jemand ankreuzen darf. Bei einer Wahl mit drei zu besetzenden Plätzen sind das drei. Weniger ankreuzen ist immer erlaubt.', 'Wie viele Stimmen?', '{"text": "Wie viele der Vorschläge jemand ankreuzen darf. Bei einer Wahl mit drei zu besetzenden Plätzen sind das drei. Weniger ankreuzen ist immer erlaubt.", "titel": "Wie viele Stimmen?"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('termin_oeffentlich', 'Der Termin erscheint zusätzlich auf der Website, für Gäste ohne Anmeldung. Angezeigt werden Titel, Zeit und Ort; wer zugesagt hat, bleibt intern.', 'Öffentlich zeigen', '{"text": "Der Termin erscheint zusätzlich auf der Website, für Gäste ohne Anmeldung. Angezeigt werden Titel, Zeit und Ort; wer zugesagt hat, bleibt intern.", "titel": "Öffentlich zeigen"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_hilfe (key, text, titel, standard) VALUES ('zeltmasse', 'Aus den Massen entsteht der Lagerplan: Wer wie viel Platz braucht und was nebeneinander passt. Miss die Grundfläche inklusive der Abspannung, nicht nur das Tuch.', 'Wozu die Masse?', '{"text": "Aus den Massen entsteht der Lagerplan: Wer wie viel Platz braucht und was nebeneinander passt. Miss die Grundfläche inklusive der Abspannung, nicht nur das Tuch.", "titel": "Wozu die Masse?"}') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('abstimmungen', 'Vote', 'Wahlen und Beschlüsse laufen hier, auch für die, die nicht vor Ort sein können. Du bekommst eine Nachricht, sobald eine Abstimmung offen ist.', NULL, 'start', 'kachel-elections', 'elections', NULL, '/intern', 'Abstimmungen', NULL, '{"text": "Wahlen und Beschlüsse laufen hier, auch für die, die nicht vor Ort sein können. Du bekommst eine Nachricht, sobald eine Abstimmung offen ist.", "tipp": null, "titel": "Abstimmungen"}', 'true', '80') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('aufgabe_profil', 'User', 'Vorname, Nachname und Ort. Alles Weitere ist freiwillig, aber diese drei braucht der Verein.', NULL, 'profil', 'profil-daten', NULL, NULL, '/intern/profil', 'Namen und Wohnort eintragen', 'profil', '{"text": "Vorname, Nachname und Ort. Alles Weitere ist freiwillig, aber diese drei braucht der Verein.", "tipp": null, "titel": "Namen und Wohnort eintragen"}', 'true', '10') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('aufgabe_steckbrief', 'ScrollText', 'Was du darstellst und was du kannst. Daraus entsteht die öffentliche Übersicht, mit der Museen und Veranstalter sehen, was der Verein zeigen kann. Dein Name steht dort nicht.', NULL, 'profil', 'profil-darstellung', 'personas', NULL, '/intern/profil', 'Darstellung beschreiben', 'steckbrief', '{"text": "Was du darstellst und was du kannst. Daraus entsteht die öffentliche Übersicht, mit der Museen und Veranstalter sehen, was der Verein zeigen kann. Dein Name steht dort nicht.", "tipp": null, "titel": "Darstellung beschreiben"}', 'true', '30') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('aufgabe_zelte', 'Tent', 'Was du mitbringst und wie gross es ist. Daraus entsteht die Lagerplanung, und du musst die Masse nicht bei jeder Anmeldung heraussuchen.', NULL, 'profil', 'profil-zelte', 'lagerlogistik', NULL, '/intern/profil', 'Zelte eintragen', 'zelte', '{"text": "Was du mitbringst und wie gross es ist. Daraus entsteht die Lagerplanung, und du musst die Masse nicht bei jeder Anmeldung heraussuchen.", "tipp": null, "titel": "Zelte eintragen"}', 'true', '20') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('aufgabe_zusage', 'CalendarDays', 'Der einfachste Weg anzukommen: einen Termin heraussuchen und zusagen. Gibt es ein Anmeldeformular, sind deine Profilangaben darin schon eingetragen.', NULL, 'profil', NULL, 'events', NULL, '/intern/veranstaltungen', 'Bei einer Veranstaltung zusagen', 'zusage', '{"text": "Der einfachste Weg anzukommen: einen Termin heraussuchen und zusagen. Gibt es ein Anmeldeformular, sind deine Profilangaben darin schon eingetragen.", "tipp": null, "titel": "Bei einer Veranstaltung zusagen"}', 'true', '40') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('beitraege', 'Coins', 'Ob dein Beitrag für dieses Jahr verbucht ist und wohin überwiesen wird. Mehr musst du hier nicht tun.', NULL, 'start', 'knopf-beitraege', 'contributions', NULL, '/intern', 'Beiträge', NULL, '{"text": "Ob dein Beitrag für dieses Jahr verbucht ist und wohin überwiesen wird. Mehr musst du hier nicht tun.", "tipp": null, "titel": "Beiträge"}', 'true', '40') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('dokumente', 'FileText', 'Satzung, Ordnungen und Berichte zum Nachlesen und Herunterladen.', NULL, 'start', 'kachel-documents', 'documents', NULL, '/intern', 'Dokumente', NULL, '{"text": "Satzung, Ordnungen und Berichte zum Nachlesen und Herunterladen.", "tipp": null, "titel": "Dokumente"}', 'true', '90') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('forum', 'MessagesSquare', 'Für Absprachen, die im Messenger untergehen würden. Ein Thema je Sache, und man findet es in einem halben Jahr wieder.', NULL, 'start', 'kachel-forum', 'forum', NULL, '/intern', 'Forum', NULL, '{"text": "Für Absprachen, die im Messenger untergehen würden. Ein Thema je Sache, und man findet es in einem halben Jahr wieder.", "tipp": null, "titel": "Forum"}', 'true', '60') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('karte', 'MapPin', 'Wer wo wohnt – praktisch für Fahrgemeinschaften. Du erscheinst dort nur, wenn du es in deinem Profil erlaubst.', NULL, 'start', 'kachel-member_map', 'member_map', NULL, '/intern', 'Mitgliederkarte', NULL, '{"text": "Wer wo wohnt – praktisch für Fahrgemeinschaften. Du erscheinst dort nur, wenn du es in deinem Profil erlaubst.", "tipp": null, "titel": "Mitgliederkarte"}', 'true', '110') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('los', 'ClipboardList', 'Das war der Überblick. Hier im Profil steht, was noch offen ist – das hakt sich von selbst ab, sobald du es erledigt hast. Nimm dir die Punkte, wann es dir passt.', NULL, 'start', 'profil-checkliste', NULL, NULL, '/intern/profil', 'Und jetzt du', NULL, '{"text": "Das war der Überblick. Hier im Profil steht, was noch offen ist – das hakt sich von selbst ab, sobald du es erledigt hast. Nimm dir die Punkte, wann es dir passt.", "tipp": null, "titel": "Und jetzt du"}', 'true', '120') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('profil', 'User', 'Deine Daten, deine Benachrichtigungen und alles, was du bei Anmeldungen nicht jedes Mal neu eintippen willst. Da fangen wir gleich an.', NULL, 'start', 'knopf-profil', NULL, NULL, '/intern', 'Dein Profil', NULL, '{"text": "Deine Daten, deine Benachrichtigungen und alles, was du bei Anmeldungen nicht jedes Mal neu eintippen willst. Da fangen wir gleich an.", "tipp": null, "titel": "Dein Profil"}', 'true', '20') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('quellen', 'BookOpen', 'Die gemeinsame Bibliothek: Funde, Abbildungen und Literatur, nach Kategorie sortiert. Eigenes darfst du ergänzen.', NULL, 'start', 'kachel-sources', 'sources', NULL, '/intern', 'Quellensammlung', NULL, '{"text": "Die gemeinsame Bibliothek: Funde, Abbildungen und Literatur, nach Kategorie sortiert. Eigenes darfst du ergänzen.", "tipp": null, "titel": "Quellensammlung"}', 'true', '100') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('veranstaltungen', 'CalendarDays', 'Alle Vereinstermine. Du sagst zu oder ab, siehst wer sonst kommt, und kannst den Kalender abonnieren, damit die Termine auf deinem Handy stehen.', NULL, 'start', 'kachel-events', 'events', NULL, '/intern', 'Veranstaltungen', NULL, '{"text": "Alle Vereinstermine. Du sagst zu oder ab, siehst wer sonst kommt, und kannst den Kalender abonnieren, damit die Termine auf deinem Handy stehen.", "tipp": null, "titel": "Veranstaltungen"}', 'true', '50') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('versammlungen', 'Megaphone', 'Ankündigungen, Einladungen zur Mitgliederversammlung und die Protokolle danach. Antworten kannst du dort auch.', NULL, 'start', 'kachel-announcements', 'announcements', NULL, '/intern', 'Versammlungen', NULL, '{"text": "Ankündigungen, Einladungen zur Mitgliederversammlung und die Protokolle danach. Antworten kannst du dort auch.", "tipp": null, "titel": "Versammlungen"}', 'true', '70') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('verwaltung', 'Settings', 'Du hast mehr Rechte als die meisten. Was du damit tun kannst, liegt hier – nach Bereichen sortiert, und du siehst nur, was dich betrifft.', 'Für die Verwaltung selbst gibt es eine eigene Einführung, wenn du das erste Mal dort bist.', 'start', 'knopf-verwaltung', NULL, 'admin.access', '/intern', 'Die Verwaltung', NULL, '{"text": "Du hast mehr Rechte als die meisten. Was du damit tun kannst, liegt hier – nach Bereichen sortiert, und du siehst nur, was dich betrifft.", "tipp": "Für die Verwaltung selbst gibt es eine eigene Einführung, wenn du das erste Mal dort bist.", "titel": "Die Verwaltung"}', 'true', '30') ON CONFLICT DO NOTHING;
INSERT INTO public.onboarding_schritte (key, icon, text, tipp, tour, anker, modul, recht, route, titel, aufgabe, standard, is_active, sort_order) VALUES ('willkommen', 'Sparkles', 'Der Mitgliederbereich hat einige Ecken. Ich zeige sie dir in zwei Minuten einmal der Reihe nach, damit du weisst, was wo liegt. Danach fangen wir mit deinem Profil an.', 'Abbrechen kannst du jederzeit. Über dein Profil findest du diese Einführung wieder.', 'start', NULL, NULL, NULL, '/intern', 'Schön, dass du da bist', NULL, '{"text": "Der Mitgliederbereich hat einige Ecken. Ich zeige sie dir in zwei Minuten einmal der Reihe nach, damit du weisst, was wo liegt. Danach fangen wir mit deinem Profil an.", "tipp": "Abbrechen kannst du jederzeit. Über dein Profil findest du diese Einführung wieder.", "titel": "Schön, dass du da bist"}', 'true', '10') ON CONFLICT DO NOTHING;
INSERT INTO public.pdf_texts (key, label, titel, inhalt, hinweis, standard, sort_order, updated_at, updated_by, platzhalter) VALUES ('beitrag_fest', 'Beitragssatz – bei festem Beitrag', '', 'Derzeit beträgt der jährliche Beitragssatz {{beitrag}} EUR. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig.', 'Erscheint im Antrag unter der Erklärung, wenn als Modell „Fester Beitragssatz" eingestellt ist. {{beitrag}} ist der Satz der gewählten Mitgliedsart.', '{"titel": "", "inhalt": "Derzeit beträgt der jährliche Beitragssatz {{beitrag}} EUR. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig."}', '22', '2026-09-09T07:43:45.999028+00:00', NULL, '["beitrag"]') ON CONFLICT DO NOTHING;
INSERT INTO public.pdf_texts (key, label, titel, inhalt, hinweis, standard, sort_order, updated_at, updated_by, platzhalter) VALUES ('beitrag_keiner', 'Beitragssatz – ohne Beitrag', '', 'Ein Mitgliedsbeitrag wird nicht erhoben. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig.', 'Erscheint, wenn als Modell „Kein Beitrag" eingestellt ist.', '{"titel": "", "inhalt": "Ein Mitgliedsbeitrag wird nicht erhoben. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig."}', '24', '2026-09-09T07:43:45.999028+00:00', NULL, '[]') ON CONFLICT DO NOTHING;
INSERT INTO public.pdf_texts (key, label, titel, inhalt, hinweis, standard, sort_order, updated_at, updated_by, platzhalter) VALUES ('beitrag_umlage', 'Beitragssatz – bei Umlage', '', 'Einen festen Beitrag gibt es nicht. Ich verpflichte mich, mich anteilig an den Unkosten des laufenden Jahres zu beteiligen; die Höhe wird nach der Abrechnung mitgeteilt. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig.', 'Erscheint statt des Betrags, wenn als Modell „Anteil an den Unkosten" eingestellt ist.', '{"titel": "", "inhalt": "Einen festen Beitrag gibt es nicht. Ich verpflichte mich, mich anteilig an den Unkosten des laufenden Jahres zu beteiligen; die Höhe wird nach der Abrechnung mitgeteilt. Die Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand gültig."}', '23', '2026-09-09T07:43:45.999028+00:00', NULL, '[]') ON CONFLICT DO NOTHING;
INSERT INTO public.pdf_texts (key, label, titel, inhalt, hinweis, standard, sort_order, updated_at, updated_by, platzhalter) VALUES ('datenschutz', 'Datenschutzhinweis', 'DATENSCHUTZ', 'Der Schutz Deiner personenbezogenen Daten ist {{verein}} ein besonderes Anliegen. Wir verwenden die in diesem Aufnahmeantrag enthaltenen Angaben ausschließlich zur Erledigung aller im Zusammenhang mit der Mitgliedschaft stehenden Aufgaben im erforderlichen Umfang. Dies betrifft insbesondere die computergestützte Mitgliederbestandsverwaltung, die Mitgliederinformation sowie ggf. den Beitragseinzug. Deine Daten werden nicht an externe Dritte weitergegeben.', 'Steht im Formular unter der Erklärung und im PDF in einem eigenen Abschnitt. Sollte zur Datenschutzerklärung der Website passen.', '{"titel": "DATENSCHUTZ", "inhalt": "Der Schutz Deiner personenbezogenen Daten ist {{verein}} ein besonderes Anliegen. Wir verwenden die in diesem Aufnahmeantrag enthaltenen Angaben ausschließlich zur Erledigung aller im Zusammenhang mit der Mitgliedschaft stehenden Aufgaben im erforderlichen Umfang. Dies betrifft insbesondere die computergestützte Mitgliederbestandsverwaltung, die Mitgliederinformation sowie ggf. den Beitragseinzug. Deine Daten werden nicht an externe Dritte weitergegeben."}', '30', '2026-09-09T07:43:12.668857+00:00', NULL, '["verein"]') ON CONFLICT DO NOTHING;
INSERT INTO public.pdf_texts (key, label, titel, inhalt, hinweis, standard, sort_order, updated_at, updated_by, platzhalter) VALUES ('erklaerung', 'Erklärung', 'ERKLÄRUNG', 'Ja, ich will Mitglied bei {{verein}} werden und beantrage hiermit meine Aufnahme!
Mit dem Antrag auf Mitgliedschaft erkenne ich die Satzung des Vereins {{verein}} an. Mir ist bekannt, dass die Mitgliedschaft beitragspflichtig sein kann.', 'Steht im Formular über den Ankreuzfeldern und im PDF im eingerahmten Kasten. Der Satz zum Beitrag kommt aus einer eigenen Vorlage, weil er vom Beitragsmodell abhängt.', E'{"titel": "ERKLÄRUNG", "inhalt": "Ja, ich will Mitglied bei {{verein}} werden und beantrage hiermit meine Aufnahme!\\nMit dem Antrag auf Mitgliedschaft erkenne ich die Satzung des Vereins {{verein}} an. Mir ist bekannt, dass die Mitgliedschaft beitragspflichtig sein kann."}', '20', '2026-09-09T07:48:37.814749+00:00', NULL, '["verein"]') ON CONFLICT DO NOTHING;
INSERT INTO public.pdf_texts (key, label, titel, inhalt, hinweis, standard, sort_order, updated_at, updated_by, platzhalter) VALUES ('fussnote', 'Kasten unten rechts im PDF', '', 'Digitale Antragstellung via {{webseite}}
Eintrittsdatum = Datum dieses digitalen Antrags', 'Zwei Zeilen neben dem Eingangsdatum. Erscheint nicht im Formular.', E'{"titel": "", "inhalt": "Digitale Antragstellung via {{webseite}}\\nEintrittsdatum = Datum dieses digitalen Antrags"}', '50', '2026-09-09T07:43:12.668857+00:00', NULL, '["webseite"]') ON CONFLICT DO NOTHING;
INSERT INTO public.pdf_texts (key, label, titel, inhalt, hinweis, standard, sort_order, updated_at, updated_by, platzhalter) VALUES ('titel', 'Überschrift des Antrags', '', 'Antrag auf Mitgliedschaft', 'Steht oben auf dem gedruckten Antrag.', '{"titel": "", "inhalt": "Antrag auf Mitgliedschaft"}', '10', '2026-09-09T07:43:12.668857+00:00', NULL, '[]') ON CONFLICT DO NOTHING;
INSERT INTO public.pdf_texts (key, label, titel, inhalt, hinweis, standard, sort_order, updated_at, updated_by, platzhalter) VALUES ('zustimmungen', 'Die beiden Ankreuzfelder', '', 'Ich habe die {{satzung}} von {{verein}} gelesen und erkenne sie an.
Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß Datenschutzerklärung zu.', 'Erste Zeile: Satzung, zweite Zeile: Datenverarbeitung. Genau dieser Wortlaut steht im Formular neben dem Häkchen und im PDF neben dem angekreuzten Kästchen. {{satzung}} wird im Formular zum Verweis auf die Satzung.', E'{"titel": "", "inhalt": "Ich habe die {{satzung}} von {{verein}} gelesen und erkenne sie an.\\nIch stimme der Verarbeitung meiner personenbezogenen Daten gemäß Datenschutzerklärung zu."}', '40', '2026-09-09T07:43:12.668857+00:00', NULL, '["verein", "satzung"]') ON CONFLICT DO NOTHING;
INSERT INTO public.profile_fields (id, type, label, modul, options, required, settings, block_key, is_active, created_at, sort_order, description) VALUES ('192089b3-e1da-4cfa-a82b-51716d8958a9', 'block', 'Ernährung', 'verpflegung', '[]', 'false', '{}', 'ernaehrung', 'true', '2026-09-09T08:27:35.029299+00:00', '10', 'Allergien und Ernährungsweise – nützlich für die Verpflegung auf Veranstaltungen.') ON CONFLICT DO NOTHING;
INSERT INTO public.profile_fields (id, type, label, modul, options, required, settings, block_key, is_active, created_at, sort_order, description) VALUES ('46549f42-d671-40b1-b970-7a80f97dea98', 'block', 'Mitgliedsantrag', 'applications', '[]', 'false', '{}', 'antrag', 'true', '2026-09-09T08:27:35.029299+00:00', '50', 'Der eigene Aufnahmeantrag als PDF zum Nachlesen.') ON CONFLICT DO NOTHING;
INSERT INTO public.profile_fields (id, type, label, modul, options, required, settings, block_key, is_active, created_at, sort_order, description) VALUES ('a68cd5a6-12c8-4e58-b141-d4fd4135d781', 'block', 'Darstellungssteckbrief', 'personas', '[]', 'false', '{}', 'darstellung', 'true', '2026-09-09T08:27:35.029299+00:00', '20', 'Was ein Mitglied darstellt und was es kann. Grundlage für die Seite „Unsere Darstellungen".') ON CONFLICT DO NOTHING;
INSERT INTO public.profile_fields (id, type, label, modul, options, required, settings, block_key, is_active, created_at, sort_order, description) VALUES ('adb6f6dd-6a6e-4fca-89f0-a01e6a9b004e', 'block', 'Meine Zelte', 'lagerlogistik', '[]', 'false', '{}', 'zelte', 'true', '2026-09-09T08:27:35.029299+00:00', '30', 'Zelte der Mitglieder, damit sie bei Veranstaltungsumfragen zur Auswahl stehen und in die Flächenberechnung eingehen.') ON CONFLICT DO NOTHING;
INSERT INTO public.profile_fields (id, type, label, modul, options, required, settings, block_key, is_active, created_at, sort_order, description) VALUES ('d093a0c5-2727-4f41-b8a8-d3b2f7746ce3', 'block', 'Mitgliederkarte', 'member_map', '[]', 'false', '{}', 'karte', 'true', '2026-09-09T08:27:35.029299+00:00', '40', 'Freiwillige Anzeige des Wohnorts auf der Karte im Mitgliederbereich.') ON CONFLICT DO NOTHING;
INSERT INTO public.site_categories (key, label, created_at, sort_order, description) VALUES ('1815', 'Napoleonik', '2026-09-08T14:58:03.802729+00:00', '20', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.site_categories (key, label, created_at, sort_order, description) VALUES ('mittelalter', 'Spätmittelalter', '2026-09-08T14:58:03.802729+00:00', '10', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.site_categories (key, label, created_at, sort_order, description) VALUES ('wk1', 'Erster Weltkrieg', '2026-09-08T14:58:03.802729+00:00', '30', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.site_menu (id, href, label, bereich, page_id, opens_new, parent_id, created_at, is_visible, sort_order) VALUES ('272361a8-e14a-48dc-b282-9787e1840b1a', '/', 'Startseite', 'kopf', NULL, 'false', NULL, '2026-09-08T13:23:31.564873+00:00', 'true', '10') ON CONFLICT DO NOTHING;
INSERT INTO public.site_menu (id, href, label, bereich, page_id, opens_new, parent_id, created_at, is_visible, sort_order) VALUES ('3f4e33fe-c5c0-4a77-b7cd-2cb1acabac95', '/epochen/mittelalter', 'Spätmittelalter', 'kopf', NULL, 'false', NULL, '2026-09-08T13:23:31.564873+00:00', 'true', '20') ON CONFLICT DO NOTHING;
INSERT INTO public.site_menu (id, href, label, bereich, page_id, opens_new, parent_id, created_at, is_visible, sort_order) VALUES ('460b7918-619c-435f-ad9f-8268411c8b3c', '/datenschutz', 'Datenschutz', 'fuss_rechtliches', NULL, 'false', NULL, '2026-09-08T21:37:55.529457+00:00', 'true', '20') ON CONFLICT DO NOTHING;
INSERT INTO public.site_menu (id, href, label, bereich, page_id, opens_new, parent_id, created_at, is_visible, sort_order) VALUES ('4d698356-2969-41cc-a73a-3f1b8736e93c', '/kontakt', 'Kontakt', 'kopf', NULL, 'false', NULL, '2026-09-08T13:23:31.564873+00:00', 'true', '70') ON CONFLICT DO NOTHING;
INSERT INTO public.site_menu (id, href, label, bereich, page_id, opens_new, parent_id, created_at, is_visible, sort_order) VALUES ('71d6def2-df83-4493-85e8-695ead0aae74', '/verein', 'Über uns', 'kopf', NULL, 'false', NULL, '2026-09-08T13:23:31.564873+00:00', 'true', '60') ON CONFLICT DO NOTHING;
INSERT INTO public.site_menu (id, href, label, bereich, page_id, opens_new, parent_id, created_at, is_visible, sort_order) VALUES ('7ad24f62-a7ef-40ff-a8ee-ca208b7b82e0', '/impressum', 'Impressum', 'fuss_rechtliches', NULL, 'false', NULL, '2026-09-08T21:37:55.529457+00:00', 'true', '10') ON CONFLICT DO NOTHING;
INSERT INTO public.site_menu (id, href, label, bereich, page_id, opens_new, parent_id, created_at, is_visible, sort_order) VALUES ('c4c6a29e-54b4-49df-8544-d64cccb3edb4', '/epochen/wk1', 'Erster Weltkrieg', 'kopf', NULL, 'false', NULL, '2026-09-08T13:23:31.564873+00:00', 'true', '40') ON CONFLICT DO NOTHING;
INSERT INTO public.site_menu (id, href, label, bereich, page_id, opens_new, parent_id, created_at, is_visible, sort_order) VALUES ('d3b4c3c7-8aa8-4aff-880c-8a8607b445c1', '/fuer-veranstalter', 'Für Veranstalter', 'kopf', NULL, 'false', NULL, '2026-09-08T13:23:31.564873+00:00', 'true', '50') ON CONFLICT DO NOTHING;
INSERT INTO public.site_menu (id, href, label, bereich, page_id, opens_new, parent_id, created_at, is_visible, sort_order) VALUES ('ea1b243e-4b04-49e9-8de9-e4109f0d66be', '/epochen/1815', 'Napoleonik', 'kopf', NULL, 'false', NULL, '2026-09-08T13:23:31.564873+00:00', 'true', '30') ON CONFLICT DO NOTHING;

-- == Leeres Gerüst ==
-- Die eine Einstellungszeile, bewusst ohne unsere Werte: Ein fremder Verein
-- traegt seinen Namen ein und loescht nicht unseren.
INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
-- Eine Startseite, damit die Website nicht mit einem Fehler beginnt.
INSERT INTO public.site_pages (slug, title, is_published, is_system, content)
VALUES ('startseite', 'Startseite', true, true, '{"content":[],"root":{}}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
RESET check_function_bodies;
