'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, Folder, Settings, History, LogOut, Search, PlusCircle, 
  Menu, X, Sparkles, AlertCircle, ChevronRight, HelpCircle
} from 'lucide-react';
import CommandPalette from '@/components/CommandPalette';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, apiFetch } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  
  // New Project Form State
  const [clientName, setClientName] = useState('');
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('IT Services');
  const [country, setCountry] = useState('United States');
  const [budget, setBudget] = useState('150000');
  const [timeline, setTimeline] = useState('6 months');
  const [preferredCloud, setPreferredCloud] = useState('Azure');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Authenticated state checking
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Cmd+K listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        {/* Loading skeleton animation */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xl animate-pulse">
          S
        </div>
        <span className="text-xs text-slate-500 mt-4 tracking-widest uppercase">Loading SalesPilot Workspace...</span>
      </div>
    );
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !company) {
      setFormError("Please fill out client name and company name.");
      return;
    }
    setFormError('');
    setFormLoading(true);
    try {
      const data = await apiFetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${company} Solution Proposal`,
          clientName,
          company,
          industry,
          country,
          budget: parseFloat(budget) || 0.0,
          timeline,
          preferredCloud,
          description: description || "Workspace Ingestion Solution"
        })
      });
      setNewProjectOpen(false);
      
      // Reset form
      setClientName('');
      setCompany('');
      setDescription('');
      
      // Redirect directly to the project workspace page
      router.push(`/projects/${data.id}`);
    } catch (e: any) {
      setFormError(e.message || "Failed to create project.");
    } finally {
      setFormLoading(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Solutions History', href: '/dashboard/projects', icon: Folder },
    { name: 'Activity Log', href: '/dashboard/activity', icon: History },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  // Derive breadcrumbs based on pathname
  const pathParts = pathname.split('/').filter(p => p);
  const breadcrumb = pathParts.map((part, index) => {
    const href = '/' + pathParts.slice(0, index + 1).join('/');
    const name = part.charAt(0).toUpperCase() + part.slice(1);
    return { name, href };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800/80 p-5 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 lg:static
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-md shadow-lg shadow-cyan-500/20">
                S
              </div>
              <span className="font-bold text-slate-100 tracking-wide text-md">SalesPilot AI</span>
            </Link>
            <button className="lg:hidden p-1 text-slate-400 hover:text-slate-200" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Create Solution */}
          <button 
            onClick={() => setNewProjectOpen(true)}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-500/10"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Architecture</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all duration-150
                    ${active 
                      ? 'bg-slate-800 text-slate-50 border-l-2 border-cyan-400 pl-3 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }
                  `}
                >
                  <item.icon className={`w-4 h-4 ${active ? 'text-cyan-400' : ''}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card footer */}
        <div className="border-t border-slate-850 pt-5 space-y-4">
          <div className="flex items-center gap-3 px-1.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-slate-100 text-sm">
              {user.displayName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-slate-200 truncate">{user.displayName}</span>
              <span className="text-xxs text-cyan-400 font-medium tracking-wider uppercase mt-0.5">{user.role}</span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full text-left px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-850 flex items-center gap-3 text-sm transition-colors text-red-400 hover:bg-red-950/20"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Navigation Bar */}
        <header className="h-16 border-b border-slate-850 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur sticky top-0 z-30">
          {/* Left: Breadcrumbs & Mobile Trigger */}
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1 text-slate-400 hover:text-slate-200" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5.5 h-5.5" />
            </button>
            
            {/* Breadcrumb renderer */}
            <nav className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
              <Link href="/dashboard" className="hover:text-slate-200">SalesPilot</Link>
              {breadcrumb.map((bc, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <Link href={bc.href} className={`hover:text-slate-200 ${idx === breadcrumb.length - 1 ? 'text-slate-100 font-semibold' : ''}`}>
                    {bc.name}
                  </Link>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: Search, AI credits & Shortcuts */}
          <div className="flex items-center gap-4">
            {/* Cmd+K trigger search block */}
            <button 
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 hover:border-slate-800 transition-colors text-xs text-slate-500 font-medium"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Search dashboard...</span>
              <kbd className="bg-slate-950 border border-slate-800 text-[10px] px-1.5 py-0.5 rounded font-mono text-slate-400">⌘K</kbd>
            </button>

            {/* AI Credits Badge */}
            <div className="inline-flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1.5 rounded-full text-xs font-semibold text-cyan-400 shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>500 Credits</span>
            </div>
          </div>
        </header>

        {/* Dynamic child content routing layout */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Command Palette component */}
      <CommandPalette 
        isOpen={paletteOpen} 
        onClose={() => setPaletteOpen(false)} 
        onOpenNewProject={() => setNewProjectOpen(true)} 
      />

      {/* New Project Scaffolding Modal */}
      {newProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setNewProjectOpen(false)}></div>
          
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative z-10 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <span>Initialize Presales solution</span>
              </h3>
              <button onClick={() => setNewProjectOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Client Contact Name</label>
                  <input 
                    type="text" 
                    value={clientName} 
                    onChange={e => setClientName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Company / Organization</label>
                  <input 
                    type="text" 
                    value={company} 
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Cyberdyne Systems"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Industry Vertical</label>
                <select 
                  value={industry} 
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option>Finance & Banking</option>
                  <option>Healthcare</option>
                  <option>Retail & E-commerce</option>
                  <option>IT Services</option>
                  <option>Manufacturing</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Target Budget Cap (INR/mo)</label>
                  <input 
                    type="number" 
                    value={budget} 
                    onChange={e => setBudget(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Project Delivery Timeline</label>
                  <input 
                    type="text" 
                    value={timeline} 
                    onChange={e => setTimeline(e.target.value)}
                    placeholder="e.g. 3 months"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setNewProjectOpen(false)}
                  className="w-1/2 bg-slate-950 hover:bg-slate-900 border border-slate-800 py-3 rounded-lg text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={formLoading}
                  className="w-1/2 bg-cyan-500 text-slate-950 font-bold py-3 rounded-lg hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/10 flex items-center justify-center"
                >
                  {formLoading ? "Creating..." : "Create Solution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
