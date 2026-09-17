"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function Reveal({
  children,
  className,
  y = 32,
  stagger = false,
  start = "top 88%",
  deps = [],
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  stagger?: boolean;
  start?: string;
  deps?: unknown[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.registerPlugin(ScrollTrigger);

    const targets: gsap.TweenTarget = stagger ? Array.from(el.children) : el;
    if (
      (Array.isArray(targets) && targets.length === 0) ||
      (targets as unknown) === null
    )
      return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: stagger ? 0.12 : 0,
          scrollTrigger: { trigger: el, start, once: true },
        }
      );
    }, el);

    // Recalculate trigger positions once layout/fonts settle.
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());

    // Safety net: never leave content invisible if ScrollTrigger fails to fire.
    const safety = window.setTimeout(() => {
      gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
    }, 2000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      ctx.revert();
    };
  }, [y, stagger, start, ...deps]);

  return <div ref={ref} className={className}>{children}</div>;
}
