import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    LayoutDashboard, Sparkles, Save, RotateCcw, Play, CheckCircle,
    AlertTriangle, Edit3, Trash2, Plus, Terminal, RefreshCw, LogOut
} from 'lucide-react';
import { reliableGenerateContent } from './utils/aiService';

// --- CONFIG ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AIAdminPanel() {
    const [prompts, setPrompts] = useState([]);
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [loading, setLoading] = useState(false);
    const [testVariables, setTestVariables] = useState({});
    const [testOutput, setTestOutput] = useState("");
    const [isTesting, setIsTesting] = useState(false);

    // New Prompt State
    const [isCreating, setIsCreating] = useState(false);
    const [newPromptSlug, setNewPromptSlug] = useState("");

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('ai_prompts')
            .select('*')
            .order('slug', { ascending: true });

        if (data) {
            setPrompts(data);
            if (!selectedPrompt && data.length > 0) setSelectedPrompt(data[0]);
        }
        setLoading(false);
    };

    const handleSelectPrompt = (p) => {
        setSelectedPrompt(p);
        setTestOutput("");
        // Extract default variables for testing
        const matches = p.template.match(/\{\{(\w+)\}\}/g);
        const vars = {};
        if (matches) {
            matches.forEach(m => {
                const key = m.replace(/\{\{|\}\}/g, '');
                vars[key] = `Test ${key}`;
            });
        }
        setTestVariables(vars);
    };

    const handleSavePrompt = async () => {
        if (!selectedPrompt) return;

        const { error } = await supabase
            .from('ai_prompts')
            .update({
                template: selectedPrompt.template,
                description: selectedPrompt.description,
                updated_at: new Date()
            })
            .eq('id', selectedPrompt.id);

        if (error) alert("Error saving: " + error.message);
        else {
            alert("Prompt updated successfully via Supabase!");
            fetchPrompts();
        }
    };

    const handleCreatePrompt = async () => {
        if (!newPromptSlug) return;
        const { error } = await supabase
            .from('ai_prompts')
            .insert([{
                slug: newPromptSlug.toLowerCase().replace(/\s+/g, '_'),
                template: "Write your prompt here using {{variable}} syntax.",
                description: "New AI Prompt"
            }]);

        if (error) alert(error.message);
        else {
            setIsCreating(false);
            setNewPromptSlug("");
            fetchPrompts();
        }
    };

    const handleDeletePrompt = async (id) => {
        if (!confirm("Are you sure? This will break features using this prompt!")) return;
        await supabase.from('ai_prompts').delete().eq('id', id);
        fetchPrompts();
    };

    const handleTestRun = async () => {
        setIsTesting(true);
        let hydrated = selectedPrompt.template;
        Object.entries(testVariables).forEach(([key, val]) => {
            hydrated = hydrated.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
        });

        try {
            const result = await reliableGenerateContent(hydrated);
            setTestOutput(result);
        } catch (e) {
            setTestOutput("Error: " + e.message);
        }
        setIsTesting(false);
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
            {/* Sidebar */}
            <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
                <div className="p-6 border-b border-gray-700 flex items-center gap-3">
                    <div className="bg-indigo-500 p-2 rounded-lg text-white"><Terminal size={20} /></div>
                    <h1 className="font-bold text-lg tracking-wide">AI Engineer</h1>
                </div>

                <div className="p-4 border-b border-gray-700">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-all"
                    >
                        <Plus size={16} /> New Prompt
                    </button>
                    {isCreating && (
                        <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                            <input
                                autoFocus
                                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm focus:border-indigo-500 outline-none mb-2"
                                placeholder="slug_name (e.g. email_writer)"
                                value={newPromptSlug}
                                onChange={e => setNewPromptSlug(e.target.value)}
                            />
                            <button onClick={handleCreatePrompt} className="text-xs text-green-400 hover:text-green-300 font-bold mr-3">CONFIRM</button>
                            <button onClick={() => setIsCreating(false)} className="text-xs text-red-400 hover:text-red-300 font-bold">CANCEL</button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {prompts.map(p => (
                        <button
                            key={p.id}
                            onClick={() => handleSelectPrompt(p)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex justify-between items-center group ${selectedPrompt?.id === p.id
                                    ? 'bg-gray-700 text-white shadow-lg border-l-4 border-indigo-500'
                                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                                }`}
                        >
                            <span className="truncate">{p.slug}</span>
                            {selectedPrompt?.id === p.id && <Sparkles size={14} className="text-indigo-400" />}
                        </button>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-700">
                    <a href="/index.html" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
                        <LogOut size={16} /> Exit to App
                    </a>
                </div>
            </div>

            {/* Main Stage */}
            {selectedPrompt ? (
                <div className="flex-1 flex overflow-hidden">
                    {/* Editor Column */}
                    <div className="flex-1 flex flex-col border-r border-gray-700">
                        <header className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    {selectedPrompt.slug}
                                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded border border-gray-600">v1.0</span>
                                </h2>
                                <input
                                    className="bg-transparent border-none text-gray-400 text-sm w-full mt-1 focus:text-white focus:ring-0 px-0 placeholder:text-gray-600"
                                    value={selectedPrompt.description || ""}
                                    onChange={e => setSelectedPrompt({ ...selectedPrompt, description: e.target.value })}
                                    placeholder="Add a description..."
                                />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleDeletePrompt(selectedPrompt.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded"><Trash2 size={18} /></button>
                                <button onClick={handleSavePrompt} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all">
                                    <Save size={18} /> Save Changes
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 p-6 overflow-y-auto">
                            <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">System Prompt Template</label>
                            <textarea
                                className="w-full h-[calc(100%-2rem)] bg-gray-800 border-2 border-gray-700 rounded-xl p-6 font-mono text-sm leading-relaxed text-gray-300 focus:border-indigo-500 focus:ring-0 outline-none resize-none shadow-inner"
                                value={selectedPrompt.template}
                                onChange={e => {
                                    setSelectedPrompt({ ...selectedPrompt, template: e.target.value });
                                    // Auto-detect variables
                                    const matches = e.target.value.match(/\{\{(\w+)\}\}/g);
                                    if (matches) {
                                        const newVars = { ...testVariables };
                                        matches.forEach(m => {
                                            const key = m.replace(/\{\{|\}\}/g, '');
                                            if (!newVars[key]) newVars[key] = `Test ${key}`;
                                        });
                                        setTestVariables(newVars);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Test Playground Column */}
                    <div className="w-[450px] bg-gray-850 flex flex-col border-l border-gray-800 shadow-2xl">
                        <div className="p-6 border-b border-gray-700 bg-gray-900">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <RotateCcw size={16} /> Test Playground
                            </h3>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            {/* Inputs */}
                            <div className="space-y-4">
                                {Object.keys(testVariables).length === 0 ? (
                                    <p className="text-gray-500 text-sm italic text-center py-4">No variables detected in template (e.g. &#123;&#123;name&#125;&#125;)</p>
                                ) : (
                                    Object.entries(testVariables).map(([key, val]) => (
                                        <div key={key}>
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">{key}</label>
                                            <input
                                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                                                value={val}
                                                onChange={e => setTestVariables({ ...testVariables, [key]: e.target.value })}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={handleTestRun}
                                disabled={isTesting}
                                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-wait"
                            >
                                {isTesting ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
                                Run Test
                            </button>

                            {/* Output */}
                            {testOutput && (
                                <div className="mt-6 animate-in slide-in-from-bottom-5">
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Model Output</label>
                                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 font-mono leading-relaxed max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                                        {typeof testOutput === 'object' ? JSON.stringify(testOutput, null, 2) : testOutput}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                    <LayoutDashboard size={64} className="mb-4 opacity-20" />
                    <p className="font-medium text-lg">Select a prompt to edit</p>
                </div>
            )}
        </div>
    );
}
