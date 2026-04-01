import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  QrCode,
  ShieldCheck,
  Smartphone,
  LogOut,
  Terminal,
  Play,
  Database,
  Layers,
  Loader2,
  AlertTriangle,
  Timer,
  Lock,
  KeyRound,
  Ban,
  RotateCcw,
  FastForward,
  Upload,
  Download,
  Shuffle,
  Activity,
  Cpu
} from 'lucide-react';

const App = () => {
  // ==========================================
  // 🔒 SECURITY SETTINGS
  // ==========================================
  const ENABLE_LOCKSCREEN = true; // Set to false to skip the login screen entirely
  
  // Reads from Railway Environment Variables. 
  // If not set in Railway, it defaults to '101010'.
  const MASTER_PASSCODE = (typeof process !== 'undefined' && process.env && (process.env.VITE_MASTER_PASSCODE || process.env.REACT_APP_MASTER_PASSCODE)) || '101010';
  // ==========================================

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [authError, setAuthError] = useState(false);

  const [numbersInput, setNumbersInput] = useState('');
  const [messages, setMessages] = useState([
    'Hello {name}, your order #{id} is ready!',
    '',
    '',
    '',
    ''
  ]);
  
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState('DISCONNECTED'); 
  const [qrData, setQrData] = useState(null);
  const [delayInterval, setDelayInterval] = useState(30);
  const [memoryCount, setMemoryCount] = useState(0);

  // New state to control the manual popup of the Auth Modal
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [consoleOutput, setConsoleOutput] = useState([
    { time: new Date().toLocaleTimeString(), msg: "SYSTEM: Interface initialized. Awaiting engine handshake..." }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const addLog = (msg) => {
    setConsoleOutput(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 50));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (accessKey === MASTER_PASSCODE) {
      setIsAuthenticated(true);
      setAuthError(false);
      addLog("SYSTEM: Authentication successful. Access granted.");
    } else {
      setAuthError(true);
      setAccessKey('');
    }
  };

  const handleMessageChange = (index, value) => {
    const newMessages = [...messages];
    newMessages[index] = value;
    setMessages(newMessages);
  };

  // 1. Live Server & Background Campaign Polling
  useEffect(() => {
    if (ENABLE_LOCKSCREEN && !isAuthenticated) return;

    const checkServerStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        if (data.status !== status) {
          setStatus(data.status);
          if (data.status === 'CONNECTED') {
            addLog("AUTH: WhatsApp session actively linked.");
            setShowAuthModal(false); // Auto-close modal when connected
          }
          if (data.status === 'PAIRING') addLog("AUTH: Engine awaiting QR verification.");
        }
        setQrData(data.qr || null);

        const campRes = await fetch('/api/campaign');
        const campData = await campRes.json();
        setMemoryCount(campData.memoryCount || 0);

        if (campData.isRunning) {
          if (!isProcessing) {
            addLog("SYS: Restored active background transmission sequence.");
            setIsProcessing(true);
          }
          setQueue(campData.queue);
          setProgress((campData.sentCount / campData.totalCount) * 100);
        } else if (isProcessing && !campData.isRunning) {
          setIsProcessing(false);
          setProgress(0);
          setQueue(campData.queue); 
          addLog("SYS: Background sequence concluded.");
        }

      } catch (err) {
        if (status !== 'DISCONNECTED') {
          setStatus('DISCONNECTED');
          addLog("ERR: Connection to core engine severed.");
        }
      }
    };

    const interval = setInterval(checkServerStatus, 2000);
    return () => clearInterval(interval);
  }, [status, isAuthenticated, isProcessing]);

  const handleConnect = () => {
    setShowAuthModal(true);
    addLog("REQ: Generating secure pairing token...");
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch(e) {}
    setStatus('DISCONNECTED');
    addLog("REQ: Session termination signal dispatched.");
  };

  const abortCampaign = async () => {
    try {
      await fetch('/api/abort', { method: 'POST' });
      addLog("WARN: Manual abort triggered. Halting transmission.");
      setIsProcessing(false);
    } catch (e) {
      addLog("ERR: Abort override failed to reach engine.");
    }
  };

  const resetMemory = async () => {
    try {
      await fetch('/api/reset-memory', { method: 'POST' });
      addLog("SYS: Global sent registry wiped clean.");
      setMemoryCount(0);
    } catch (e) {
      addLog("ERR: Registry purge failed.");
    }
  };

  // --- CSV Handling Functions ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setNumbersInput(prev => prev + (prev ? '\n' : '') + text.trim());
      addLog(`DATA: Ingested payload from [${file.name}]`);
    };
    reader.onerror = () => {
      addLog("ERR: Payload ingestion failed during read.");
    }
    reader.readAsText(file);
    e.target.value = null; 
  };

  const downloadCSV = () => {
    if (queue.length === 0) {
      addLog("ERR: Queue empty. Export aborted.");
      return;
    }
    
    // Export ONLY the numbers, one per line
    const csvContent = queue.map(item => item.number).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wa_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLog("DATA: Queue exported to local filesystem.");
  };

  const importContacts = () => {
    if (!numbersInput.trim()) {
      addLog("WARN: Payload vector is empty.");
      return;
    }
    
    const lines = numbersInput.split('\n');
    const newItems = [];
    let invalidCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.toLowerCase().includes('name,number') || trimmed.toLowerCase().includes('name,phone')) continue;

      let name = 'Client';
      let number = '';
      let extraId = Math.floor(1000 + Math.random() * 9000).toString();

      if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        name = parts[0] || 'Client';
        number = (parts[1] || '').replace(/\D/g, '');
        extraId = parts[2] || extraId;
      } else {
        number = trimmed.replace(/\D/g, '');
      }

      // Smart "91" handling
      if (number.length === 10) {
        number = '91' + number;
      }

      if (number && number.length >= 10) {
        newItems.push({
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          number: number,
          varId: extraId,
          status: 'pending'
        });
      } else {
        invalidCount++;
      }
    }

    if (newItems.length > 0) {
      setQueue(prev => [...prev, ...newItems]);
      setNumbersInput('');
      addLog(`DATA: ${newItems.length} vectors staged for transmission.`);
    } else {
      addLog("ERR: Payload rejected. No valid 10+ digit integers detected.");
    }

    if (invalidCount > 0) {
      addLog(`WARN: Filtered out ${invalidCount} corrupted vectors.`);
    }
  };

  const startBulkProcess = async () => {
    if (status !== 'CONNECTED') {
      addLog("WARN: Engine disengaged. Cannot commence transmission.");
      return;
    }
    
    const pending = queue.filter(i => i.status === 'pending');
    if (pending.length === 0) {
      addLog("WARN: Transmission queue empty.");
      return;
    }

    const activeMessages = messages.filter(m => m.trim() !== '');
    if (activeMessages.length === 0) {
      addLog("WARN: Message configuration empty. Define a template.");
      return;
    }

    addLog(`SYS: Executing handoff to Core Engine (${pending.length} targets)...`);

    const payload = pending.map(item => {
      const randomMsg = activeMessages[Math.floor(Math.random() * activeMessages.length)];
      const personalized = randomMsg
        .replace(/{name}/g, item.name || 'Client') 
        .replace(/{id}/g, item.varId);
        
      return { 
        id: item.id, 
        number: item.number, 
        name: item.name, 
        varId: item.varId,
        message: personalized,
        status: 'pending' 
      };
    });

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: payload, delayInterval: delayInterval })
      });

      if (res.ok) {
        setIsProcessing(true);
        addLog(`SYS: Handoff verified. Engine running autonomously.`);
      } else {
        const errData = await res.json();
        addLog(`ERR: Engine rejected sequence. Reason: ${errData.error}`);
      }
    } catch (err) {
      addLog("ERR: Connection timeout during engine handoff.");
    }
  };

  // --- Render Lockscreen (Power UI Upgrade) ---
  if (ENABLE_LOCKSCREEN && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#030712] to-[#030712] text-slate-300 font-sans selection:bg-emerald-500/30 flex items-center justify-center p-4 relative overflow-hidden">
        
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-[400px] relative z-10">
          <div className="bg-[#090E1A]/80 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] p-8 md:p-10 relative overflow-hidden">
            {/* Top highlight line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
            
            <div className="flex flex-col items-center mb-10">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-5 border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]">
                <ShieldCheck size={32} strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">System Access</h1>
              <p className="text-xs text-slate-500 mt-2 text-center font-medium tracking-wide">AUTHENTICATION REQUIRED</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-emerald-400 text-slate-600">
                  <KeyRound size={18} />
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="••••••"
                  className={`w-full bg-[#030712] border ${authError ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/10 focus:border-emerald-500/50 focus:shadow-[0_0_20px_rgba(16,185,129,0.15)]'} rounded-xl py-4 pl-12 pr-4 text-lg outline-none transition-all placeholder:text-slate-700 font-mono tracking-[0.5em] text-center text-white`}
                  autoFocus
                />
              </div>
              
              {authError && (
                <p className="text-rose-400 text-[10px] text-center font-semibold uppercase tracking-[0.2em] animate-in slide-in-from-top-1 flex items-center justify-center gap-1.5">
                  <AlertTriangle size={12}/> Security Breach
                </p>
              )}

              <button
                type="submit"
                disabled={!accessKey}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 disabled:grayscale text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_10px_40px_-10px_rgba(16,185,129,0.7)] flex items-center justify-center gap-2"
              >
                INITIALIZE <FastForward size={16}/>
              </button>
            </form>
          </div>
          
          <p className="text-center text-[10px] font-mono text-slate-600 mt-6 tracking-widest uppercase">
            v3.6 Build &bull; Encrypted Protocol
          </p>
        </div>
      </div>
    );
  }

  // --- Render Main Dashboard ---
  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-sans selection:bg-emerald-500/30">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-[#090E1A]/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 px-4 sm:px-6 py-3">
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <Cpu size={20} strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold text-white tracking-wide truncate">WhatsApp Message Sender</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="relative flex h-2 w-2">
                  {status === 'CONNECTED' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  {status === 'PAIRING' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'CONNECTED' ? 'bg-emerald-500' : (status === 'PAIRING' ? 'bg-amber-500' : 'bg-rose-500')}`}></span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 tracking-[0.15em] uppercase truncate">
                  SYS: {status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center w-full sm:w-auto gap-3">
            <div className="hidden md:flex items-center gap-2 mr-4 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-white/5">
              <Activity size={14} className="text-slate-500" />
              <span className="text-[10px] font-mono text-slate-400">MEM: {memoryCount} REG</span>
            </div>

            {status === 'CONNECTED' ? (
              <button onClick={handleDisconnect} className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 text-xs font-semibold transition-all shadow-sm">
                <LogOut size={14}/> Disconnect Engine
              </button>
            ) : (
              <button 
                onClick={handleConnect} 
                className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.2)] hover:shadow-[0_0_25px_rgba(5,150,105,0.4)] text-xs font-bold tracking-wide transition-all border border-emerald-500/50"
              >
                <QrCode size={16}/> Authorize Device
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Column: Configuration Panels */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Data Ingestion Panel */}
          <div className="bg-[#090E1A] rounded-2xl ring-1 ring-white/5 shadow-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Database size={14} className="text-blue-400" />
                </div>
                <h2 className="text-xs font-bold text-white tracking-widest uppercase">Payload Ingestion</h2>
              </div>
              <button 
                onClick={resetMemory}
                disabled={isProcessing || memoryCount === 0}
                className="flex items-center gap-1.5 text-[10px] text-rose-400 hover:text-rose-300 disabled:opacity-30 uppercase tracking-widest font-semibold bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20 transition-all w-fit"
              >
                <RotateCcw size={12} /> Purge Registry
              </button>
            </div>

            {/* CSV Controls */}
            <div className="flex gap-3 mb-4 relative z-10">
              <input 
                type="file" 
                accept=".csv,.txt" 
                id="csv-upload" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
              <label 
                htmlFor="csv-upload" 
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#030712] hover:bg-slate-900 text-emerald-400 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-white/5 shadow-inner"
              >
                <Upload size={14}/> Import Data
              </label>
              
              <button 
                onClick={downloadCSV}
                disabled={queue.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#030712] hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-blue-400 rounded-xl text-xs font-semibold transition-all border border-white/5 shadow-inner"
              >
                <Download size={14}/> Export Vector
              </button>
            </div>

            <div className="relative z-10">
              <textarea 
                className="w-full h-32 bg-[#030712] border border-white/5 rounded-xl p-4 text-xs sm:text-sm focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700 font-mono text-slate-300 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
                placeholder="[Format: Name, Number, ID]&#10;Agent, 919876543210, 001&#10;Target, 447700900123, 002"
                value={numbersInput}
                onChange={(e) => setNumbersInput(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            
            <button 
              onClick={importContacts}
              disabled={isProcessing}
              className="w-full mt-4 py-3 bg-slate-800/50 hover:bg-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-white/5 shadow-sm relative z-10"
            >
              <Plus size={14}/> Stage Payload
            </button>
          </div>

          {/* Template Configuration Panel */}
          <div className="bg-[#090E1A] rounded-2xl ring-1 ring-white/5 shadow-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[50px] pointer-events-none"></div>

            <div className="flex items-center gap-2.5 mb-2 relative z-10">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <MessageSquare size={14} className="text-purple-400" />
              </div>
              <h2 className="text-xs font-bold text-white tracking-widest uppercase">Variant Matrix</h2>
            </div>
            <p className="text-[11px] text-slate-500 mb-4 font-medium relative z-10">
              Input up to 5 variations. Engine will execute random selection protocol to mitigate algorithmic flagging.
            </p>
            
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent relative z-10">
              {messages.map((msg, index) => (
                <div key={index} className="relative group">
                  <div className="absolute top-2 left-3 text-[9px] font-mono text-slate-600 font-bold select-none pointer-events-none">
                    V_0{index + 1}
                  </div>
                  <textarea 
                    className="w-full h-20 bg-[#030712] border border-white/5 rounded-xl pt-6 px-3 pb-3 text-xs focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all resize-none placeholder:text-slate-800 text-slate-300 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]"
                    placeholder={`Define message variant...`}
                    value={msg}
                    onChange={(e) => handleMessageChange(index, e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 relative z-10">
              <div className="flex gap-2">
                <span className="text-[10px] bg-[#030712] text-slate-400 px-2.5 py-1 rounded-md font-mono border border-white/5 shadow-inner">{' {name} '}</span>
                <span className="text-[10px] bg-[#030712] text-slate-400 px-2.5 py-1 rounded-md font-mono border border-white/5 shadow-inner">{' {id} '}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-500/80 text-[10px] uppercase tracking-widest font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Shuffle size={12}/> Auto-Rotate
              </div>
            </div>
          </div>

          {/* Dev Terminal */}
          <div className="bg-[#050914] rounded-2xl ring-1 ring-white/5 overflow-hidden shadow-2xl hidden sm:flex flex-col h-48">
            <div className="bg-[#090E1A] p-2.5 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 pl-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Nexus Console</span>
              </div>
              <Terminal size={12} className="text-slate-600 mr-1" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-[10px] font-mono space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {consoleOutput.map((log, i) => (
                <div key={i} className="flex gap-3 leading-relaxed">
                  <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                  <span className={log.msg.includes('success') || log.msg.includes('Success') || log.msg.includes('CONNECTED') || log.msg.includes('Exported') || log.msg.includes('Loaded') || log.msg.includes('SYS:') ? 'text-emerald-400/90' : (log.msg.includes('Error') || log.msg.includes('Denied') || log.msg.includes('lost') || log.msg.includes('Failed') || log.msg.includes('abort') || log.msg.includes('ERR:') || log.msg.includes('WARN:') ? 'text-rose-400/90' : 'text-slate-400')}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Core */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#090E1A] rounded-3xl ring-1 ring-white/5 shadow-2xl flex flex-col h-[500px] sm:h-full sm:min-h-[860px] overflow-hidden relative">
            
            {/* Background Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Core Header */}
            <div className="p-5 md:p-6 border-b border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#090E1A]/50 backdrop-blur-sm gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]">
                  <Activity size={20} strokeWidth={2}/>
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-bold text-white tracking-wide">Transmission Core</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] md:text-[11px] text-slate-400 font-medium">
                      <span className="text-white font-mono">{queue.filter(q => q.status === 'pending').length}</span> TARGETS PENDING
                    </p>
                    {isProcessing && (
                      <span className="flex items-center gap-1 text-[9px] md:text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold tracking-widest uppercase">
                        <ShieldCheck size={10}/> Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Custom Styled Select */}
                <div className="flex-1 sm:flex-none relative group">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Timer size={14} className="text-emerald-500" />
                  </div>
                  <select 
                    value={delayInterval} 
                    onChange={(e) => setDelayInterval(Number(e.target.value))}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-[#030712] border border-white/10 hover:border-white/20 rounded-xl py-2.5 pl-9 pr-8 text-xs text-slate-300 font-bold focus:outline-none cursor-pointer disabled:opacity-50 appearance-none shadow-inner transition-all"
                  >
                    <option value={20} className="bg-slate-900">Gap: Max 20s</option>
                    <option value={30} className="bg-slate-900">Gap: Max 30s</option>
                    <option value={45} className="bg-slate-900">Gap: Max 45s</option>
                    <option value={60} className="bg-slate-900">Gap: Max 1m</option>
                    <option value={120} className="bg-slate-900">Gap: Max 2m</option>
                    <option value={300} className="bg-slate-900">Gap: Max 5m</option>
                    <option value={600} className="bg-slate-900">Gap: Max 10m</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                {queue.length > 0 && !isProcessing && (
                  <button 
                    onClick={() => setQueue([])} 
                    className="p-2.5 text-slate-500 hover:text-rose-400 bg-[#030712] hover:bg-rose-500/10 rounded-xl transition-all border border-white/5 hover:border-rose-500/20 shrink-0 shadow-inner"
                    title="Clear entire queue"
                  >
                    <Trash2 size={16}/>
                  </button>
                )}
                
                {isProcessing ? (
                  <button 
                    onClick={abortCampaign}
                    className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs md:text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] border border-rose-500/50"
                  >
                    <Ban size={16}/> ABORT
                  </button>
                ) : (
                  <button 
                    onClick={startBulkProcess}
                    disabled={status !== 'CONNECTED' || queue.filter(q => q.status === 'pending').length === 0}
                    className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 disabled:grayscale text-white rounded-xl text-xs md:text-sm font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/50"
                  >
                    <Play size={16} fill="currentColor" /> INITIATE
                  </button>
                )}
              </div>
            </div>

            {/* Glowing Progress Line */}
            <div className="w-full h-[2px] bg-slate-900 overflow-hidden">
              {isProcessing && (
                <div 
                  className="h-full bg-emerald-400 transition-all duration-700 ease-in-out relative shadow-[0_0_10px_rgba(52,211,153,1)]" 
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/50 blur-[2px]"></div>
                </div>
              )}
            </div>

            {/* The Queue List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 bg-[#030712]/50 relative z-10 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 py-20 md:py-32">
                  <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center mb-4 opacity-50">
                    <Database size={24} className="text-slate-500" />
                  </div>
                  <p className="font-semibold text-sm tracking-wide text-slate-400">VECTOR POOL EMPTY</p>
                  <p className="text-xs mt-1.5 text-slate-600 font-medium">Awaiting data ingestion to proceed.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-3.5 md:p-4 rounded-2xl border transition-all duration-300 ${
                      item.status === 'sent' 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : item.status === 'skipped'
                        ? 'bg-slate-800/30 border-white/5 opacity-60'
                        : item.status === 'failed' 
                        ? 'bg-rose-500/5 border-rose-500/20' 
                        : 'bg-[#090E1A] border-white/5 hover:border-emerald-500/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                    }`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm shadow-inner ${item.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : item.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 border border-slate-700 text-slate-400'}`}>
                        {item.status === 'sent' ? <CheckCircle2 size={18}/> : item.status === 'failed' ? <Ban size={18}/> : <Users size={18}/>}
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs md:text-sm font-bold font-mono tracking-tight truncate ${item.status === 'sent' ? 'text-emerald-400' : item.status === 'failed' ? 'text-rose-400' : 'text-slate-200'}`}>
                            +{item.number}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] md:text-[11px] font-medium truncate ${item.status === 'skipped' ? 'text-slate-600 line-through' : 'text-slate-500'}`}>
                             {item.name}
                           </span>
                           {item.varId && <span className="hidden sm:inline-block text-[9px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-white/5 truncate">ID:{item.varId}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center shrink-0 ml-3">
                      {item.status === 'pending' ? (
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-white/5 bg-slate-900 px-3 py-1.5 rounded-lg shadow-inner">PENDING</span>
                      ) : item.status === 'skipped' ? (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg shadow-inner">
                          <FastForward size={12} className="hidden sm:block"/> 
                          <span>SKIPPED</span>
                        </div>
                      ) : item.status === 'failed' ? (
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 rounded-lg shadow-inner">FAILED</span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]">
                          <span>DELIVERED</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-white/5 bg-[#090E1A] flex justify-between items-center hidden sm:flex relative z-10">
              <div className="flex items-center gap-2.5 text-emerald-500/80 text-[10px] font-bold uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Engine operating with fully randomized cadence & vectors
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Manual Connection Modal (Power UI) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#030712]/90 backdrop-blur-md animate-in fade-in duration-300"></div>
          <div className="bg-[#090E1A] rounded-[2rem] border border-emerald-500/20 shadow-[0_0_100px_rgba(16,185,129,0.15)] max-w-sm w-full p-8 md:p-10 text-center animate-in zoom-in slide-in-from-bottom-8 duration-500 relative z-10 overflow-hidden">
             
             {/* Modal Highlight */}
             <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50"></div>

             <h2 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tight">Authorization Required</h2>
             <p className="text-xs text-slate-400 font-medium mb-8 leading-relaxed">Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device.</p>
             
             <div className="bg-white p-3 rounded-2xl inline-block shadow-2xl relative min-w-[220px] min-h-[220px] flex items-center justify-center border-[6px] border-slate-900">
                {qrData ? (
                   <>
                    <img src={qrData} alt="WhatsApp QR Code" className="w-52 h-52 object-contain relative z-10" />
                    {/* Faux laser scan line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 animate-scan z-20 shadow-[0_0_15px_rgba(52,211,153,1)]" style={{ animation: 'scan 2.5s ease-in-out infinite alternate' }}></div>
                   </>
                ) : (
                   <div className="flex flex-col items-center justify-center py-12 px-8">
                      <div className="relative mb-6">
                        <Loader2 size={36} className="text-emerald-500 animate-spin relative z-10" />
                        <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20"></div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Generating Cipher...</span>
                   </div>
                )}
             </div>
             
             <button 
              onClick={() => {
                setShowAuthModal(false);
              }}
              className="mt-8 md:mt-10 block w-full text-center text-[10px] md:text-xs font-bold tracking-widest text-slate-500 hover:text-rose-400 uppercase transition-colors"
             >
               Dismiss
             </button>

             <style>{`
                @keyframes scan {
                  0% { top: 2%; }
                  100% { top: 98%; }
                }
             `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
