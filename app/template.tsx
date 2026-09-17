"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

export default function Template({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );

    // Safety net: guarantee visibility.
    const safety = window.setTimeout(() => {
      gsap.set(el, { opacity: 1, y: 0, clearProps: "transform" });
    }, 1500);

    return () => {
      window.clearTimeout(safety);
      tween.kill();
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
