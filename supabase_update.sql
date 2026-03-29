-- 1. Update the default value for the credits column in the profiles table
ALTER TABLE public.profiles 
ALTER COLUMN credits SET DEFAULT 20;

-- 2. If you have any existing triggers that add 25 credits, please update them.
-- Example of what a typical "handle_new_user" function might look like:
/*
OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, credits)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 20); -- Changed from 25 to 20
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- 3. (Optional) If you want to update existing users who might have 25 from a recent sign-up but haven't used them:
-- UPDATE public.profiles SET credits = 20 WHERE credits = 25 AND created_at > now() - interval '1 hour';
