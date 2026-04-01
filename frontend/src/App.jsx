import React, { useState, useEffect } from 'react';
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
  FastForward
} from 'lucide-react';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessKey, setAccessKey] = useState('');
  const [authError, setAuthError] = useState(false);

  const [numbersInput, setNumbersInput] = useState('');
  const [message, setMessage] = useState('Hello {name}, your order #{id} is ready!');
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState('DISCONNECTED'); 
  const [qrData, setQrData] = useState(null);
  const [delayInterval, setDelayInterval] = useState(30);
  const [memoryCount, setMemoryCount] = useState(0);

  const [consoleOutput, setConsoleOutput] = useState([
    { time: new Date().toLocaleTimeString(), msg: "UI Initialized. Waiting for Local Node Server..." }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const addLog = (msg) => {
    setConsoleOutput(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 50));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (accessKey === '911612') {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setAccessKey('');
    }
  };

  // 1. Live Server & Background Campaign Polling
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkServerStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        if (data.status !== status) {
          setStatus(data.status);
          if (data.status === 'CONNECTED') {
            addLog("WhatsApp Session Authorized & Connected!");
          }
          if (data.status === 'PAIRING') addLog("Engine requires Authorization.");
        }
        setQrData(data.qr || null);

        const campRes = await fetch('/api/campaign');
        const campData = await campRes.json();
        setMemoryCount(campData.memoryCount || 0);

        if (campData.isRunning) {
          if (!isProcessing) {
            addLog("Restored live session from Background Server.");
            setIsProcessing(true);
          }
          setQueue(campData.queue);
          setProgress((campData.sentCount / campData.totalCount) * 100);
        } else if (isProcessing && !campData.isRunning) {
          setIsProcessing(false);
          setProgress(0);
          setQueue(campData.queue); 
          addLog("Background campaign sequence completed or aborted.");
        }

      } catch (err) {
        if (status !== 'DISCONNECTED') {
          setStatus('DISCONNECTED');
          addLog("Connection to Local Node Server lost.");
        }
      }
    };

    const interval = setInterval(checkServerStatus, 2000);
    return () => clearInterval(interval);
  }, [status, isAuthenticated, isProcessing]);

  const handleConnect = () => {
    setStatus('PAIRING');
    addLog("Requesting QR code from Node server...");
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch(e) {}
    setStatus('DISCONNECTED');
    addLog("Kill signal sent. Session terminated.");
  };

  const abortCampaign = async () => {
    try {
      await fetch('/api/abort', { method: 'POST' });
      addLog("Abort signal sent. Stopping engine...");
      setIsProcessing(false);
    } catch (e) {
      addLog("Failed to send abort signal.");
    }
  };

  const resetMemory = async () => {
    try {
      await fetch('/api/reset-memory', { method: 'POST' });
      addLog("Sent History wiped clean.");
      setMemoryCount(0);
    } catch (e) {
      addLog("Failed to clear memory.");
    }
  };

  const importContacts = () => {
    if (!numbersInput.trim()) return;
    const lines = numbersInput.split('\n');
    addLog(`Staging ${lines.length} contacts locally...`);
    
    const newItems = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let name = 'Client';
      let number = '';
      let extraId = Math.floor(1000 + Math.random() * 9000).toString();

      if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(p => p.trim());
        name = parts[0] || 'Client';
        number = (parts[1] || '').replace(/\D/g, '');
        extraId = parts[2] || extraId;
      } else {
        number = trimmed.replace(/\D/g, '');
      }

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
      }
    }
    setQueue(prev => [...prev, ...newItems]);
    setNumbersInput('');
  };

  const startBulkProcess = async () => {
    if (status !== 'CONNECTED' || queue.length === 0) return;
    
    const pending = queue.filter(i => i.status === 'pending');
    if (pending.length === 0) {
      addLog("No pending contacts to send to.");
      return;
    }

    addLog(`Handing over ${pending.length} contacts to Background Node Engine...`);

    const payload = pending.map(item => {
      const personalized = message
        .replace(/{name}/g, item.name)
        .replace(/{id}/g, item.varId);
      return { id: item.id, number: item.number, name: item.name, message: personalized };
    });

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: payload, delayInterval: delayInterval })
      });

      if (res.ok) {
        setIsProcessing(true);
        addLog("Campaign handed over. System will auto-skip previously sent numbers.");
      } else {
        const errData = await res.json();
        addLog(`Node Engine rejected payload: ${errData.error}`);
      }
    } catch (err) {
      addLog("Network Error: Could not reach Node Engine.");
    }
  };

  // --- Render Lockscreen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-emerald-500/30 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0f172a] rounded-[2rem] border border-slate-800/60 shadow-2xl p-8 relative overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-4 border border-emerald-500/20 shadow-inner">
              <Lock size={32} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">Restricted Access</h1>
            <p className="text-xs text-slate-400 mt-1 text-center">Please enter your master access key to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound size={18} className="text-slate-500" />
              </div>
              <input
                type="password"
                inputMode="numeric"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Enter Passcode"
                className={`w-full bg-[#020617] border ${authError ? 'border-rose-500/50 focus:ring-rose-500/50' : 'border-slate-800/80 focus:border-emerald-500/50 focus:ring-emerald-500/50'} rounded-xl py-3.5 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-slate-600 font-mono tracking-widest text-center text-white`}
                autoFocus
              />
            </div>
            
            {authError && (
              <p className="text-rose-400 text-[10px] text-center font-semibold uppercase tracking-wider animate-in slide-in-from-top-1">
                Invalid Access Key
              </p>
            )}

            <button
              type="submit"
              disabled={!accessKey}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Render Main Dashboard ---
  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-emerald-500/30">
      <header className="border-b border-slate-800/60 bg-[#0f172a]/80 backdrop-blur-xl sticky top-0 z-40 p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">WhatsApp Message Sender</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : (status === 'PAIRING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500')}`}></div>
                <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase truncate">{status}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center w-full sm:w-auto">
            {status === 'CONNECTED' ? (
              <button onClick={handleDisconnect} className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 text-xs font-semibold transition-all shadow-sm">
                <LogOut size={14}/> Disconnect
              </button>
            ) : (
              <button onClick={handleConnect} disabled={status === 'PAIRING'} className="w-full sm:w-auto flex justify-center items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-xs font-bold transition-all">
                {status === 'PAIRING' ? <Loader2 size={16} className="animate-spin"/> : <QrCode size={16}/>} 
                Link Account
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800/60 p-4 md:p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-blue-400 shrink-0" />
                <h2 className="text-sm font-semibold text-slate-100">Contact List</h2>
              </div>
              <button 
                onClick={resetMemory}
                disabled={isProcessing || memoryCount === 0}
                className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-rose-400 hover:text-rose-300 disabled:opacity-30 uppercase tracking-wider font-semibold bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 transition-all w-fit"
                title="Clear the registry of previously sent numbers"
              >
                <RotateCcw size={10} /> Clear Memory ({memoryCount})
              </button>
            </div>
            <textarea 
              className="w-full h-32 md:h-36 bg-[#020617] border border-slate-800/80 rounded-xl p-3 text-xs sm:text-sm focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
              placeholder="Paste numbers here (one per line)&#10;919876543210&#10;447700900123"
              value={numbersInput}
              onChange={(e) => setNumbersInput(e.target.value)}
              disabled={isProcessing}
            />
            <button 
              onClick={importContacts}
              disabled={!numbersInput.trim() || isProcessing}
              className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-slate-700/50 shadow-sm"
            >
              <Plus size={16}/> Add to Queue
            </button>
          </div>

          <div className="bg-[#0f172a] rounded-2xl border border-slate-800/60 p-4 md:p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-purple-400 shrink-0" />
              <h2 className="text-sm font-semibold text-slate-100">Message Template</h2>
            </div>
            <textarea 
              className="w-full h-32 md:h-36 bg-[#020617] border border-slate-800/80 rounded-xl p-3 text-xs sm:text-sm focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all resize-none placeholder:text-slate-600 leading-relaxed"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isProcessing}
            />
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-md font-mono border border-slate-700/50">{' {name} '}</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-md font-mono border border-slate-700/50">{' {id} '}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-500/80 text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold">
                <AlertTriangle size={12}/> Avoid Spam Words
              </div>
            </div>
          </div>

          <div className="bg-[#020617] rounded-2xl border border-slate-800/60 overflow-hidden shadow-lg relative hidden sm:block">
            <div className="bg-slate-900/50 p-3 flex items-center justify-between border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-emerald-500" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">System Logs</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                <div className="w-2 h-2 rounded-full bg-slate-700"></div>
              </div>
            </div>
            <div className="h-32 md:h-40 overflow-y-auto p-4 text-[10px] md:text-[11px] leading-relaxed font-mono space-y-1.5">
              {consoleOutput.map((log, i) => (
                <div key={i} className="flex gap-2 md:gap-3 break-words">
                  <span className="text-slate-600 shrink-0">[{log.time}]</span>
                  <span className={log.msg.includes('success') || log.msg.includes('CONNECTED') ? 'text-emerald-400/90' : (log.msg.includes('Error') || log.msg.includes('lost') || log.msg.includes('Failed') || log.msg.includes('abort') ? 'text-rose-400/90' : 'text-slate-400')}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0f172a] rounded-3xl border border-slate-800/60 shadow-xl flex flex-col h-[500px] sm:h-full sm:min-h-[720px] overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-800/60 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#0f172a] gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 md:p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                  <Users size={20}/>
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-bold text-slate-100">Transmission Queue</h2>
                  <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                    <p className="text-[10px] md:text-[11px] text-slate-400 font-medium">
                      {queue.filter(q => q.status === 'pending').length} remaining
                    </p>
                    {isProcessing && (
                      <span className="flex items-center gap-1 text-[9px] md:text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 md:px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <ShieldCheck size={10}/> Safe Mode
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none flex items-center gap-2 bg-[#020617] border border-slate-800 rounded-xl px-3 py-2 md:py-1.5">
                  <Timer size={14} className="text-emerald-500 shrink-0" />
                  <select 
                    value={delayInterval} 
                    onChange={(e) => setDelayInterval(Number(e.target.value))}
                    disabled={isProcessing}
                    className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none cursor-pointer disabled:opacity-50 appearance-none w-full"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    <option value={20} className="bg-slate-900">20s Gap</option>
                    <option value={30} className="bg-slate-900">30s Gap</option>
                    <option value={45} className="bg-slate-900">45s Gap</option>
                    <option value={60} className="bg-slate-900">1m Gap</option>
                    <option value={120} className="bg-slate-900">2m Gap</option>
                    <option value={300} className="bg-slate-900">5m Gap</option>
                    <option value={600} className="bg-slate-900">10m Gap</option>
                  </select>
                </div>

                {queue.length > 0 && !isProcessing && (
                  <button onClick={() => setQueue([])} className="p-2 md:p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20 shrink-0">
                    <Trash2 size={16}/>
                  </button>
                )}
                
                {isProcessing ? (
                  <button 
                    onClick={abortCampaign}
                    className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 rounded-xl text-xs md:text-sm font-bold transition-all shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                  >
                    <Ban size={16}/> Abort
                  </button>
                ) : (
                  <button 
                    onClick={startBulkProcess}
                    disabled={status !== 'CONNECTED' || queue.filter(q => q.status === 'pending').length === 0}
                    className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-xl text-xs md:text-sm font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  >
                    <Play size={16}/> Start
                  </button>
                )}
              </div>
            </div>

            {isProcessing && (
              <div className="w-full h-1 bg-slate-800/50 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-700 ease-in-out relative" 
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30"></div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#020617]/50">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 py-20 md:py-32">
                  <Database size={40} className="mb-4 opacity-20" />
                  <p className="font-medium text-sm">Your queue is empty</p>
                  <p className="text-xs mt-1 text-slate-500">Add contacts to begin sending</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all ${
                      item.status === 'sent' 
                        ? 'bg-[#0f172a]/40 border-slate-800/40 opacity-50' 
                        : item.status === 'skipped'
                        ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                        : item.status === 'failed' 
                        ? 'bg-rose-950/20 border-rose-900/40' 
                        : 'bg-[#0f172a] border-slate-700/50 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shadow-inner ${item.status === 'sent' ? 'bg-slate-800/80 text-slate-500' : item.status === 'skipped' ? 'bg-slate-800/50 text-slate-600' : item.status === 'failed' ? 'bg-rose-900/50 text-rose-400' : 'bg-slate-800 text-emerald-400 border border-slate-700'}`}>
                        {item.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs md:text-sm font-semibold truncate ${item.status === 'skipped' ? 'text-slate-500 line-through decoration-slate-700' : 'text-slate-200'}`}>{item.name}</span>
                          {item.varId && <span className="hidden sm:inline-block text-[10px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 truncate">#{item.varId}</span>}
                        </div>
                        <p className={`text-[11px] md:text-xs font-mono mt-0.5 md:mt-1 ${item.status === 'skipped' ? 'text-slate-600' : 'text-slate-400'}`}>+{item.number}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center shrink-0 ml-2">
                      {item.status === 'pending' ? (
                        <span className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wider border border-slate-700/50 bg-slate-800/50 px-2 py-1 md:px-2.5 rounded-lg">Pending</span>
                      ) : item.status === 'skipped' ? (
                        <div className="flex items-center gap-1 text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-wider bg-slate-900 border border-slate-800 px-2 py-1 md:px-2.5 rounded-lg">
                          <FastForward size={12} className="hidden sm:block"/> 
                          <span>Skipped</span>
                        </div>
                      ) : item.status === 'failed' ? (
                        <span className="text-[9px] md:text-[10px] font-semibold text-rose-400 uppercase tracking-wider border border-rose-900/50 bg-rose-950/50 px-2 py-1 md:px-2.5 rounded-lg">Failed</span>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] md:text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 md:px-2.5 rounded-lg">
                          <CheckCircle2 size={12} className="hidden sm:block"/> 
                          <span>Sent</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-slate-800/60 bg-[#0f172a] flex justify-between items-center hidden sm:flex">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                <ShieldCheck size={14} className="text-emerald-500" />
                Background Server Active — Auto-Skips previously sent numbers
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Connection Modal */}
      {status === 'PAIRING' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"></div>
          <div className="bg-[#0f172a] rounded-[2rem] border border-slate-700/60 shadow-2xl max-w-sm w-full p-6 md:p-8 text-center animate-in zoom-in slide-in-from-bottom-8 duration-400 relative z-10">
             
             <h2 className="text-lg md:text-xl font-bold text-white mb-2 tracking-tight">Pair WhatsApp</h2>
             <p className="text-[11px] md:text-xs text-slate-400 font-medium mb-6 leading-relaxed">Open WhatsApp, navigate to Linked Devices, and scan this code.</p>
             
             <div className="bg-white p-3 rounded-2xl inline-block shadow-2xl relative min-w-[200px] min-h-[200px] flex items-center justify-center border-4 border-slate-800">
                {qrData ? (
                   <>
                    <img src={qrData} alt="WhatsApp QR Code" className="w-48 h-48 object-contain relative z-10" />
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-scan z-20 shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ animation: 'scan 2.5s ease-in-out infinite alternate' }}></div>
                   </>
                ) : (
                   <div className="flex flex-col items-center justify-center py-12 px-8">
                      <Loader2 size={32} className="text-emerald-500 animate-spin mb-4" />
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Generating QR...</span>
                   </div>
                )}
             </div>
             
             <button 
              onClick={() => {
                setStatus('DISCONNECTED');
              }}
              className="mt-6 md:mt-8 block w-full text-center text-[11px] md:text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
             >
               Cancel Connection
             </button>

             <style>{`
                @keyframes scan {
                  0% { top: 5%; }
                  100% { top: 95%; }
                }
             `}</style>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
