'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Settings, Users, Sparkles, AlertCircle, Check, Mail } from 'lucide-react';

export default function WorkspaceSettings() {
  const { user, apiFetch } = useAuth();
  const [orgName, setOrgName] = useState('Acme IT Consulting');
  const [tier, setTier] = useState('Enterprise Tier');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Sales Engineer');
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      setInviteError("Please provide an email address.");
      return;
    }
    setInviteError('');
    setInviteSuccess(false);
    setInviting(true);

    try {
      // Simulate invitation API callback
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Seed a user in the local mock database if configured
      const localUsers = localStorage.getItem("salespilot_users") || "[]";
      const usersList = JSON.parse(localUsers);
      usersList.push({
        email: inviteEmail,
        role: inviteRole,
        orgId: user?.orgId || 'mock-org-123'
      });
      localStorage.setItem("salespilot_users", JSON.stringify(usersList));

      setInviteSuccess(true);
      setInviteEmail('');
    } catch (err: any) {
      setInviteError("Failed to invite team member.");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 font-sans">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-50">Workspace Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure tenant profiles, API quotas, and team invitations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile configs */}
        <div className="md:col-span-2 space-y-6">
          {/* Org Card */}
          <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl shadow-inner space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              <span>Organization Profile</span>
            </h3>
            
            <div className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-400 mb-1">Company Workspace Name</label>
                <input 
                  type="text" 
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-cyan-500 text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Subscription Level</label>
                  <input 
                    type="text" 
                    disabled 
                    value={tier}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Billing Interval</label>
                  <input 
                    type="text" 
                    disabled 
                    value="Annual Auto-renew"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Team Invitation */}
          <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl shadow-inner space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Invite Team Members</span>
            </h3>

            {inviteSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs">
                <Check className="w-4 h-4 shrink-0" />
                <span>Invitation email sent successfully!</span>
              </div>
            )}

            {inviteError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
              <div className="sm:col-span-2 relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="collaborator@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-cyan-500 text-slate-200"
                />
              </div>
              <div>
                <select 
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-cyan-500 text-slate-200"
                >
                  <option>Admin</option>
                  <option>Sales Engineer</option>
                  <option>Solution Architect</option>
                  <option>Viewer</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={inviting}
                className="sm:col-span-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-lg text-xs shadow-lg shadow-cyan-500/10 transition-colors"
              >
                {inviting ? "Sending Invite..." : "Send Invitation"}
              </button>
            </form>
          </div>
        </div>

        {/* Roles information side */}
        <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl shadow-inner space-y-5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Workspace RBAC Roles</span>
          </h3>
          
          <div className="space-y-4 text-xxs leading-relaxed text-slate-400">
            <div>
              <span className="font-bold text-slate-200 block text-xs mb-1">Admin</span>
              <span>Full read/write workspace access, billing config controls, deletion rights, and member invite credentials.</span>
            </div>
            <div>
              <span className="font-bold text-slate-200 block text-xs mb-1">Sales Engineer</span>
              <span>Can create solution folders, execute pricing engines, adjust budgets, and compile slide exports.</span>
            </div>
            <div>
              <span className="font-bold text-slate-200 block text-xs mb-1">Solution Architect</span>
              <span>Full permissions to draft tech solutions topology, write compliance forms, and run failure crash simulations.</span>
            </div>
            <div>
              <span className="font-bold text-slate-200 block text-xs mb-1">Viewer</span>
              <span>Read-only permissions. View visual diagrams and download PDF/Word proposals. Cannot change configs.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
