
-- Attach safety guards to posts (auto-detect risky URLs + quarantine)
DROP TRIGGER IF EXISTS posts_safety_guard_trg ON public.posts;
CREATE TRIGGER posts_safety_guard_trg
  BEFORE INSERT OR UPDATE OF caption, title ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_safety_guard();

-- Attach safety guard to comments
DROP TRIGGER IF EXISTS comments_safety_guard_trg ON public.post_comments;
CREATE TRIGGER comments_safety_guard_trg
  BEFORE INSERT OR UPDATE OF content ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.comments_safety_guard();

-- Attach safety guard to profiles (display_name/username/bio)
DROP TRIGGER IF EXISTS profiles_safety_guard_trg ON public.profiles;
CREATE TRIGGER profiles_safety_guard_trg
  BEFORE INSERT OR UPDATE OF display_name, username, bio ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_safety_guard();
