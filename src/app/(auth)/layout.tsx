import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { SchematicPipeline } from "@/components/landing/schematic-pipeline";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 md:w-1/2 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 inline-flex">
            <Logo />
          </Link>
          {children}
        </div>
      </div>
      <div className="schema-grid relative hidden w-1/2 items-center justify-center border-l border-border-subtle bg-surface/40 md:flex">
        <div className="max-w-md px-10">
          <SchematicPipeline />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Requirements to priced proposal — structured, versioned, and ready to export.
          </p>
        </div>
      </div>
    </div>
  );
}
