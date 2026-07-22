import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Workflow } from "@/components/landing/workflow";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";
import { ContactCTA } from "@/components/landing/contact-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <Features />
        <Workflow />
        <Pricing />
        <Testimonials />
        <FAQ />
        <ContactCTA />
      </main>
      <SiteFooter />
    </>
  );
}
