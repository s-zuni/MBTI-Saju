import React, { useState, useEffect } from 'react';
import { supabase, ensureValidSession } from '../supabaseClient';
import { Terminal, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

const DebugOverlay: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<any>({
        session: 'Checking...',
        user: 'Checking...',
        storage: 'Checking...',
        lastRefreshed: 'Never'
    });

    const addLog = (msg: string) => {
        setLogs(prev => [new Date().toLocaleTimeString() + ': ' + msg, ...prev].slice(0, 50));
    };

    const checkStatus = async () => {
        addLog('Diagnostic started...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data: { user } } = await supabase.auth.getUser();
            
            setStatus({
                session: session ? `Active (Exp: ${new Date(session.expires_at! * 1000).toLocaleTimeString()})` : 'No Session',
                user: user ? `${user.email} (${user.user_metadata?.role || 'user'})` : 'No User',
                storage: typeof localStorage !== 'undefined' ? 'Available' : 'Blocked',
                lastRefreshed: new Date().toLocaleTimeString()
            });

            if (!session) addLog('WARNING: No session found in localStorage.');
            if (session && !user) addLog('ERROR: Session exists but getUser failed (Stale token).');
            
        } catch (err: any) {
            addLog('DIAGNOSTIC ERROR: ' + err.message);
        }
    };

    const runFix = async () => {
        addLog('Attempting ensureValidSession()...');
        const session = await ensureValidSession();
        if (session) {
            addLog('SUCCESS: Session validated/refreshed.');
        } else {
            addLog('FAILED: Could not validate session.');
        }
        checkStatus();
    };

    useEffect(() => {
        if (isOpen) checkStatus();
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 z-[9999] bg-slate-900/80 text-white p-3 rounded-full shadow-xl backdrop-blur-md"
            >
                <Terminal size={20} />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/90 text-white p-6 flex flex-col font-mono text-xs overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Terminal className="text-indigo-400" /> Safari Debug Diagnostic
                </h2>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                    <X size={24} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="text-slate-400 mb-1 uppercase tracking-tighter text-[10px]">Session Status</div>
                    <div className="font-bold truncate">{status.session}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="text-slate-400 mb-1 uppercase tracking-tighter text-[10px]">Current User</div>
                    <div className="font-bold truncate">{status.user}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="text-slate-400 mb-1 uppercase tracking-tighter text-[10px]">LocalStorage</div>
                    <div className="font-bold">{status.storage}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="text-slate-400 mb-1 uppercase tracking-tighter text-[10px]">Last Checked</div>
                    <div className="font-bold">{status.lastRefreshed}</div>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                <button onClick={checkStatus} className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <RefreshCw size={14} /> Refresh
                </button>
                <button onClick={runFix} className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} /> Force Validate
                </button>
            </div>

            <div className="flex-1 bg-black/40 rounded-xl p-4 overflow-y-auto custom-scrollbar border border-white/5">
                <div className="text-indigo-400 mb-2 font-bold">System Logs:</div>
                {logs.map((log, i) => (
                    <div key={i} className={`mb-1 ${log.includes('ERROR') ? 'text-rose-400' : log.includes('WARNING') ? 'text-amber-400' : 'text-slate-300'}`}>
                        {log}
                    </div>
                ))}
            </div>

            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={16} />
                <p className="text-[10px] text-amber-200 leading-relaxed">
                    Safari ITP 이슈가 감지되면 "Force Validate"를 클릭하세요. 
                    토큰이 강제로 갱신되며 데이터 로딩이 복구됩니다.
                </p>
            </div>
        </div>
    );
};

export default DebugOverlay;
