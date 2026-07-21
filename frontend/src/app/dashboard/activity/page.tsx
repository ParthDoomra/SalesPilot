'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Activity, Clock, Shield, Database, Plus, RefreshCw } from 'lucide-react';

export default function ActivityLog() {
  const { apiFetch } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = async () => {
    try {
      const data = await apiFetch('/projects/dashboard/analytics');
      setActivities(data.activities || []);
    } catch (e) {
      console.error("Failed to load activities logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-900 rounded-lg animate-pulse" />
        <div className="space-y-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-16 w-full bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const getIcon = (action: string) => {
    switch (action) {
      case 'CREATE_PROJECT': return <Plus className="w-4 h-4 text-green-400" />;
      case 'RUN_ARCHITECT': return <Database className="w-4 h-4 text-cyan-400" />;
      case 'UPDATE_PROJECT': return <RefreshCw className="w-4 h-4 text-blue-400" />;
      default: return <Shield className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-4xl space-y-6 font-sans">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">Activity Log</h1>
        <p className="text-slate-400 text-sm mt-1">Audit trail tracking all solution design transactions in this organization</p>
      </div>

      {/* Activity Log list */}
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-inner space-y-6">
        {activities.length === 0 ? (
          <div className="text-xs text-slate-500 italic text-center py-10">No recent workspace actions logged.</div>
        ) : (
          <div className="relative border-l border-slate-800 pl-6 ml-2 space-y-8">
            {activities.map((a: any) => (
              <div key={a.id} className="relative text-xs">
                {/* Node icon indicator */}
                <div className="absolute -left-[35px] top-0 w-7 h-7 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center shadow-lg">
                  {getIcon(a.action)}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{a.user}</span>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded uppercase">
                      {a.action}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">{a.details}</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold pt-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(a.timestamp * 1000).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
