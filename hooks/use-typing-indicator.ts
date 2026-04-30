"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const TYPING_EVENT = "typing";
const TYPING_REFRESH_MS = 2_000;
const TYPING_STALE_MS = 3_500;
const TYPING_STOP_GRACE_MS = 900;

interface TypingBroadcastPayload {
  senderUserId: string;
  active: boolean;
  sessionId: string;
  sentAt: number;
}

function makeSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isTypingPayload(value: unknown): value is TypingBroadcastPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<TypingBroadcastPayload>;
  return (
    typeof payload.senderUserId === "string" &&
    typeof payload.active === "boolean" &&
    typeof payload.sessionId === "string" &&
    typeof payload.sentAt === "number"
  );
}

/**
 * Ephemeral cross-client typing indicator backed by Supabase Realtime
 * broadcasts. Typing is not durable presence state: the sender emits
 * active/idle events plus periodic refreshes, and receivers clear the UI
 * after a short timeout if refreshes stop. Idle events clear after a short
 * grace period so a send handoff can replace the typing row with the real
 * message without a down-then-up layout jump.
 */
export function useTypingIndicator(channelName: string, userId: string) {
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const channelSubscribedRef = useRef(false);
  const localTypingRef = useRef(false);
  const localSessionIdRef = useRef<string | null>(null);
  const lastTypingSentAtRef = useRef(0);
  const pendingPayloadRef = useRef<TypingBroadcastPayload | null>(null);
  const peerLastSentAtRef = useRef(0);
  const peerSessionIdRef = useRef<string | null>(null);
  const peerClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPeerTimer = useCallback(() => {
    if (peerClearTimerRef.current) {
      clearTimeout(peerClearTimerRef.current);
      peerClearTimerRef.current = null;
    }
  }, []);

  const clearPeerTyping = useCallback(() => {
    clearPeerTimer();
    peerSessionIdRef.current = null;
    setPeerIsTyping(false);
  }, [clearPeerTimer]);

  const sendTypingPayload = useCallback((payload: TypingBroadcastPayload) => {
    pendingPayloadRef.current = payload;
    const channel = channelRef.current;
    if (!channelSubscribedRef.current || !channel) return;

    pendingPayloadRef.current = null;
    void channel.send({
      type: "broadcast",
      event: TYPING_EVENT,
      payload,
    });
  }, []);

  const emitTypingState = useCallback(
    (active: boolean, force = false) => {
      const now = Date.now();
      if (active) {
        if (!localTypingRef.current) {
          localSessionIdRef.current = makeSessionId();
          localTypingRef.current = true;
        } else if (!force && now - lastTypingSentAtRef.current < TYPING_REFRESH_MS) {
          return;
        }
      } else if (!localTypingRef.current && !force) {
        return;
      } else {
        localTypingRef.current = false;
      }

      lastTypingSentAtRef.current = now;
      sendTypingPayload({
        senderUserId: userId.toLowerCase(),
        active,
        sessionId: localSessionIdRef.current ?? makeSessionId(),
        sentAt: now,
      });

      if (!active) {
        localSessionIdRef.current = null;
      }
    },
    [sendTypingPayload, userId]
  );

  useEffect(() => {
    const supabase = createClient();
    const normalisedSelf = userId.toLowerCase();

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    channel
      .on<TypingBroadcastPayload>("broadcast", { event: TYPING_EVENT }, ({ payload }) => {
        if (!isTypingPayload(payload)) return;
        if (payload.senderUserId.toLowerCase() === normalisedSelf) return;
        if (payload.sentAt < peerLastSentAtRef.current) return;

        if (!payload.active) {
          peerLastSentAtRef.current = payload.sentAt;
          clearPeerTimer();
          const sessionId = payload.sessionId;
          peerClearTimerRef.current = setTimeout(() => {
            if (peerSessionIdRef.current === sessionId) {
              clearPeerTyping();
            }
          }, TYPING_STOP_GRACE_MS);
          return;
        }

        if (Date.now() - payload.sentAt > TYPING_STALE_MS) return;

        peerLastSentAtRef.current = payload.sentAt;
        peerSessionIdRef.current = payload.sessionId;
        setPeerIsTyping(true);
        clearPeerTimer();
        peerClearTimerRef.current = setTimeout(() => {
          if (peerSessionIdRef.current === payload.sessionId) {
            clearPeerTyping();
          }
        }, TYPING_STALE_MS);
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          channelSubscribedRef.current = false;
          return;
        }

        channelSubscribedRef.current = true;
        if (pendingPayloadRef.current) {
          const pending = pendingPayloadRef.current;
          pendingPayloadRef.current = null;
          void channel.send({
            type: "broadcast",
            event: TYPING_EVENT,
            payload: pending,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      emitTypingState(false, true);
      clearPeerTimer();
      channelSubscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
      pendingPayloadRef.current = null;
      localTypingRef.current = false;
      localSessionIdRef.current = null;
    };
  }, [channelName, clearPeerTimer, clearPeerTyping, emitTypingState, userId]);

  const notifyTyping = useCallback(() => {
    emitTypingState(true);
  }, [emitTypingState]);

  const notifyTypingStop = useCallback(() => {
    emitTypingState(false);
  }, [emitTypingState]);

  return { peerIsTyping, notifyTyping, notifyTypingStop, clearPeerTyping };
}
