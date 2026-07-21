'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Folder, Home, PlusCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewProject: () => void;
}

export default function CommandPalette({ isOpen, onClose, onOpenNewProject }: CommandPaletteProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch project names from backend dynamically
    const fetchProjects = async () => {
      try {
        const storedUser = localStorage.getItem("salespilot_mock_user");
        const token = storedUser ? JSON.parse(storedUser).token : "";
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (e) {
        console.error("Failed to load projects inside Command Palette:", e);
      }
    };
    fetchProjects();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.company.toLowerCase().includes(query.toLowerCase())
  );

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Dialog box */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search header */}
        <div className="flex items-center px-4 border-b border-slate-850 bg-slate-950/40">
          <Search className="w-5 h-5 text-slate-500 mr-3" />
          <input 
            type="text" 
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, navigate pages or run commands... (Esc to close)"
            className="w-full h-12 bg-transparent text-slate-200 placeholder:text-slate-500 text-sm outline-none"
          />
        </div>

        {/* Results Body */}
        <div className="max-h-[350px] overflow-y-auto p-2 space-y-4">
          {/* Quick links */}
          <div>
            <div className="px-3 py-1.5 text-xxs font-bold text-slate-500 uppercase tracking-widest">Navigation</div>
            <div className="space-y-0.5 mt-1">
              <button 
                onClick={() => navigateTo('/dashboard')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-slate-800 flex items-center gap-3 text-sm transition-colors"
              >
                <Home className="w-4 h-4 text-cyan-400" />
                <span>Jump to Dashboard Home</span>
              </button>
              <button 
                onClick={() => { onClose(); onOpenNewProject(); }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-slate-800 flex items-center gap-3 text-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                <span>Create New Solution Project</span>
              </button>
            </div>
          </div>

          {/* Projects lists */}
          <div>
            <div className="px-3 py-1.5 text-xxs font-bold text-slate-500 uppercase tracking-widest">Projects ({filteredProjects.length})</div>
            <div className="space-y-0.5 mt-1">
              {filteredProjects.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500 italic">No matching projects found.</div>
              ) : (
                filteredProjects.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => navigateTo(`/projects/${p.id}`)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-slate-300 hover:text-slate-100 hover:bg-slate-800 flex items-center gap-3 text-sm transition-colors"
                  >
                    <Folder className="w-4 h-4 text-purple-400" />
                    <div className="flex flex-col">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xxs text-slate-500">{p.company} • {p.preferredCloud}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* System settings */}
          <div>
            <div className="px-3 py-1.5 text-xxs font-bold text-slate-500 uppercase tracking-widest">System</div>
            <div className="space-y-0.5 mt-1">
              <button 
                onClick={logout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center gap-3 text-sm transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
