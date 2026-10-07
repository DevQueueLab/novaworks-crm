import type { Metadata } from "next";

import { Closing, SiteFooter } from "@/components/landing/closing";
import { Features } from "@/components/landing/features";
import { FinalDecisions } from "@/components/landing/final-decisions";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Security } from "@/components/landing/security";
import { SiteHeader } from "@/components/landing/site-header";

export const metadata: Metadata = {
  title: { absolute: "NovaWorks CRM · Meeting transcripts in, assigned work out" },
  description:
    "Paste a meeting transcript. NovaWorks reads the final decisions and builds validated projects and tasks with real owners, deadlines and estimated hours.",
};

/*
 * Above-the-fold copy is hidden until the hero island takes over, so it never flashes
 * in and out on hydration. If scripts never run, the failsafe animation reveals it.
 * Reduced motion skips all of this and shows the finished state immediately.
 */
const LANDING_CSS = `
@media (prefers-reduced-motion: no-preference) {
  [data-intro] { opacity: 0; animation: lp-intro-failsafe 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.8s forwards; }
}
@keyframes lp-intro-failsafe { to { opacity: 1; } }
[data-hero-title] > div { padding-bottom: 0.14em; margin-bottom: -0.14em; }
`;

export default function WelcomePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:ring-[3px] focus:ring-ring/50"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <HowItWorks />
        <FinalDecisions />
        <Features />
        <Security />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}
