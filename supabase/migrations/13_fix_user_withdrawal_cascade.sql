-- 13_fix_user_withdrawal_cascade.sql
-- Fix foreign key constraints to ON DELETE CASCADE / SET NULL to allow user account deletion (회원탈퇴)

-- 1. chat_sessions
ALTER TABLE public.chat_sessions 
  DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey, 
  ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. tarot_readings
ALTER TABLE public.tarot_readings 
  DROP CONSTRAINT IF EXISTS tarot_readings_user_id_fkey, 
  ADD CONSTRAINT tarot_readings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. credit_usages
ALTER TABLE public.credit_usages 
  DROP CONSTRAINT IF EXISTS credit_usages_user_id_fkey, 
  ADD CONSTRAINT credit_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.credit_usages 
  DROP CONSTRAINT IF EXISTS credit_usages_purchase_id_fkey, 
  ADD CONSTRAINT credit_usages_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.credit_purchases(id) ON DELETE SET NULL;

-- 4. coin_transactions
ALTER TABLE public.coin_transactions 
  DROP CONSTRAINT IF EXISTS coin_transactions_user_id_fkey, 
  ADD CONSTRAINT coin_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. orders
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey, 
  ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. posts
ALTER TABLE public.posts 
  DROP CONSTRAINT IF EXISTS posts_user_id_fkey, 
  ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. comments
ALTER TABLE public.comments 
  DROP CONSTRAINT IF EXISTS comments_user_id_fkey, 
  ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.comments 
  DROP CONSTRAINT IF EXISTS comments_parent_id_fkey, 
  ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;

-- 8. support_inquiries (linked_purchase_id)
ALTER TABLE public.support_inquiries 
  DROP CONSTRAINT IF EXISTS support_inquiries_linked_purchase_id_fkey, 
  ADD CONSTRAINT support_inquiries_linked_purchase_id_fkey FOREIGN KEY (linked_purchase_id) REFERENCES public.credit_purchases(id) ON DELETE SET NULL;

-- 9. support_inquiry_messages
ALTER TABLE public.support_inquiry_messages 
  DROP CONSTRAINT IF EXISTS support_inquiry_messages_sender_id_fkey, 
  ADD CONSTRAINT support_inquiry_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. community_reports
ALTER TABLE public.community_reports 
  DROP CONSTRAINT IF EXISTS community_reports_reporter_id_fkey, 
  ADD CONSTRAINT community_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 11. consultation_questions (answered_by)
ALTER TABLE public.consultation_questions 
  DROP CONSTRAINT IF EXISTS consultation_questions_answered_by_fkey, 
  ADD CONSTRAINT consultation_questions_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 12. handle_deleted_profile trigger function (prevent recursion with pg_trigger_depth)
CREATE OR REPLACE FUNCTION public.handle_deleted_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF pg_trigger_depth() <= 1 THEN
    DELETE FROM auth.users WHERE id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

