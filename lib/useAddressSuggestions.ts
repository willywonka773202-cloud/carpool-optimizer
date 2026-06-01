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
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (text.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      const results = await searchAutocomplete(text, apiKey, 5, fetch);
      if (requestIdRef.current === requestId) {
        setSuggestions(results);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
    };
  }, [text, apiKey]);

  return { suggestions, loading };
}
