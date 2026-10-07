"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";

import { pick } from "@/components/landing/primitives";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * When the corrections scroll into view, each earlier value is struck through and the
 * final value arrives after it, row by row. Server markup is already the end state.
 */
export function FinalDecisionsMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scope = root.current;
        if (!scope) return;
        const rows = pick(scope, "[data-diff-row]");
        if (rows.length === 0) return;

        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope, start: "top 78%", once: true },
        });

        rows.forEach((row, i) => {
          const before = row.querySelector<HTMLElement>("[data-strike]");
          const after = row.querySelector<HTMLElement>("[data-new]");
          if (!before || !after) return;
          gsap.set(before, { backgroundSize: "0% 2px" });
          gsap.set(after, { autoAlpha: 0, x: -8 });
          tl.to(
            before,
            { backgroundSize: "100% 2px", duration: 0.5, ease: "power2.inOut" },
            i * 0.16,
          );
          tl.to(after, { autoAlpha: 1, x: 0, duration: 0.7, ease: "expo.out" }, i * 0.16 + 0.32);
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
