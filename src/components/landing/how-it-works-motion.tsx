"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";

import { pick } from "@/components/landing/primitives";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The server renders the three steps stacked, which is what phones, reduced motion
 * and no-JS visitors get. On wide screens with motion allowed, this island stacks the
 * panels into one stage, pins the section and lets scroll walk the steps.
 */
export function HowItWorksMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const scope = root.current;
        if (!scope) return;

        const pin = scope.querySelector<HTMLElement>("[data-how-pin]");
        const rail = scope.querySelector<HTMLElement>("[data-how-rail]");
        const track = scope.querySelector<HTMLElement>("[data-how-steps]");
        const panels = pick(scope, "[data-how-panel]");
        const railItems = pick(scope, "[data-rail-item]");
        if (!pin || !rail || !track || panels.length !== 3 || railItems.length !== 3) return;

        // Stage layout: the rail narrates on the left, the panels share one cell.
        gsap.set(rail, { display: "flex" });
        gsap.set(track, { gridColumn: "span 8 / span 8", gap: 0 });
        gsap.set(pick(scope, "[data-how-step]"), { gridArea: "1 / 1", display: "block" });
        gsap.set(pick(scope, "[data-how-caption]"), { display: "none" });
        gsap.set(panels, { height: "100%" });
        gsap.set(panels.slice(1), { autoAlpha: 0 });
        gsap.set(railItems.slice(1), { opacity: 0.32 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: pin,
            pin: true,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * 1.8)}`,
            scrub: 0.5,
            snap: {
              snapTo: "labelsDirectional",
              duration: { min: 0.2, max: 0.5 },
              delay: 0.05,
              ease: "power1.inOut",
            },
            invalidateOnRefresh: true,
          },
        });

        tl.addLabel("paste", 0);
        tl.to({}, { duration: 0.6 });

        // Each later panel covers the one before it, so the frame never flickers.
        const enter = (i: number, label: string) => {
          const at = tl.duration();
          const panel = panels[i];
          tl.to(panel, { autoAlpha: 1, duration: 0.35 }, at);
          tl.fromTo(
            pick(panel, "[data-stagger]"),
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.05, immediateRender: false },
            at + 0.05,
          );
          tl.to(railItems[i - 1], { opacity: 0.32, duration: 0.35 }, at);
          tl.to(railItems[i], { opacity: 1, duration: 0.35 }, at);
          tl.addLabel(label, at + 0.55);
          tl.to({}, { duration: 0.6 }, at + 0.55);
        };
        enter(1, "decide");
        enter(2, "save");
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
