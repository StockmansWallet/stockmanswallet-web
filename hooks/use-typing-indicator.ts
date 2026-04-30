"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const TYPING_TIMEOUT_MS = 3000;
const BROADCAST_THROTTLE_MS = 1500;

/**
 * Hook for real-time typing indicators using Supabase Realtime broadcast.
 * No database writes - purely ephemeral channel messages.
 *
 * @param channelName - Unique channel name (e.g. "chat:connectionId")
 * @param userId - Current user's ID
 * @returns { peerIsTyping, notifyTyping }
 */
export function useTypingIndicator(channelName: string, userId: string) {
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBroadcastRef = useRef(0);
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

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const senderId = payload.payload?.userId;
        if (senderId && senderId.toLowerCase() !== normalisedSelf) {
          setPeerIsTyping(true);

          // Clear previous timeout
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          // Hide after timeout (peer stopped typing)
          timeoutRef.current = setTimeout(() => {
            setPeerIsTyping(false);
          }, TYPING_TIMEOUT_MS);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelName, userId]);

  /** Call this when the local user is typing (e.g. on input change). Throttled. */
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
   * Force-clear the peer-typing state. Call when a peer message arrives so
   * the indicator doesn't linger past the message under the 3s auto-hide
   * timer (which makes the indicator look like it flashes back in after
   * the new bubble pushes it down).
   */
  const clearPeerTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPeerIsTyping(false);
  }, []);

  return { peerIsTyping, notifyTyping, clearPeerTyping };
}
