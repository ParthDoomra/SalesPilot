import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactCTA() {
  return (
    <section id="contact" className="border-b border-border-subtle py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Give your next proposal a head start
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Start free, or book time with our team to see SalesPilot on a deal like yours.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <a href="mailto:hello@salespilot.example">Book a demo</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
