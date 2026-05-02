-- Reason: The brangus_shared_chats SELECT policy hides rows where the caller
-- has soft-deleted them (is_deleted_by_sender = false / is_deleted_by_recipient = false).
-- When a sender or recipient runs a direct UPDATE that flips their own flag
-- to true, PostgREST's post-UPDATE visibility check fails because the new
-- row is no longer SELECT-visible to the caller, which surfaces as RLS
-- error 42501 ("new row violates row-level security policy"). The bug
-- showed up in the iOS app's swipe-to-delete on Brangus shared chats: the
-- update kept failing and the row reappeared on every refetch.
--
-- Fix: route both soft-delete flag flips through SECURITY DEFINER RPCs that
-- bypass RLS (so the post-update visibility check is skipped) but explicitly
-- enforce ownership server-side via auth.uid() comparisons. EXECUTE is
-- granted to authenticated users only - anonymous callers cannot reach
-- these functions.

CREATE OR REPLACE FUNCTION public.soft_delete_shared_chat_sender(p_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.brangus_shared_chats
  SET is_deleted_by_sender = true
  WHERE id = p_chat_id
    AND sender_user_id = v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_shared_chat_recipient(p_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.brangus_shared_chats
  SET is_deleted_by_recipient = true
  WHERE id = p_chat_id
    AND recipient_user_id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_shared_chat_sender(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.soft_delete_shared_chat_recipient(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.soft_delete_shared_chat_sender(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_shared_chat_recipient(uuid) TO authenticated;
