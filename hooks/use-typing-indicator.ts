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
  // Tracks the last typing state we sent so notifyTyping/notifyTypingStop
  // can no-op when called redundantly (e.g. fired on every keystroke).
  const localTypingRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    // self: false stops our own broadcasts echoing back (defensive even
    // though we don't use broadcast here anymore - any future event we
    // add inherits the right default).
    // presence.key = userId so iOS and web converge on a single key per
    // user. iOS sends UUIDs uppercase, web is lowercase, so normalise.
    const normalisedSelf = userId.toLowerCase();
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
      if (true) {
        console.log("[typing] recompute", { state, someoneTyping });
      }
      setPeerIsTyping(someoneTyping);
    };

    channel
      .on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute)
      .subscribe(async (status) => {
        if (true) {
          console.log(`[typing] subscribe status=${status} channel=${channelName}`);
        }
        if (status !== "SUBSCRIBED") return;
        // Seed presence with our CURRENT local state, not always false.
        // Race: if the user starts typing during the ~200ms between mount
        // and SUBSCRIBED, notifyTyping fires against an unsubscribed
        // channel and the track() call silently no-ops. localTypingRef
        // would stay true so subsequent notifyTyping calls return early,
        // and the peer never sees us typing for that whole session.
        // Tracking the current ref value here recovers from that race.
        const result = await channel.track({ typing: localTypingRef.current });
        if (true) {
          console.log(`[typing] subscribe seed track result=${result}`, {
            seed: localTypingRef.current,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      // untrack is best-effort - channel removal will clean up regardless.
      void channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      localTypingRef.current = false;
    };
  }, [channelName, userId]);

  /** Tell peers we're typing. Idempotent - safe to call on every keystroke. */
  const notifyTyping = useCallback(() => {
    if (localTypingRef.current) return;
    localTypingRef.current = true;
    if (true) {
      console.log("[typing] notifyTyping fired -> track({typing:true})", {
        hasChannel: !!channelRef.current,
      });
    }
    channelRef.current?.track({ typing: true }).then((result) => {
      if (true) {
        console.log("[typing] track(true) result=", result);
      }
    });
  }, []);

  /**
   * Tell peers we're no longer typing. Call when the input clears, when
   * a message is sent, or when the composer unmounts.
   */
  const notifyTypingStop = useCallback(() => {
    if (!localTypingRef.current) return;
    localTypingRef.current = false;
    if (true) {
      console.log("[typing] notifyTypingStop fired -> track({typing:false})");
    }
    channelRef.current?.track({ typing: false }).then((result) => {
      if (true) {
        console.log("[typing] track(false) result=", result);
      }
    });
  }, []);

  return { peerIsTyping, notifyTyping, notifyTypingStop };
}
