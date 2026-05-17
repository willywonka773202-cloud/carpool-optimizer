"use client";

import { useEffect, useRef, useState } from "react";
import { searchAutocomplete, type Suggestion } from "./orsAutocomplete";

const DEBOUNCE_MS = 250;

export function useAddressSuggestions(
  text: string,
  apiKey: string | null
): { suggestions: Suggestion[]; loading: boolean } {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (!apiKey || text.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const handle = setTimeout(async () => {
      setLoading(true);
      const results = await searchAutocomplete(text, apiKey, 5, fetch, controller.signal);
      if (!controller.signal.aborted) {
        setSuggestions(results);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [text, apiKey]);

  return { suggestions, loading };
}
