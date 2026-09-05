"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms before the reveal transition starts. */
  delay?: number;
  as?: "div" | "section";
}

/**
 * Lightweight scroll-reveal. The hidden state is applied only client-side and
 * only when the element starts below the viewport, so SSR / no-JS / reduced
 * motion always render content fully visible.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rect = el.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

    // Already visible, or the user prefers no motion: never hide.
    if (reducedMotion || inViewport || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
      className={`${visible ? "" : "sentinel-reveal"} ${className}`}
    >
      {children}
    </Tag>
  );
}