'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, Sparkles, DollarSign, Activity, FileText, ArrowRight } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen bg-slate-950 overflow-hidden text-slate-100 font-sans">
      {/* Background radial gradient mesh */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Navigation header */}
      <header className="border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg shadow-cyan-500/20">
              S
            </div>
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-slate-50 via-slate-100 to-slate-400 bg-clip-text text-transparent">
              SalesPilot AI
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Link 
                href="/dashboard" 
                className="text-sm font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-lg transition-all"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="text-sm font-medium hover:text-cyan-400 transition-colors"
                >
                  Log In
                </Link>
                <Link 
                  href="/auth/register" 
                  className="text-sm font-medium bg-cyan-500 text-slate-950 hover:bg-cyan-400 px-4 py-2 rounded-lg font-semibold transition-all shadow-lg shadow-cyan-500/10"
                >
                  Start Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center justify-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-full text-xs font-medium text-cyan-400 mb-8 backdrop-blur shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Presales Automation Platform</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight mb-8">
          The AI-Powered{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Presales Engineer
          </span>{" "}
          for Enterprise SaaS
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          Draft solution architectures, pull live cloud costs, run automated disaster simulations, and compile client-ready PPTX slides in under 10 minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center mb-24">
          <Link 
            href={user ? "/dashboard" : "/auth/register"} 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold px-8 py-4 rounded-xl transition-transform hover:scale-[1.02] shadow-xl shadow-cyan-500/15"
          >
            <span>Get Started for Free</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="/auth/login"
            className="w-full sm:w-auto inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-800/80 px-8 py-4 rounded-xl font-semibold transition-all"
          >
            Talk to Sales
          </Link>
        </div>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-sm hover:border-slate-700/80 transition-all text-left shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-100">Solution Architect Agent</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Claude converts unstructured RFPs or client chat dialogs into optimized cloud architectures and robust tech stack justifications.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-sm hover:border-slate-700/80 transition-all text-left shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-100">Live Azure Pricing API</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Skip static spreadsheets. Query live cloud catalogues with cached Redis fallbacks to compute dynamic bill of materials (BOM).
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-sm hover:border-slate-700/80 transition-all text-left shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-100">Resilience Chaos Audit</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Simulate database corruptions, region failures, and traffic spikes to report business impact, data loss RPO, and RTO downtime metrics.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 relative z-10 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div>© 2026 SalesPilot AI. All rights reserved. Built for modern presales.</div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Security Certs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
