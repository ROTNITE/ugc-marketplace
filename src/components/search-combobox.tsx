"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchComboboxProps {
  /**
   * Placeholder text for the search input.
   */
  placeholder?: string;
  /**
   * Additional classes applied to the root container.
   */
  className?: string;
}

interface Suggestion {
  type: "creator" | "job";
  label: string;
  href: string;
}

/**
 * An accessible combobox component with async suggestions. It performs
 * debounced queries to the `/api/search` endpoint and displays a list
 * of suggestions below the input. When a suggestion is selected the user
 * is navigated to the appropriate page.
 */
export function SearchCombobox({ placeholder = "Поиск", className }: SearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions whenever query changes with debouncing
  useEffect(() => {
    // Close suggestions when the input is cleared
    if (!query) {
      setResults([]);
      setOpen(false);
      return;
    }
    // Only fetch when at least 2 characters entered
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setOpen((data.results?.length ?? 0) > 0);
        } else {
          setResults([]);
          setOpen(false);
        }
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query]);

  // Close dropdown when clicked outside
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!containerRef.current || containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        placeholder={placeholder}
        className="peer h-12 w-full rounded-full bg-surface/60 backdrop-blur px-5 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
      />
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-10 mt-2 w-full rounded-2xl border border-white/15 bg-white/7 backdrop-blur-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] text-white/85"
          >
            {loading && results.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">Ищем…</li>
            ) : (
              results.map((item, index) => (
                <li key={index} onClick={() => setOpen(false)}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-white/85 hover:bg-white/10"
                  >
                    <span
                      className={cn(
                        "size-3 rounded-full",
                        item.type === "creator" ? "bg-success" : "bg-primary",
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}