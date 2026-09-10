
DROP TRIGGER IF EXISTS update_thread_on_post_trigger ON public.forum_posts;
DROP TRIGGER IF EXISTS create_forum_mention_notifications_trigger ON public.forum_posts;
DROP TRIGGER IF EXISTS create_forum_reply_notifications_trigger ON public.forum_posts;

DROP FUNCTION IF EXISTS public.update_thread_on_post() CASCADE;
DROP FUNCTION IF EXISTS public.create_forum_mention_notifications() CASCADE;
DROP FUNCTION IF EXISTS public.create_forum_reply_notifications() CASCADE;

DROP TABLE IF EXISTS public.forum_reactions CASCADE;
DROP TABLE IF EXISTS public.forum_read_status CASCADE;
DROP TABLE IF EXISTS public.forum_subscriptions CASCADE;
DROP TABLE IF EXISTS public.forum_posts CASCADE;
DROP TABLE IF EXISTS public.forum_threads CASCADE;
DROP TABLE IF EXISTS public.forum_categories CASCADE;

DROP TYPE IF EXISTS public.forum_category_type CASCADE;

DELETE FROM public.role_permissions WHERE permission IN ('forum.moderate', 'forum.categories_manage');
DELETE FROM public.permission_catalog WHERE key IN ('forum.moderate', 'forum.categories_manage');

DELETE FROM public.notifications WHERE type IN ('forum_mention', 'forum_reply', 'forum_subscription');
