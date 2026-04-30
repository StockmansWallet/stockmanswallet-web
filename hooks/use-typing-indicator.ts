"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// Auto-hide window if no events arrive at all. Long enough to survive a
// natural typing pause (mid-sentence thinking, fixing a typo) without the
// indicator flickering off, but not so long that it lingers if the peer
// closes the chat without sending.
const TYPING_TIMEOUT_MS = 7000;
// At-most-once-per-N keystroke broadcast cadence. Receiver auto-hide is
// well above this, so brief throttle gaps never blink the indicator off.
const BROADCAST_THROTTLE_MS = 1500;
// After an explicit clear (e.g. peer message arrived) we briefly ignore
// inbound typing broadcasts to swallow any stale events the peer fired
// just before they hit send. Without this the indicator reappears for a
// few seconds after the message lands.
const STALE_BROADCAST_SUPPRESS_MS = 2500;

/**
 * Hook for real-time typing indicators using Supabase Realtime broadcast.
 * Models Apple Messages behaviour: one indicator that stays steady while
 * the peer is typing, disappears the moment they send, and is resilient
 * against late-arriving stale events.
 *
 * @param channelName - Unique channel name (e.g. "chat:connectionId")
 * @param userId - Current user's ID
 */
export function useTypingIndicator(channelName: string, userId: string) {
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBroadcastRef = useRef(0);
  const ignoreUntilRef = useRef(0);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // self: false so our own broadcasts don't echo back and trigger the
    // "peer is typing" indicator on the device that sent the event.
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    // iOS sends UUIDs uppercase, web auth.uid() is lowercase, so a strict
    // string compare would treat the same user as a peer when both
    // platforms are signed into one account. Compare case-insensitively.
    const normalisedSelf = userId.toLowerCase();

    const handleTyping = (payload: { payload?: { userId?: string } }) => {
      // Suppression window: drop broadcasts that arrive shortly after a
      // peer message - they're stale events from before the send.
      if (Date.now() < ignoreUntilRef.current) return;

      const senderId = payload.payload?.userId;
      if (!senderId || senderId.toLowerCase() === normalisedSelf) return;

      setPeerIsTyping(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setPeerIsTyping(false);
      }, TYPING_TIMEOUT_MS);
    };

    const handleTypingStop = (payload: { payload?: { userId?: string } }) => {
      const senderId = payload.payload?.userId;
      if (!senderId || senderId.toLowerCase() === normalisedSelf) return;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setPeerIsTyping(false);
    };

    channel
      .on("broadcast", { event: "typing" }, handleTyping)
      .on("broadcast", { event: "typing-stop" }, handleTypingStop)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, userId]);

  /** Call on each keystroke while the local user is typing. Throttled. */
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastBroadcastRef.current < BROADCAST_THROTTLE_MS) return;
    lastBroadcastRef.current = now;

    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId },
    });
  }, [userId]);

  /**
   * Call when the local user explicitly stops typing (input becomes empty,
   * message sent, composer unmounts). Tells peers to drop the indicator
   * immediately rather than waiting on the auto-hide timer.
   */
  const notifyTypingStop = useCallback(() => {
    // Reset the throttle so the next notifyTyping fires immediately when
    // the user starts typing again.
    lastBroadcastRef.current = 0;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing-stop",
      payload: { userId },
    });
  }, [userId]);

  /**
   * Force-clear the peer-typing state and suppress any stale broadcasts
   * that arrive in the next couple of seconds. Use when something other
   * than a typing-stop event proves the peer is no longer typing -
   * notably when their message has landed.
   */
  const clearPeerTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    ignoreUntilRef.current = Date.now() + STALE_BROADCAST_SUPPRESS_MS;
    setPeerIsTyping(false);
  }, []);

  return { peerIsTyping, notifyTyping, notifyTypingStop, clearPeerTyping };
}
