"use client";

// Web Speech API hook for Brangus voice input
// Wraps SpeechRecognition with livestock term corrections (ported from iOS VoiceChatService)
// en-AU locale, 2s silence auto-stop, 30s max recording

import { useState, useRef, useCallback, useEffect } from "react";

// Livestock term corrections - ported from iOS VoiceChatService.swift
const LIVESTOCK_CORRECTIONS: [RegExp, string][] = [
  // Feeders
  [/\bfeet is\b/gi, "feeders"],
  [/\bfetus\b/gi, "feeders"],
  // Weaners
  [/\bwinners\b/gi, "weaners"],
  [/\bwieners\b/gi, "weaners"],
  // Calves
  [/\bcarbs\b/gi, "calves"],
  [/\bcabs\b/gi, "calves"],
  // Yearlings
  [/\byearning\b/g, "yearling"],
  [/\byearnings\b/g, "yearlings"],
  // Breeds
  [/\bbrangus\b/gi, "Brangus"],
  [/\bdraught master\b/gi, "Droughtmaster"],
  [/\bbrahma\b/gi, "Brahman"],
  // Industry terms
  [/\bEWCI\b/g, "EYCI"],
  [/\bewci\b/g, "EYCI"],
];

function correctLivestockTerms(text: string): string {
  let result = text;
  for (const [regex, replacement] of LIVESTOCK_CORRECTIONS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  finalTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef("");

  // Check browser support
  const isSupported = typeof window !== "undefined" && !!(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const stopListening = useCallback(() => {
    const captured = lastTranscriptRef.current;
    cleanup();
    if (captured) {
      setFinalTranscript(correctLivestockTerms(captured));
    }
  }, [cleanup]);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    // Reset state
    cleanup();
    setTranscript("");
    setFinalTranscript("");
    lastTranscriptRef.current = "";

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.lang = "en-AU";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const current = final || interim;
      if (current) {
        const corrected = correctLivestockTerms(current);
        lastTranscriptRef.current = corrected;
        setTranscript(corrected);

        // Reset 2s silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (lastTranscriptRef.current) {
            setFinalTranscript(lastTranscriptRef.current);
          }
          cleanup();
        }, 2000);
      }

      if (final) {
        const correctedFinal = correctLivestockTerms(final);
        setFinalTranscript(correctedFinal);
        cleanup();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      cleanup();
    };

    recognition.onend = () => {
      // Commit whatever we have if still listening
      if (lastTranscriptRef.current && !finalTranscript) {
        setFinalTranscript(correctLivestockTerms(lastTranscriptRef.current));
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);

      // 30s max recording timer
      maxTimerRef.current = setTimeout(() => {
        stopListening();
      }, 30000);
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      cleanup();
    }
  }, [isSupported, cleanup, stopListening, finalTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    transcript,
    finalTranscript,
    startListening,
    stopListening,
    isSupported,
  };
}
