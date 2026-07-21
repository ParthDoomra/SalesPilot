'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  Sparkles, DollarSign, Shield, Activity, FileText, ChevronRight,
  Mic, MicOff, Upload, FileUp, ListTodo, Plus, Info, Check, AlertTriangle,
  Play, RefreshCw, Download, ArrowLeft, Layers, Server, Database, Network
} from 'lucide-react';

interface ProjectDetail {
  id: string;
  name: string;
  clientName: string;
  company: string;
  budget: number;
  timeline: string;
  preferredCloud: string;
  status: string;
  requirements?: any;
  architecture?: any;
  pricing?: any;
  negotiation?: any;
  resilience?: any;
  proposal?: any;
  presentation?: any;
}

export default function ProjectWorkspace() {
  const { projectId } = useParams() as { projectId: string };
  const { apiFetch, user } = useAuth();
  const router = useRouter();
  
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requirements' | 'architecture' | 'pricing' | 'negotiation' | 'resilience' | 'proposal'>('requirements');
  const [reqMethod, setReqMethod] = useState<'form' | 'voice' | 'upload'>('form');

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: "Hello! I am your AI Solution Architect. Let's gather your cloud requirement specs. What cloud provider do you prefer (Azure, AWS, GCP) and do you have any budget cap?" }
  ]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Form State
  const [industry, setIndustry] = useState('IT Services');
  const [prefCloud, setPrefCloud] = useState('Azure');
  const [usersCount, setUsersCount] = useState(5000);
  const [storageGb, setStorageGb] = useState(100);
  const [compliance, setCompliance] = useState<string[]>(['SOC2']);
  const [modules, setModules] = useState<string[]>(['Authentication', 'Core API', 'Storage']);
  const [dbType, setDbType] = useState('Relational (PostgreSQL)');
  const [availability, setAvailability] = useState('99.9% High Availability');
  const [security, setSecurity] = useState('SSL/TLS Encryption');
  const [traffic, setTraffic] = useState('Average workload');
  
  // Pipeline Loaders
  const [pipelineLoading, setPipelineLoading] = useState<string | null>(null);

  // Load project initially
  const loadProject = async () => {
    try {
      const data = await apiFetch(`/projects/${projectId}`);
      setProject(data);
      
      // Auto populate form details if requirements already exist
      if (data.requirements) {
        const req = data.requirements;
        setIndustry(req.industry || 'IT Services');
        setPrefCloud(req.preferredCloud || 'Azure');
        setUsersCount(req.usersCount || 5000);
        setStorageGb(req.storageGb || 100);
        setCompliance(req.compliance || ['SOC2']);
        setModules(req.modules || ['Auth', 'Core API']);
        setDbType(req.databaseType || 'Relational (PostgreSQL)');
        setAvailability(req.availability || '99.9%');
        setSecurity(req.security || 'SSL/TLS');
        setTraffic(req.traffic || 'Average');
      }
    } catch (e) {
      console.error("Failed to load project solution details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  // Voice Recording Initializers (Browser Speech API)
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please type your requirements.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    
    rec.onstart = () => setIsRecording(true);
    rec.onerror = (e: any) => console.error("Speech Recognition Error:", e);
    rec.onend = () => setIsRecording(false);
    
    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleSendVoiceTurn = async () => {
    if (!transcript) return;
    setVoiceLoading(true);
    
    const newHistory = [...chatHistory, { role: 'user' as const, content: transcript }];
    setChatHistory(newHistory);
    setTranscript('');
    
    try {
      const res = await apiFetch('/agents/voice-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript,
          chatHistory: newHistory
        })
      });
      
      if (res.isComplete && res.requirements) {
        // Automatically save requirements
        await apiFetch(`/agents/save-requirements/${projectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            industry: 'IT Services',
            preferredCloud: res.requirements.preferredCloud || 'Azure',
            usersCount: res.requirements.usersCount || 5000,
            storageGb: res.requirements.storageGb || 100,
            compliance: res.requirements.compliance || ['SOC2'],
            modules: res.requirements.modules || ['Auth', 'Core API'],
            databaseType: res.requirements.databaseType || 'PostgreSQL',
            availability: res.requirements.availability || '99.9%',
            security: res.requirements.security || 'TLS',
            traffic: res.requirements.traffic || 'Average'
          })
        });
        
        setChatHistory([...newHistory, { role: 'assistant', content: "Requirements compiled successfully! You can now generate the cloud architecture under the next tab." }]);
        loadProject();
      } else {
        setChatHistory([...newHistory, { role: 'assistant', content: res.message }]);
      }
    } catch (e) {
      console.error("Voice step error:", e);
    } finally {
      setVoiceLoading(false);
    }
  };

  // RFP file upload handler
  const handleRfpUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadLoading(true);
    
    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      // Use standard fetch here because of FormData boundary requirements
      const storedUser = localStorage.getItem("salespilot_mock_user");
      const token = storedUser ? JSON.parse(storedUser).token : "";
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/agents/rfp-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error("RFP upload extraction failed.");
      const data = await res.json();
      
      // Save requirements parsed
      await apiFetch(`/agents/save-requirements/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.requirements)
      });
      
      setReqMethod('form');
      loadProject();
      alert("RFP requirements analyzed and extracted successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to analyze RFP file.");
    } finally {
      setUploadLoading(false);
    }
  };

  // Manual Form save
  const handleSaveForm = async () => {
    setPipelineLoading("requirements");
    try {
      await apiFetch(`/agents/save-requirements/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry,
          preferredCloud: prefCloud,
          usersCount,
          storageGb,
          compliance,
          modules,
          databaseType: dbType,
          availability,
          security,
          traffic
        })
      });
      await loadProject();
      alert("Project requirements saved successfully.");
    } catch (e) {
      console.error(e);
    } finally {
      setPipelineLoading(null);
    }
  };

  // Execute Architect Agent
  const runArchitect = async () => {
    setPipelineLoading("architect");
    try {
      await apiFetch(`/agents/architect/${projectId}`, { method: 'POST' });
      await loadProject();
    } catch (e) {
      console.error(e);
    } finally {
      setPipelineLoading(null);
    }
  };

  // Execute Pricing Engine
  const runPricing = async () => {
    setPipelineLoading("pricing");
    try {
      await apiFetch(`/agents/calculate-pricing/${projectId}`, { method: 'POST' });
      await loadProject();
    } catch (e) {
      console.error(e);
    } finally {
      setPipelineLoading(null);
    }
  };

  // Execute Negotiation Optimizer
  const runNegotiation = async () => {
    setPipelineLoading("negotiation");
    try {
      await apiFetch(`/agents/negotiate/${projectId}`, { method: 'POST' });
      await loadProject();
    } catch (e) {
      console.error(e);
    } finally {
      setPipelineLoading(null);
    }
  };

  // Execute Resilience Simulation
  const runResilience = async () => {
    setPipelineLoading("resilience");
    try {
      await apiFetch(`/agents/simulate-failures/${projectId}`, { method: 'POST' });
      await loadProject();
    } catch (e) {
      console.error(e);
    } finally {
      setPipelineLoading(null);
    }
  };

  // Compile PDF/DOCX/PPTX downloads
  const runDocumentGenerations = async () => {
    setPipelineLoading("proposal");
    try {
      await apiFetch(`/agents/generate-documents/${projectId}`, { method: 'POST' });
      await loadProject();
    } catch (e) {
      console.error(e);
    } finally {
      setPipelineLoading(null);
    }
  };

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xl animate-pulse">
          S
        </div>
        <span className="text-xs text-slate-500 mt-4 tracking-widest uppercase animate-pulse">Retrieving Solution State...</span>
      </div>
    );
  }

  // Cost items configurations
  const costBreakdown = project.pricing?.breakdown || {};
  const monthlyTotal = project.pricing?.monthlyTotal || 0.0;
  const annualTotal = project.pricing?.annualTotal || 0.0;

  const chartData = Object.entries(costBreakdown)
    .map(([name, value]) => ({ name: name.toUpperCase(), value: value as number }))
    .filter(item => item.value > 0);

  const COLORS = ['#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div className="space-y-1.5">
          <button 
            onClick={() => router.push('/dashboard/projects')}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Solutions History</span>
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">{project.name}</h1>
          <p className="text-slate-400 text-xs font-medium">
            Client: <span className="text-slate-200 font-bold">{project.clientName}</span> at {project.company} | Cloud: <span className="text-cyan-400">{project.preferredCloud}</span>
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-850 px-4 py-2 rounded-xl text-xs font-bold text-slate-300">
            Budget Cap: <span className="text-slate-50">${project.budget.toLocaleString()}/mo</span>
          </div>
          <span className={`
            px-3 py-1.5 rounded-full text-xs font-bold
            ${project.status === 'Finalized' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}
          `}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-2 border-b border-slate-850 overflow-x-auto pb-px">
        {[
          { id: 'requirements', label: '1. Requirements', icon: ListTodo },
          { id: 'architecture', label: '2. Architecture', icon: Layers, locked: !project.requirements },
          { id: 'pricing', label: '3. Cloud Pricing', icon: DollarSign, locked: !project.architecture },
          { id: 'negotiation', label: '4. FinOps Negotiation', icon: RefreshCw, locked: !project.pricing },
          { id: 'resilience', label: '5. Resilience Sim', icon: Shield, locked: !project.architecture },
          { id: 'proposal', label: '6. Proposals Center', icon: FileText, locked: !project.pricing }
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              disabled={tab.locked}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs whitespace-nowrap transition-all duration-150
                ${tab.locked 
                  ? 'text-slate-600 border-transparent cursor-not-allowed'
                  : active 
                    ? 'border-cyan-400 text-slate-50' 
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: Requirements Gathering */}
      {activeTab === 'requirements' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Method Selection side */}
          <div className="space-y-2">
            {[
              { id: 'form', label: 'Smart Dynamic Form', icon: ListTodo },
              { id: 'voice', label: 'AI Voice Session', icon: Mic },
              { id: 'upload', label: 'Upload Client RFP', icon: Upload }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setReqMethod(m.id as any)}
                className={`
                  w-full text-left px-4 py-3 rounded-xl border text-xs font-bold transition-all duration-150 flex items-center gap-3
                  ${reqMethod === m.id 
                    ? 'bg-slate-900 border-cyan-400/40 text-slate-100' 
                    : 'bg-transparent border-slate-850 hover:bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }
                `}
              >
                <m.icon className="w-4 h-4 shrink-0" />
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Form Wizard center */}
          <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-inner relative">
            {reqMethod === 'form' && (
              <div className="space-y-6 text-xs font-medium">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-slate-100">Requirements Specification Sheet</h3>
                  <button 
                    onClick={handleSaveForm}
                    disabled={pipelineLoading === "requirements"}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-lg font-bold transition-colors"
                  >
                    {pipelineLoading === "requirements" ? "Saving..." : "Save Configuration"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-400 mb-1">Target Cloud Provider</label>
                    <select value={prefCloud} onChange={e => setPrefCloud(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-cyan-500 text-slate-200">
                      <option>Azure</option>
                      <option>AWS</option>
                      <option>GCP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Database Model Preference</label>
                    <input type="text" value={dbType} onChange={e => setDbType(e.target.value)} placeholder="e.g. Relational (PostgreSQL)" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-cyan-500 text-slate-200" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-400 mb-1">Estimated Concurrent Users</label>
                    <input type="number" value={usersCount} onChange={e => setUsersCount(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-cyan-500 text-slate-200" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Storage Demand (GB)</label>
                    <input type="number" value={storageGb} onChange={e => setStorageGb(parseInt(e.target.value) || 0)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-cyan-500 text-slate-200" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5">Compliance Requirements</label>
                  <div className="flex gap-4">
                    {['SOC2', 'GDPR', 'HIPAA', 'PCI-DSS'].map((c) => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input 
                          type="checkbox" 
                          checked={compliance.includes(c)}
                          onChange={() => {
                            if (compliance.includes(c)) setCompliance(compliance.filter(i => i !== c));
                            else setCompliance([...compliance, c]);
                          }}
                          className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {reqMethod === 'voice' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-cyan-400" />
                    <span>Solution Architect Gathering Session</span>
                  </h3>
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`
                      px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all
                      ${isRecording 
                        ? 'bg-red-950/20 border-red-500 text-red-400 animate-pulse' 
                        : 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-200'
                      }
                    `}
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isRecording ? "Recording Microphone..." : "Speak Into Mic"}</span>
                  </button>
                </div>

                {/* Conversation Panel */}
                <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 h-[250px] overflow-y-auto space-y-4">
                  {chatHistory.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`
                        p-3 rounded-lg text-xs leading-relaxed max-w-[80%]
                        ${msg.role === 'assistant' 
                          ? 'bg-slate-900 text-slate-300 mr-auto' 
                          : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 ml-auto'
                        }
                      `}
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>

                {/* Input Controls */}
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    placeholder={isRecording ? "Listening to microphone input..." : "Type solution parameters or speak..."}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-xs outline-none focus:border-cyan-500"
                  />
                  <button 
                    onClick={handleSendVoiceTurn}
                    disabled={voiceLoading || !transcript}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 rounded-lg text-xs shrink-0"
                  >
                    {voiceLoading ? "AI Thinking..." : "Send Turn"}
                  </button>
                </div>
              </div>
            )}

            {reqMethod === 'upload' && (
              <form onSubmit={handleRfpUpload} className="space-y-8 flex flex-col justify-center items-center py-8">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <FileUp className="w-8 h-8" />
                </div>
                
                <div className="text-center space-y-2">
                  <h4 className="font-bold text-slate-100 text-sm">Drag and Drop Client RFP document</h4>
                  <p className="text-slate-500 text-xs">Accepts PDF, Word (docx) or raw Text (txt) catalogs up to 10MB</p>
                </div>

                <div className="w-full max-w-sm">
                  <input 
                    type="file" 
                    accept=".pdf,.docx,.txt"
                    onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-400"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={uploadLoading || !uploadFile}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-8 py-3 rounded-lg font-bold text-xs transition-colors shadow-lg shadow-cyan-500/10"
                >
                  {uploadLoading ? "Extracting Requirements..." : "Analyze Document"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Architecture Designer */}
      {activeTab === 'architecture' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-50">Enterprise Solution Topology</h2>
              <p className="text-slate-400 text-xs mt-1">Multi-tier service mapper built from project requirements</p>
            </div>
            <button 
              onClick={runArchitect}
              disabled={pipelineLoading === "architect"}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pipelineLoading === 'architect' ? 'animate-spin' : ''}`} />
              <span>{project.architecture ? "Re-Generate Architecture" : "Generate Cloud Architecture"}</span>
            </button>
          </div>

          {!project.architecture ? (
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
              <Layers className="w-12 h-12 text-slate-500" />
              <h3 className="font-bold text-slate-200 text-sm">Solution architecture not generated yet</h3>
              <p className="text-slate-500 text-xs max-w-sm">Trigger the Solution Architect Agent to build a dynamic blueprint containing frontend, backend, databases, queues, and Monitoring.</p>
              <button onClick={runArchitect} className="bg-slate-900 border border-slate-800 px-6 py-2.5 rounded-lg text-xs text-slate-200 hover:bg-slate-850">
                Trigger Architect Agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Flow Topology Node Visualizer */}
              <div className="lg:col-span-2 bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-inner">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">Service Integration Pipeline</h3>
                
                {/* Node graph representation using CSS */}
                <div className="flex flex-col items-center gap-6 py-4">
                  {/* Row 1: Edge CDN */}
                  <div className="w-[180px] bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-2 justify-center shadow-lg">
                    <Network className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-bold">Azure Front Door / CDN</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800 animate-pulse"></div>

                  {/* Row 2: API Gateway */}
                  <div className="w-[180px] bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-2 justify-center shadow-lg">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] font-bold">API Management</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800 animate-pulse"></div>

                  {/* Row 3: Backend Services */}
                  <div className="w-[200px] bg-slate-900 border border-cyan-500/20 p-4 rounded-xl flex items-center gap-3 justify-center shadow-lg relative">
                    <div className="absolute inset-0 bg-cyan-500/5 blur-sm rounded-xl"></div>
                    <Server className="w-4 h-4 text-cyan-400 relative z-10" />
                    <div className="flex flex-col relative z-10">
                      <span className="text-[10px] font-extrabold text-cyan-400">Compute VM Nodes</span>
                      <span className="text-[9px] text-slate-500 font-semibold">{project.architecture.pricingSpec?.compute?.sku} x {project.architecture.pricingSpec?.compute?.quantity}</span>
                    </div>
                  </div>
                  
                  {/* Splits */}
                  <div className="w-[240px] flex items-center justify-between px-10">
                    <div className="w-px h-8 bg-slate-800"></div>
                    <div className="w-px h-8 bg-slate-800"></div>
                  </div>

                  {/* Row 4: Databases and Cache */}
                  <div className="flex gap-6 w-full justify-center">
                    <div className="w-[140px] bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-2 justify-center shadow-lg">
                      <Database className="w-4 h-4 text-purple-400" />
                      <span className="text-[9px] font-bold">Relational DB</span>
                    </div>
                    <div className="w-[140px] bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center gap-2 justify-center shadow-lg">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      <span className="text-[9px] font-bold">Redis Cache</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rationale accordion list */}
              <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-inner space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Architectural Rationale</h3>
                
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 text-xs">
                  {Object.entries(project.architecture.techStack || {}).map(([key, value]: any) => (
                    <div key={key} className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 capitalize">{key}</span>
                        <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-900/20">{value.service}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{value.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: Cloud Pricing & BOM */}
      {activeTab === 'pricing' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-50">Infrastructure Bill of Materials (BOM)</h2>
              <p className="text-slate-400 text-xs mt-1">Live estimations fetched from Cloud Pricing registries</p>
            </div>
            <button 
              onClick={runPricing}
              disabled={pipelineLoading === "pricing"}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pipelineLoading === 'pricing' ? 'animate-spin' : ''}`} />
              <span>{project.pricing ? "Recalculate Pricing" : "Query Azure Pricing API"}</span>
            </button>
          </div>

          {!project.pricing ? (
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
              <DollarSign className="w-12 h-12 text-slate-500" />
              <h3 className="font-bold text-slate-200 text-sm">pricing estimate not calculated</h3>
              <p className="text-slate-500 text-xs max-w-sm">Query Azure Retail Pricing to compute VMs, DBMS, caches, and token charges.</p>
              <button onClick={runPricing} className="bg-slate-900 border border-slate-800 px-6 py-2.5 rounded-lg text-xs text-slate-200 hover:bg-slate-850">
                Calculate Pricing
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Summary totals & table details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Cost banners */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-inner">
                    <div className="text-slate-500 text-xxs font-bold uppercase tracking-wider mb-2">Monthly Cost Total</div>
                    <div className="text-3xl font-extrabold text-cyan-400">${monthlyTotal.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 mt-2 font-medium">Billed dynamically on Azure Consumption</div>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-inner">
                    <div className="text-slate-500 text-xxs font-bold uppercase tracking-wider mb-2">Annualized Cost Total</div>
                    <div className="text-3xl font-extrabold text-slate-50">${annualTotal.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 mt-2 font-medium">Estimated monthly billing * 12</div>
                  </div>
                </div>

                {/* BOM details table */}
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-inner">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Pricing breakdown sheet</h3>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-2">Resource Category</th>
                        <th className="py-3 px-2 text-right">Estimated Cost / mo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {Object.entries(costBreakdown).map(([cat, val]: any) => (
                        <tr key={cat}>
                          <td className="py-3 px-2 font-bold capitalize text-slate-300">{cat}</td>
                          <td className="py-3 px-2 text-right font-semibold text-slate-100">${val.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Pie Chart visualization */}
              <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 flex flex-col shadow-inner justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">Expense distribution</h3>
                
                <div className="flex-1 flex justify-center items-center h-[200px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} 
                          itemStyle={{ color: '#f8fafc', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-slate-500 italic text-xs">No chart metrics available</span>
                  )}
                </div>

                <div className="space-y-1.5 mt-6">
                  {chartData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-xxs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-200">${item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: Cost Negotiation Panel */}
      {activeTab === 'negotiation' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-50">FinOps Architecture Optimization</h2>
              <p className="text-slate-400 text-xs mt-1">AI-driven architectural adjustments to meet budget guidelines</p>
            </div>
            <button 
              onClick={runNegotiation}
              disabled={pipelineLoading === "negotiation"}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pipelineLoading === 'negotiation' ? 'animate-spin' : ''}`} />
              <span>{project.negotiation ? "Re-Optimize System" : "Optimize Solution Costs"}</span>
            </button>
          </div>

          {!project.negotiation ? (
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
              <RefreshCw className="w-12 h-12 text-slate-500" />
              <h3 className="font-bold text-slate-200 text-sm">FinOps optimization report not run</h3>
              <p className="text-slate-500 text-xs max-w-sm">If computed cloud budgets surpass target client limits, trigger Claude to design tier downscaling suggestions and list SLAs trade-offs.</p>
              <button onClick={runNegotiation} className="bg-slate-900 border border-slate-800 px-6 py-2.5 rounded-lg text-xs text-slate-200 hover:bg-slate-850">
                Trigger Cost Optimization
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cost differences */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/40 border border-slate-800/85 p-5 rounded-2xl">
                  <span className="text-slate-500 text-xxs font-bold uppercase tracking-wider block mb-1">Original Invoice Cost</span>
                  <span className="text-xl font-extrabold text-slate-400">${project.negotiation.originalCost}/mo</span>
                </div>
                <div className="bg-cyan-500/5 border border-cyan-500/10 p-5 rounded-2xl relative">
                  <div className="absolute inset-0 bg-cyan-500/[0.02] blur-sm rounded-2xl"></div>
                  <span className="text-cyan-400 text-xxs font-bold uppercase tracking-wider block mb-1 relative z-10">Optimized Solutions Cost</span>
                  <span className="text-xl font-extrabold text-cyan-400 relative z-10">${project.negotiation.optimizedCost}/mo</span>
                </div>
                <div className="bg-green-500/5 border border-green-500/10 p-5 rounded-2xl relative">
                  <div className="absolute inset-0 bg-green-500/[0.02] blur-sm rounded-2xl"></div>
                  <span className="text-green-400 text-xxs font-bold uppercase tracking-wider block mb-1 relative z-10">Net Monthly Savings</span>
                  <span className="text-xl font-extrabold text-green-400 relative z-10">${project.negotiation.savings}/mo</span>
                </div>
              </div>

              {/* Recommendation card */}
              <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">FinOps Negotiation Strategy</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{project.negotiation.recommendation}</p>
              </div>

              {/* Modifications grid */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Proposed tier modifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {project.negotiation.modifications?.map((mod: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="font-bold text-slate-200 text-xs">{mod.component}</span>
                        <span className="text-green-400 text-xxs font-bold bg-green-950/40 border border-green-900/20 px-2.5 py-0.5 rounded">Saves {mod.savings}</span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed"><span className="text-cyan-400 font-semibold">Tweak:</span> {mod.suggestion}</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed"><span className="text-red-400/80 font-semibold">Trade-off:</span> {mod.tradeOff}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 5: Resilience & Recovery Simulator */}
      {activeTab === 'resilience' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-50">Resilience Chaos Simulation Audit</h2>
              <p className="text-slate-400 text-xs mt-1">Disaster failover evaluations and service recovery metrics</p>
            </div>
            <button 
              onClick={runResilience}
              disabled={pipelineLoading === "resilience"}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/10"
            >
              <Play className={`w-3.5 h-3.5 ${pipelineLoading === 'resilience' ? 'animate-spin' : ''}`} />
              <span>{project.resilience ? "Re-Run Chaos Sim" : "Execute Chaos Simulation"}</span>
            </button>
          </div>

          {!project.resilience ? (
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
              <Shield className="w-12 h-12 text-slate-500" />
              <h3 className="font-bold text-slate-200 text-sm">Resilience report not compiled</h3>
              <p className="text-slate-500 text-xs max-w-sm">Evaluate recovery timelines (RTO/RPO) under region outages, DDoS events, and hardware corruptions.</p>
              <button onClick={runResilience} className="bg-slate-900 border border-slate-800 px-6 py-2.5 rounded-lg text-xs text-slate-200 hover:bg-slate-850">
                Execute Simulations
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Overall resilience score and risks list */}
              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl shadow-inner flex flex-col items-center justify-center text-center">
                  <span className="text-slate-400 text-xxs font-bold uppercase tracking-wider mb-4">Resilience Rating Score</span>
                  
                  {/* Large Circular rating visual */}
                  <div className="w-28 h-28 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center relative mb-4">
                    <div className="absolute inset-2 rounded-full border-2 border-cyan-400 border-dashed animate-[spin_40s_linear_infinite]" />
                    <span className="text-3xl font-extrabold text-cyan-400">{project.resilience.score}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Secure</span>
                  </div>

                  <p className="text-xxs text-slate-500 font-medium">Compliance SLA guarantees index rating</p>
                </div>

                <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-inner space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Security risks flag</h3>
                  <ul className="space-y-3 text-xs">
                    {project.resilience.risks?.map((risk: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-slate-300 leading-relaxed">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right: Disaster simulated cards */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Disaster Scenario Audits</h3>
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                  {project.resilience.scenarios?.map((sc: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-3 relative group">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 text-xs">{sc.name}</span>
                        <span className={`
                          px-2 py-0.5 rounded text-[10px] font-bold uppercase
                          ${sc.riskLevel === 'Low' ? 'bg-green-500/10 text-green-400' : sc.riskLevel === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}
                        `}>
                          {sc.riskLevel}
                        </span>
                      </div>
                      
                      <p className="text-slate-400 text-xs leading-relaxed">{sc.impact}</p>
                      
                      <div className="grid grid-cols-3 gap-2 bg-slate-900/30 p-2.5 rounded-lg text-xxs text-slate-400">
                        <div>RTO (Downtime): <span className="text-slate-200 font-bold block mt-0.5">{sc.rto}</span></div>
                        <div>RPO (Data Loss): <span className="text-slate-200 font-bold block mt-0.5">{sc.rpo}</span></div>
                        <div>Recovery Cost: <span className="text-slate-200 font-bold block mt-0.5">{sc.recoveryCost}</span></div>
                      </div>

                      <p className="text-slate-400 text-xxs leading-relaxed pt-1"><span className="text-cyan-400 font-semibold">Recovery Strategy:</span> {sc.recoveryPlan}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 6: Proposals Center */}
      {activeTab === 'proposal' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-50">SalesPilot Proposals Center</h2>
              <p className="text-slate-400 text-xs mt-1">Compile client-ready document artifacts and slide presentation decks</p>
            </div>
            <button 
              onClick={runDocumentGenerations}
              disabled={pipelineLoading === "proposal"}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/10"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pipelineLoading === 'proposal' ? 'animate-spin' : ''}`} />
              <span>{project.proposal ? "Compile Proposals" : "Compile Proposals"}</span>
            </button>
          </div>

          {!project.proposal ? (
            <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
              <FileText className="w-12 h-12 text-slate-500" />
              <h3 className="font-bold text-slate-200 text-sm">Proposal documents not compiled</h3>
              <p className="text-slate-500 text-xs max-w-sm">Compile final Microsoft Word (.docx), PDF summaries, and PowerPoint presentation slides (.pptx).</p>
              <button onClick={runDocumentGenerations} className="bg-slate-900 border border-slate-800 px-6 py-2.5 rounded-lg text-xs text-slate-200 hover:bg-slate-850">
                Compile Solutions Center
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Proposal Document Item 1 */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden group shadow-inner flex flex-col justify-between min-h-[220px]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">PDF Executive Proposal</h4>
                    <p className="text-slate-400 text-xxs mt-1 leading-relaxed">Full technical architectural details, estimated bill of materials, and failure analysis compiled in PDF format.</p>
                  </div>
                </div>
                
                <a 
                  href={project.proposal.exportUrlPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 py-3 rounded-lg text-xs text-slate-200 transition-colors flex items-center justify-center gap-2 font-bold"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download PDF Document</span>
                </a>
              </div>

              {/* Proposal Document Item 2 */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden group shadow-inner flex flex-col justify-between min-h-[220px]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">Word Solution Proposal (.docx)</h4>
                    <p className="text-slate-400 text-xxs mt-1 leading-relaxed">Editable Microsoft Word document (.docx) mapping service stacks, compliance, and budget negotiations.</p>
                  </div>
                </div>
                
                <a 
                  href={project.proposal.exportUrlDocx}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 py-3 rounded-lg text-xs text-slate-200 transition-colors flex items-center justify-center gap-2 font-bold"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Word Document</span>
                </a>
              </div>

              {/* Proposal Document Item 3 */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden group shadow-inner flex flex-col justify-between min-h-[220px]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">PowerPoint Presentation (.pptx)</h4>
                    <p className="text-slate-400 text-xxs mt-1 leading-relaxed">Editable Microsoft PowerPoint presentation slide deck (.pptx) compiled automatically with dark sleek themes.</p>
                  </div>
                </div>
                
                <a 
                  href={project.presentation?.exportUrlPptx || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 py-3 rounded-lg text-xs text-slate-200 transition-colors flex items-center justify-center gap-2 font-bold"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Slide Deck (.pptx)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
