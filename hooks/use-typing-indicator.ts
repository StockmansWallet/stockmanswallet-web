"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook for real-time typing indicators backed by Supabase Realtime
 * Presence. Each chat surface configures the channel with the local
 * user id as the presence key; the local client tracks
 * `{ typing: true | false }` and the receiver derives `peerIsTyping`
 * from the live presence state.
 *
 * Why Presence and not broadcast: Presence handles join / leave on
 * disconnect automatically and is last-write-wins per key, so there is
 * no need for receiver-side timeouts, throttle logic, or stale-event
 * suppression windows. The library handles what we used to hand-roll.
 *
 * Callers can fire `notifyTyping` on every keystroke - the hook
 * deduplicates so only real transitions hit the network.
 */
export function useTypingIndicator(channelName: string, userId: string) {
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const channelSubscribedRef = useRef(false);
  const presenceWriteInFlightRef = useRef(false);
  const desiredPresenceVersionRef = useRef(0);
  const flushedPresenceVersionRef = useRef(0);
  const typingSessionRef = useRef(0);
  const lastTypingRefreshAtRef = useRef(0);
  const desiredPresenceRef = useRef({ typing: false, typingSessionId: 0, updatedAt: 0 });
  // Tracks the local composer state. The presence payload also carries a
  // monotonically increasing typingSessionId so a new typing run is still
  // visible to peers even if a previous typing=false write was dropped by
  // the socket during a send/navigation race.
  const localTypingRef = useRef(false);

  const flushPresence = useCallback(async () => {
    if (presenceWriteInFlightRef.current) return;
    const channel = channelRef.current;
    if (!channelSubscribedRef.current || !channel) return;

    presenceWriteInFlightRef.current = true;
    try {
      while (
        channelSubscribedRef.current &&
        channelRef.current === channel &&
        flushedPresenceVersionRef.current < desiredPresenceVersionRef.current
      ) {
        const version = desiredPresenceVersionRef.current;
        const payload = desiredPresenceRef.current;
        await channel.track(payload).catch(() => "error" as const);
        flushedPresenceVersionRef.current = version;
      }
    } finally {
      presenceWriteInFlightRef.current = false;
    }
  }, []);

  const queuePresence = useCallback(
    (typing: boolean, refreshExistingSession = false) => {
      const now = Date.now();
      if (typing && (!localTypingRef.current || refreshExistingSession)) {
        if (!localTypingRef.current) typingSessionRef.current += 1;
        lastTypingRefreshAtRef.current = now;
      }

      desiredPresenceRef.current = {
        typing,
        typingSessionId: typingSessionRef.current,
        updatedAt: now,
      };
      desiredPresenceVersionRef.current += 1;
      void flushPresence();
    },
    [flushPresence]
  );

  useEffect(() => {
    const supabase = createClient();
    // self: false stops our own broadcasts echoing back (defensive even
    // though we don't use broadcast here anymore - any future event we
    // add inherits the right default).
    // presence.key = userId so iOS and web converge on a single key per
    // user. iOS sends UUIDs uppercase, web is lowercase, so normalise.
    const normalisedSelf = userId.toLowerCase();

    // setAuth is intentionally NOT called here. The Supabase JS client is
    // a singleton and the messages effect in the chat client mounts in
    // the same render, also calling setAuth on the same shared realtime
    // client. Adding a second async setAuth from this hook can race the
    // subscribe and disturb already-joined channels.

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: normalisedSelf },
        broadcast: { self: false },
      },
    });

    const recompute = () => {
      const state = channel.presenceState<{ typing?: boolean }>();
      let someoneTyping = false;
      for (const [uid, presences] of Object.entries(state)) {
        if (uid.toLowerCase() === normalisedSelf) continue;
        if (presences.some((p) => p.typing === true)) {
          someoneTyping = true;
          break;
        }
      }
      setPeerIsTyping(someoneTyping);
    };

    channel
      .on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") {
          channelSubscribedRef.current = false;
          return;
        }
        channelSubscribedRef.current = true;
        // Seed presence with our CURRENT local state, not always false.
        // Race: if the user starts typing during the ~200ms between mount
        // and SUBSCRIBED, notifyTyping fires against an unsubscribed
        // channel and the track() call silently no-ops. localTypingRef
        // would stay true so subsequent notifyTyping calls return early,
        // and the peer never sees us typing for that whole session.
        // Tracking the current ref value here recovers from that race.
        queuePresence(localTypingRef.current, localTypingRef.current);
      });

    channelRef.current = channel;

    return () => {
      if (channelSubscribedRef.current) {
        void channel.untrack();
      }
      channelSubscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
      localTypingRef.current = false;
      presenceWriteInFlightRef.current = false;
    };
  }, [channelName, queuePresence, userId]);

  /** Tell peers we're typing. Idempotent - safe to call on every keystroke. */
  const notifyTyping = useCallback(() => {
    if (localTypingRef.current) {
      const now = Date.now();
      if (now - lastTypingRefreshAtRef.current >= 2_000) {
        queuePresence(true, true);
      }
      return;
    }
    localTypingRef.current = true;
    queuePresence(true);
  }, [queuePresence]);

  /**
   * Tell peers we're no longer typing. Call when the input clears, when
   * a message is sent, or when the composer unmounts.
   */
  const notifyTypingStop = useCallback(() => {
    if (!localTypingRef.current) return;
    localTypingRef.current = false;
    queuePresence(false);
  }, [queuePresence]);

  /**
   * Force-clear the local peer-typing flag. Call when a peer message
   * arrives so the indicator unmounts immediately rather than waiting
   * on the peer's typing-stop presence update, which can race the
   * INSERT and arrive a few hundred ms later.
   */
  const clearPeerTyping = useCallback(() => {
    setPeerIsTyping(false);
  }, []);

  return { peerIsTyping, notifyTyping, notifyTypingStop, clearPeerTyping };
}
