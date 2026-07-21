'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Folder, Search, Trash2, ArrowUpRight, Cloud, DollarSign } from 'lucide-react';

export default function SolutionsHistory() {
  const { apiFetch } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const loadProjects = async () => {
    try {
      const data = await apiFetch('/projects');
      setProjects(data);
    } catch (e) {
      console.error("Failed to load projects list:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project and all associated design reports?")) return;
    try {
      await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (e) {
      console.error("Failed to delete project:", e);
      alert("Failed to delete project solution.");
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.company.toLowerCase().includes(query.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-900 rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-slate-900 rounded-lg animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-20 bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">Solutions History</h1>
        <p className="text-slate-400 text-sm mt-1">Audit and manage the catalog of architecture proposals</p>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter proposals by project title or client company..."
          className="w-full bg-slate-900/40 border border-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-xs outline-none focus:border-cyan-500 text-slate-200 placeholder:text-slate-500"
        />
      </div>

      {/* Project list container */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="bg-slate-900/10 border border-slate-900 rounded-2xl py-16 text-center text-slate-500 italic text-xs">
            No solution proposals found matching search parameters.
          </div>
        ) : (
          filteredProjects.map((p) => (
            <div 
              key={p.id} 
              className="bg-slate-900/30 border border-slate-800/80 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700/60 transition-all shadow-inner"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-slate-100 text-sm truncate">{p.name}</span>
                  <span className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {p.preferredCloud}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xxs text-slate-500 font-medium">
                  <span>Client: <span className="text-slate-300 font-bold">{p.clientName}</span> at {p.company}</span>
                  <span>•</span>
                  <span>Budget: <span className="text-slate-300 font-semibold">${p.budget.toLocaleString()}/mo</span></span>
                  <span>•</span>
                  <span>Created: <span className="text-slate-400">{new Date(p.createdAt * 1000).toLocaleDateString()}</span></span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <Link 
                  href={`/projects/${p.id}`}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-4 py-2.5 rounded-lg text-xs font-bold text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <span>Open Workspace</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <button 
                  onClick={() => handleDelete(p.id)}
                  className="bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg text-red-400 hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
