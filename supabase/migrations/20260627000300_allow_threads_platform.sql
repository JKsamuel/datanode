alter table public.social_posts
  drop constraint if exists social_posts_platform_check;

alter table public.social_posts
  add constraint social_posts_platform_check
  check (platform in ('instagram', 'threads', 'tiktok', 'youtube', 'x', 'web'));
