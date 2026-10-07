import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs">
        <Compass className="size-6" aria-hidden />
      </div>
      <h1 className="mt-6 text-2xl leading-8 font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-pretty text-muted-foreground">
        The page you’re looking for doesn’t exist or may have moved. Error 404.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">
          <ArrowLeft />
          Back to dashboard
        </Link>
      </Button>
    </main>
  );
}
