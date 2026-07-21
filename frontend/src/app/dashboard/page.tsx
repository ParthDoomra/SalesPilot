'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  Sparkles, DollarSign, Folder, FileCheck, Users, 
  ArrowUpRight, Activity, Plus, Upload, Mic, Trash2 
} from 'lucide-react';

export default function Dashboard() {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchAnalytics = async () => {
      try {
        const res = await apiFetch('/projects/dashboard/analytics');
        setData(res);
      } catch (e) {
        console.error("Failed to load dashboard analytics:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [apiFetch]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-900 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-32 bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[350px] lg:col-span-2 bg-slate-900 rounded-xl animate-pulse" />
          <div className="h-[350px] bg-slate-900 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    teamMembers: 1,
    aiCredits: 500,
    totalSavings: 0
  };

  const recentProjects = data?.recentProjects || [];
  const activities = data?.activities || [];
  const costDistribution = data?.costDistribution || {};

  // Formulate data for Pie Chart
  const chartData = Object.entries(costDistribution)
    .map(([name, value]) => ({ name: name.toUpperCase(), value: value as number }))
    .filter(item => item.value > 0);

  const COLORS = ['#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">Enterprise Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Live metrics and presales intelligence reports</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur relative overflow-hidden group shadow-inner">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-cyan-500/5 blur-xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-4">
            <span>Total Projects</span>
            <Folder className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-50">{kpis.totalProjects}</div>
          <div className="text-xxs text-slate-500 mt-2 font-medium">Active workspaces initialized</div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur relative overflow-hidden group shadow-inner">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-4">
            <span>Completed Proposals</span>
            <FileCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-50">{kpis.completedProjects}</div>
          <div className="text-xxs text-slate-500 mt-2 font-medium">Finalized architectures</div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur relative overflow-hidden group shadow-inner">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-4">
            <span>Monthly Cost Savings</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-50">${kpis.totalSavings.toLocaleString()}</div>
          <div className="text-xxs text-slate-500 mt-2 font-medium">Saved via FinOps Negotiation</div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur relative overflow-hidden group shadow-inner">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-500/5 blur-xl group-hover:bg-purple-500/10 transition-colors pointer-events-none" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-4">
            <span>Organization Seats</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-50">{kpis.teamMembers}</div>
          <div className="text-xxs text-slate-500 mt-2 font-medium">Invited team members</div>
        </div>
      </div>

      {/* Analytics Visualization Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Solutions */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-inner">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-100 text-md flex items-center gap-2">
              <Folder className="w-5 h-5 text-cyan-400" />
              <span>Recent Architecture Solutions</span>
            </h3>
            <Link href="/dashboard/projects" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              <span>View History</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Project Name</th>
                  <th className="py-3.5 px-4">Client Company</th>
                  <th className="py-3.5 px-4">Budget / mo</th>
                  <th className="py-3.5 px-4">Target Cloud</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {recentProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">No solution projects found. Click &apos;New Architecture&apos; to initialize one.</td>
                  </tr>
                ) : (
                  recentProjects.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-200">{p.name}</td>
                      <td className="py-4 px-4 text-slate-400">{p.company}</td>
                      <td className="py-4 px-4 text-slate-300 font-medium">${p.budget.toLocaleString()}</td>
                      <td className="py-4 px-4"><span className="bg-slate-950 border border-slate-850 px-2.5 py-1 rounded text-xxs text-slate-400 font-bold">{p.preferredCloud}</span></td>
                      <td className="py-4 px-4">
                        <span className={`
                          px-2.5 py-1 rounded-full text-xxs font-bold
                          ${p.status === 'Finalized' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}
                        `}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link 
                          href={`/projects/${p.id}`} 
                          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-200 transition-colors font-semibold"
                        >
                          Workspace
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Cloud cost distribution */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 flex flex-col shadow-inner">
          <h3 className="font-bold text-slate-100 text-md flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-cyan-400" />
            <span>Infrastructure Billing (BOM)</span>
          </h3>

          <div className="flex-1 flex flex-col justify-center items-center h-[200px]">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} 
                    itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500 italic text-center">No cost distribution data available yet. Generate solutions to populate.</div>
            )}
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-2 gap-2 mt-4 text-[10px]">
            {chartData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="truncate">{item.name}: ${item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Logs Section */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-inner">
        <h3 className="font-bold text-slate-100 text-md flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-cyan-400" />
          <span>Workspace Activities</span>
        </h3>

        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
          {activities.length === 0 ? (
            <div className="text-xs text-slate-500 italic text-center py-6">No recent organization activities logged.</div>
          ) : (
            activities.map((a: any) => (
              <div key={a.id} className="flex items-start gap-4 text-xs">
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 text-xxs font-bold uppercase shrink-0 mt-0.5">
                  ACT
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-slate-200 truncate">{a.user}</span>
                    <span className="text-[10px] text-slate-500 shrink-0 font-medium">{new Date(a.timestamp * 1000).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-400 mt-1 leading-relaxed">{a.details}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
