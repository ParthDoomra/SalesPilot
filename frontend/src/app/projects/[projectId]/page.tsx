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
// Typewriter animation component to simulate real-time AI streaming
function TypewriterText({ text, speed = 6 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.slice(i, i + 3));
        i += 3;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <p className="whitespace-pre-wrap">{displayedText}</p>;
}

// Collapsible category checklist accordion
function CategoryAccordion({ title, score, items }: { title: string; score: number; items: any[] }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 bg-slate-900/30 text-left text-xs font-bold text-slate-200 hover:bg-slate-900/60 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-90 text-cyan-400' : 'text-slate-500'}`} />
          <span>{title}</span>
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
          score >= 90 ? 'bg-green-500/10 text-green-400' : score >= 50 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-slate-850 text-slate-500'
        }`}>
          {score}%
        </span>
      </button>
      {isOpen && (
        <div className="p-3 space-y-2 border-t border-slate-800/40 bg-slate-950/40">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[11px] leading-tight">
              {item.filled ? (
                <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-grow">
                <div className="font-bold text-slate-300">{item.label}</div>
                <div className="text-[10px] text-slate-400 font-semibold break-words">
                  {item.filled ? (
                    typeof item.value === 'boolean' ? 'Enabled' :
                    Array.isArray(item.value) ? item.value.join(', ') :
                    typeof item.value === 'number' ? `₹${item.value.toLocaleString()}` :
                    String(item.value)
                  ) : (
                    <span className="text-slate-700 italic font-normal">Missing</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectWorkspace() {
  const { projectId } = useParams() as { projectId: string };
  const { apiFetch, user } = useAuth();
  const router = useRouter();
  
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'requirements' | 'architecture' | 'pricing' | 'negotiation' | 'resilience' | 'proposal'>('requirements');
  const [reqMethod, setReqMethod] = useState<'chat' | 'upload'>('chat');

  // New Requirements & Pipeline State
  const [pastedRequirements, setPastedRequirements] = useState('');
  const [projectName, setProjectName] = useState('');
  const [pipelineProgress, setPipelineProgress] = useState('');
  const [missingInfoAnswers, setMissingInfoAnswers] = useState<Record<string, string>>({});

  // Conversational state variables
  const [requirements, setRequirements] = useState<any>(null);
  const [completenessScore, setCompletenessScore] = useState<any>(null);
  const [checklistState, setChecklistState] = useState<any[]>([]);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [editedJsonText, setEditedJsonText] = useState('');

  // Voice/Chat State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  
  // Pipeline Loaders
  const [pipelineLoading, setPipelineLoading] = useState<string | null>(null);

  // Load project initially
  const loadProject = async () => {
    try {
      setError(null);
      const data = await apiFetch(`/projects/${projectId}`);
      setProject(data);
      if (data.name) {
        setProjectName(data.name);
      }
      
      if (data.requirements) {
        setRequirements(data.requirements);
      }
      
      if (data.completenessScore) {
        setCompletenessScore(data.completenessScore);
      }
      
      if (data.checklistState) {
        setChecklistState(data.checklistState);
      }
      
      if (data.conversation && data.conversation.length > 0) {
        setChatHistory(data.conversation);
      } else {
        const welcomeText = `Hello! I am your Senior Business Analyst and Presales Architect. Let's gather your cloud requirements for project **${data.name}** at **${data.company}**. 
 
What industry does your solution focus on (e.g. Retail, Healthcare, Banking, Education, Manufacturing, Government)?`;
        setChatHistory([
          { role: 'assistant', content: welcomeText }
        ]);
      }
    } catch (e: any) {
      console.error("Failed to load project solution details:", e);
      setError(e.message || "Project not found.");
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
    if (!transcript.trim()) return;
    setVoiceLoading(true);
    
    const userMsg = transcript.trim();
    const newHistory = [...chatHistory, { role: 'user' as const, content: userMsg }];
    
    setChatHistory(newHistory);
    setTranscript('');
    
    try {
      const res = await apiFetch(`/agents/voice-step/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: userMsg,
          chatHistory: chatHistory
        })
      });
      
      if (res.requirements) {
        setRequirements(res.requirements);
      }
      if (res.completenessScore) {
        setCompletenessScore(res.completenessScore);
      }
      if (res.checklistState) {
        setChecklistState(res.checklistState);
      }
      if (res.chatHistory) {
        setChatHistory(res.chatHistory);
      }
      
      loadProject();
    } catch (e) {
      console.error("Chat turn error:", e);
      setChatHistory([...newHistory, { role: 'assistant', content: "I apologize, I experienced a connection issue. Could you please repeat that?" }]);
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
      
      // Seed first chat message summarizing RFP and asking next question
      const rfpMsg = `I've analyzed your RFP file **${uploadFile.name}** and extracted initial requirements. You can see the details in the live sidebar. 

Let's continue. What is your target timeline or timeline requirements for launching this solution?`;

      await apiFetch(`/agents/voice-step/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: `Uploaded RFP file: ${uploadFile.name}`,
          chatHistory: [
            { role: 'assistant', content: "I will analyze your RFP document." },
            { role: 'user', content: `Analyzed document ${uploadFile.name}` },
            { role: 'assistant', content: rfpMsg }
          ]
        })
      });

      setReqMethod('chat');
      setUploadFile(null);
      loadProject();
      alert("RFP requirements analyzed successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to analyze RFP file.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleConfirmRequirements = async () => {
    if (!requirements) return;
    setPipelineLoading("requirements");
    try {
      const updatedReqs = { ...requirements, confirmed: true };
      await apiFetch(`/agents/save-requirements/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedReqs)
      });
      alert("Requirements confirmed successfully!");
      await loadProject();
      setActiveTab('architecture');
    } catch (e) {
      console.error(e);
      alert("Failed to confirm requirements.");
    } finally {
      setPipelineLoading(null);
    }
  };

  const handleOpenJsonEditor = () => {
    setEditedJsonText(JSON.stringify(requirements || {}, null, 2));
    setShowJsonEditor(true);
  };

  const handleSaveJsonEditor = async () => {
    try {
      const parsed = JSON.parse(editedJsonText);
      await apiFetch(`/agents/save-requirements/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      setShowJsonEditor(false);
      loadProject();
      alert("Requirements updated successfully.");
    } catch (e) {
      alert("Invalid JSON format. Please correct it.");
    }
  };

  // Run End-to-End Automated Pipeline
  const runAutomatedPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !pastedRequirements.trim()) {
      alert("Please upload a requirement document or paste requirements text.");
      return;
    }
    setPipelineLoading("pipeline");
    setPipelineProgress("Uploading requirements document...");

    const formData = new FormData();
    if (uploadFile) {
      formData.append("file", uploadFile);
    }
    if (pastedRequirements) {
      formData.append("pasted_requirements", pastedRequirements);
    }
    if (projectName) {
      formData.append("projectName", projectName);
    }

    const progressSteps = [
      { delay: 1000, msg: "Extracting text structure..." },
      { delay: 2500, msg: "Running Requirement Ingestion Agent..." },
      { delay: 5000, msg: "Designing multi-tier cloud topology..." },
      { delay: 7000, msg: "Estimating pricing & billing specs..." },
      { delay: 8500, msg: "Optimizing FinOps budget constraints..." },
      { delay: 10000, msg: "Auditing resilience & chaos recovery SLAs..." },
      { delay: 11500, msg: "Compiling final PDF/DOCX/PPTX proposals..." },
      { delay: 13000, msg: "Syncing workspace states..." }
    ];

    const timers = progressSteps.map(step =>
      setTimeout(() => setPipelineProgress(step.msg), step.delay)
    );

    try {
      const storedUser = localStorage.getItem("salespilot_mock_user");
      const token = storedUser ? JSON.parse(storedUser).token : "";

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/agents/pipeline/${projectId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        throw new Error("Pipeline compilation failed.");
      }

      timers.forEach(clearTimeout);
      await loadProject();
      alert("Pipeline completed successfully! All tabs have been populated and unlocked.");
    } catch (err: any) {
      timers.forEach(clearTimeout);
      alert(err.message || "Pipeline execution failed.");
    } finally {
      setPipelineLoading(null);
      setPipelineProgress('');
    }
  };

  const handleResolveMissingGaps = async (e: React.FormEvent) => {
    e.preventDefault();
    const answersText = Object.entries(missingInfoAnswers)
      .filter(([_, ans]) => ans.trim() !== '')
      .map(([ques, ans]) => `- Resolved Missing Info: [${ques}] = ${ans}`)
      .join('\n');
      
    if (!answersText) {
      alert("Please fill in at least one clarification field to re-analyze.");
      return;
    }
    
    const updatedText = `${requirements.extractedText || pastedRequirements || ''}\n\n${answersText}`;
    
    setPipelineLoading("pipeline");
    setPipelineProgress("Submitting resolved requirements...");
    
    const formData = new FormData();
    formData.append("pasted_requirements", updatedText);
    if (projectName) {
      formData.append("projectName", projectName);
    }
    
    const progressSteps = [
      { delay: 1000, msg: "Reparsing unified specifications..." },
      { delay: 2500, msg: "Regenerating Cloud Architecture topology..." },
      { delay: 4500, msg: "Recalculating Infrastructure pricing BOM..." },
      { delay: 6500, msg: "Re-optimizing FinOps budget alignment..." },
      { delay: 8500, msg: "Re-compiling proposal slides & files..." },
      { delay: 10000, msg: "Syncing solution workspace..." }
    ];
    
    const timers = progressSteps.map(step => 
      setTimeout(() => setPipelineProgress(step.msg), step.delay)
    );

    try {
      const storedUser = localStorage.getItem("salespilot_mock_user");
      const token = storedUser ? JSON.parse(storedUser).token : "";
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/agents/pipeline/${projectId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        throw new Error("Re-analysis pipeline failed.");
      }
      
      timers.forEach(clearTimeout);
      setMissingInfoAnswers({});
      await loadProject();
      alert("Solution architecture and pricing recalculated with your inputs!");
    } catch (err: any) {
      timers.forEach(clearTimeout);
      alert(err.message || "Failed to update specifications.");
    } finally {
      setPipelineLoading(null);
      setPipelineProgress('');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xl animate-pulse">
          S
        </div>
        <span className="text-xs text-slate-500 mt-4 tracking-widest uppercase animate-pulse">Retrieving Solution State...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Solution Proposal Not Found</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              {error || "The requested solution details could not be loaded or the database record was wiped from memory due to server reloads."}
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="block w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 rounded-lg text-xs transition-colors shadow-lg shadow-cyan-500/10 text-center"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Cost items configurations
  const costBreakdown = project.pricing?.breakdown || {};
  const monthlyTotal = project.pricing?.monthlyTotal || 0.0;
  const annualTotal = project.pricing?.annualTotal || 0.0;
  
  const overallScore = completenessScore?.Overall || 0;


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
            Budget Cap: <span className="text-slate-50">₹{project.budget.toLocaleString()}/mo</span>
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
          { id: 'architecture', label: '2. Architecture', icon: Layers, locked: !project.requirements || !project.requirements.confirmed },
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
        <div className="space-y-8">
          {!requirements || !requirements.reportText ? (
            // New Project Requirements Form
            <div className="max-w-3xl mx-auto bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 shadow-2xl space-y-6">
              <div className="text-center space-y-2 mb-6">
                <Sparkles className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
                <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider">Initialize Solution Presales Pipeline</h2>
                <p className="text-slate-400 text-xs max-w-md mx-auto">
                  Provide your client specifications below. SalesPilot will automatically analyze and build the cloud design, live pricing, budget optimizations, resilience plans, and proposal.
                </p>
              </div>

              {pipelineLoading === "pipeline" ? (
                // Processing view
                <div className="flex flex-col items-center justify-center py-16 space-y-6">
                  <div className="w-16 h-16 rounded-full border-4 border-t-cyan-500 border-r-cyan-500/20 border-b-cyan-500/20 border-l-cyan-500/20 animate-spin" />
                  <div className="space-y-2 text-center">
                    <span className="text-xs text-slate-400 font-bold tracking-widest uppercase block animate-pulse">Running Ingestion Engine</span>
                    <span className="text-xxs text-cyan-400 font-mono block">{pipelineProgress}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={runAutomatedPipeline} className="space-y-6 text-xs font-semibold">
                  {/* Project Name */}
                  <div className="space-y-2">
                    <label className="block text-slate-400 uppercase tracking-wider text-[10px]">Project Name</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. ShopSphere E-Commerce Cloud Proposal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Document Uploader */}
                  <div className="space-y-2">
                    <label className="block text-slate-400 uppercase tracking-wider text-[10px]">Requirement Document (PDF, DOCX, TXT)</label>
                    <div className="border border-dashed border-slate-850 bg-slate-950/40 rounded-xl p-6 text-center hover:border-slate-850 transition-colors relative flex flex-col justify-center items-center gap-3">
                      <FileUp className="w-8 h-8 text-slate-500" />
                      <div>
                        <span className="text-slate-300 block text-xs">
                          {uploadFile ? uploadFile.name : "Select or drag client document here"}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 block">Maximum file size: 10MB</span>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="text-center text-slate-500 font-bold uppercase text-[9px] tracking-widest py-1">OR</div>

                  {/* Text Paste Editor */}
                  <div className="space-y-2">
                    <label className="block text-slate-400 uppercase tracking-wider text-[10px]">Paste Project Requirements</label>
                    <textarea
                      rows={8}
                      value={pastedRequirements}
                      onChange={(e) => setPastedRequirements(e.target.value)}
                      placeholder="Paste RFP contents, technical specifications, database demands, or timeline notes here..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 outline-none focus:border-cyan-500/50 font-mono text-[11px]"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!uploadFile && !pastedRequirements.trim()}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/10 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Requirements</span>
                  </button>
                </form>
              )}
            </div>
          ) : (
            // Requirement Analysis Report View
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Column: Markdown Report Render (3 cols) */}
              <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-inner space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Requirement Analysis Report</h3>
                      <p className="text-[10px] text-slate-500">Ingested and parsed automatically by SalesPilot AI</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => handleOpenJsonEditor()}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Inspect JSON Specs
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to reset requirements and upload new documents?")) {
                          setRequirements(null);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-red-950/45 bg-red-950/10 text-[10px] font-bold text-red-400 hover:bg-red-950/20 transition-all"
                    >
                      Re-Analyze Specs
                    </button>
                  </div>
                </div>

                <div className="prose prose-invert prose-xs max-w-none text-slate-300 leading-relaxed space-y-4">
                  <div className="whitespace-pre-wrap font-sans text-xs bg-slate-950/30 p-4 rounded-xl border border-slate-850">
                    {requirements.reportText}
                  </div>
                </div>

                {/* Confirm continue link */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    <span>The Solution Architecture and Live Pricing estimate have been compiled from these requirements.</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('architecture')}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 text-xs"
                  >
                    <span>Proceed to Architecture</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right Column: Structured Specs Summary Cards (1 col) */}
              <div className="space-y-6">
                {/* Core parameters card */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow-inner space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">Analysis Parameters</h4>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Detected Industry</span>
                      <span className="text-slate-200 font-bold block mt-0.5">{requirements.industry || "Retail"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Cloud Preference</span>
                      <span className="text-cyan-400 font-bold block mt-0.5">{requirements.cloudPreference || "Any"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Timeline Goal</span>
                      <span className="text-slate-200 font-bold block mt-0.5">{requirements.timeline || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Hosting Budget Limit</span>
                      <span className="text-slate-200 font-bold block mt-0.5">{requirements.budget || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Expected Users</span>
                      <span className="text-slate-200 font-bold block mt-0.5">{requirements.expectedUsers || "Not specified"}</span>
                    </div>
                  </div>
                </div>

                {/* Sizing indicators card */}
                {requirements.missingInformation && requirements.missingInformation.length > 0 && (
                  <div className="bg-amber-950/10 border border-amber-900/30 rounded-2xl p-4 shadow-inner space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-amber-900/20 pb-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Resolve Missing Gaps ({requirements.missingInformation.length})</span>
                    </h4>
                    <form onSubmit={handleResolveMissingGaps} className="space-y-3">
                      {requirements.missingInformation.map((m: string, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <label className="block text-[10px] text-amber-400/80 leading-relaxed font-semibold">{m}</label>
                          <input
                            type="text"
                            value={missingInfoAnswers[m] || ''}
                            onChange={(e) => setMissingInfoAnswers(prev => ({ ...prev, [m]: e.target.value }))}
                            placeholder="Provide details..."
                            className="w-full bg-slate-950/60 border border-amber-900/20 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-amber-500/50"
                          />
                        </div>
                      ))}
                      <button
                        type="submit"
                        disabled={pipelineLoading === "pipeline"}
                        className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 uppercase tracking-wider"
                      >
                        <span>Submit & Re-Analyze</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}

                {/* Risks indicators card */}
                {requirements.projectRisks && requirements.projectRisks.length > 0 && (
                  <div className="bg-red-950/10 border border-red-900/30 rounded-2xl p-4 shadow-inner space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>SLA & Project Risks ({requirements.projectRisks.length})</span>
                    </h4>
                    <ul className="space-y-1.5 text-[11px] text-red-300/80 leading-relaxed list-disc list-inside">
                      {requirements.projectRisks.map((r: string, idx: number) => (
                        <li key={idx} className="truncate-2-lines">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* JSON/Direct Requirements Editor Modal */}
          {showJsonEditor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Edit Requirements JSON Specs</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Modify the structured requirement parameters directly. Ensure valid JSON format.
                </p>
                <textarea
                  value={editedJsonText}
                  onChange={(e) => setEditedJsonText(e.target.value)}
                  className="w-full h-96 bg-slate-950 border border-slate-850 rounded-xl p-4 font-mono text-xs text-cyan-400 outline-none focus:border-cyan-500/50"
                />
                <div className="flex justify-end gap-3 text-xs">
                  <button
                    onClick={() => setShowJsonEditor(false)}
                    className="bg-transparent border border-slate-800 hover:bg-slate-850 px-4 py-2 rounded-lg font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveJsonEditor}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-lg font-bold transition-colors"
                  >
                    Save Requirements
                  </button>
                </div>
              </div>
            </div>
          )}
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
                    <div className="text-3xl font-extrabold text-cyan-400">₹{monthlyTotal.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 mt-2 font-medium">Billed dynamically on Azure Consumption</div>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-inner">
                    <div className="text-slate-500 text-xxs font-bold uppercase tracking-wider mb-2">Annualized Cost Total</div>
                    <div className="text-3xl font-extrabold text-slate-50">₹{annualTotal.toLocaleString()}</div>
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
                          <td className="py-3 px-2 text-right font-semibold text-slate-100">₹{val.toLocaleString()}</td>
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
                      <span className="font-semibold text-slate-200">₹{item.value.toLocaleString()}</span>
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
                  <span className="text-xl font-extrabold text-slate-400">₹{project.negotiation.originalCost}/mo</span>
                </div>
                <div className="bg-cyan-500/5 border border-cyan-500/10 p-5 rounded-2xl relative">
                  <div className="absolute inset-0 bg-cyan-500/[0.02] blur-sm rounded-2xl"></div>
                  <span className="text-cyan-400 text-xxs font-bold uppercase tracking-wider block mb-1 relative z-10">Optimized Solutions Cost</span>
                  <span className="text-xl font-extrabold text-cyan-400 relative z-10">₹{project.negotiation.optimizedCost}/mo</span>
                </div>
                <div className="bg-green-500/5 border border-green-500/10 p-5 rounded-2xl relative">
                  <div className="absolute inset-0 bg-green-500/[0.02] blur-sm rounded-2xl"></div>
                  <span className="text-green-400 text-xxs font-bold uppercase tracking-wider block mb-1 relative z-10">Net Monthly Savings</span>
                  <span className="text-xl font-extrabold text-green-400 relative z-10">₹{project.negotiation.savings}/mo</span>
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
