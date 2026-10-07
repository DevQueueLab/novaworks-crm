import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/*
 * Shared recipes for the landing page. Radius rule: outer frames are
 * rounded-xl, controls and inner panes rounded-lg, chips rounded-md.
 */

export const container = "mx-auto w-full max-w-6xl px-4 sm:px-8";

const ctaBase =
  "group inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-medium whitespace-nowrap outline-none transition-[background-color,color,translate] duration-150 active:translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** The one indigo action on the page: Sign in. */
export const primaryCta = cn(
  ctaBase,
  "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
);

export const secondaryCta = cn(
  ctaBase,
  "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
);

export const sectionTitle =
  "text-[clamp(2rem,4.2vw,3rem)] leading-[1.08] font-semibold tracking-[-0.032em] text-balance";

export const sectionLead =
  "mt-4 max-w-[56ch] text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg";

/** A neutral fill that stays opaque (hairline grids show through translucent fills). */
export const tintedSurface = "bg-[color-mix(in_oklch,var(--muted)_55%,var(--background))]";

const HIGHLIGHT = "color-mix(in oklch, var(--primary) 16%, transparent)";

/** Highlighter behind a phrase. Drawn as a background so it follows line wraps. */
export function highlightStyle(drawn: boolean): CSSProperties {
  return {
    backgroundImage: `linear-gradient(${HIGHLIGHT}, ${HIGHLIGHT})`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "0 0",
    backgroundSize: drawn ? "100% 100%" : "0% 100%",
  };
}

/** A strike line in the text colour that can be drawn from left to right. */
export function strikeStyle(drawn: boolean, weight = 1.5): CSSProperties {
  return {
    backgroundImage: "linear-gradient(currentColor, currentColor)",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "0 56%",
    backgroundSize: `${drawn ? 100 : 0}% ${weight}px`,
  };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Initials avatar, kept neutral so indigo stays reserved for the action and highlights. */
export function Initials({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[9px] font-semibold tracking-tight text-secondary-foreground ring-1 ring-border select-none",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Typed querySelectorAll for the animation islands. */
export function pick(scope: ParentNode, selector: string) {
  return Array.from(scope.querySelectorAll<HTMLElement>(selector));
}
