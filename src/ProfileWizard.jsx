import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    ArrowRight, Sparkles, Building2, Users, DollarSign,
    Target, Globe, CheckCircle, ChevronRight, Loader2, Save,
    Mic, MessageSquare, Send, Info, X
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// --- FIREBASE SETUP ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
// Fallback for dev if __firebase_config is missing
if (!firebaseConfig.apiKey) {
    console.warn("Firebase Config missing in wizard, using mock.");
}
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- CONFIG ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// WADHWANI BRAND ASSETS
const WADHWANI_LOGO_URL = "/wf-logo.png"; // Local public asset


const BRAND_COLORS = {
    red: 'bg-[#D32F2F]',
    orange: 'bg-[#F57C00]',
    textDark: 'text-gray-900',
    bgLight: 'bg-gray-50',
};

// --- AI HELPER ---
const callGemini = async (prompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const model = "gemini-2.0-flash-exp";

    if (!apiKey) return "AI simulation: Gemini response placeholder.";

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );
        if (!response.ok) throw new Error('Gemini API Error');
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "AI Error: Could not generate response.";
    }
};

// --- RENDER HELPERS ---
// Moved outside to prevent re-render focus loss
const StepContainer = ({ title, children, showBack = true, onBack, aiContext }) => (
    <div className="max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-2">{title}</h1>
            <div className="h-1 w-20 bg-gradient-to-r from-red-600 to-orange-500 rounded-full"></div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl p-8 relative overflow-hidden">
            {/* Glassmorphism decorations */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-red-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

            <div className="relative z-10 space-y-6">
                {children}
            </div>
        </div>

        <div className="flex justify-between mt-8 items-center">
            {showBack && (
                <button onClick={onBack} className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-lg transition-colors">
                    Back
                </button>
            )}
            <div className="flex-1"></div>
            {/* Context Bubble */}
            {aiContext && (
                <div className="mr-4 text-xs font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 max-w-xs truncate">
                    AI Context: {aiContext}
                </div>
            )}
        </div>
    </div>
);

export default function ProfileWizard() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [aiContext, setAiContext] = useState("");

    const [profile, setProfile] = useState({
        companyName: "",
        industry: "",
        products: "",
        customers: "",
        employees: "",
        revenue: "",
        profitability: "",
        growthTarget: "",
        ventureType: "Domestic",
        supportNeeded: [],
        commitmentHours: "",
        growthLead: "",
        keyPersonnel: "",
        strategyDescription: ""
    });

    // Chat State
    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', text: 'I can help refine your strategy. What are your main concerns about expansion?' }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [showLearnMore, setShowLearnMore] = useState(false);
    const [learnMoreData, setLearnMoreData] = useState(null); // Changed to object for structured UI
    const [learnMoreLoading, setLearnMoreLoading] = useState(false);

    // Auth State
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                // If not logged in, maybe redirect back to login? 
                // For now, we allow guest access but saving might need an ID.
                // We generate a random one if guest.
                const guestId = localStorage.getItem('accelerate_guest_id') || `guest_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem('accelerate_guest_id', guestId);
                setUser({ uid: guestId, isAnonymous: true });
            }
        });
        return () => unsubscribe();
    }, []);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    // --- STEP 1: SCRAPE ---
    const handleScrape = async () => {
        if (!profile.companyName) return;
        setLoading(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
            // Use the new Google Gen AI SDK for deep research with Grounding
            const ai = new GoogleGenAI({ apiKey });

            const prompt = `Perform comprehensive research on the company: "${profile.companyName}". 
            Provide details for the following fields:
            - Exact Legal Name
            - Industry Category
            - Detailed Description of Business
            - Promoter/Founder/Director Details
            - GST Number (if publicly available)
            - Key Products/Services Offered
            - Primary Customer Segments (B2B, B2C, target audience)
            - Estimated Employee Count (Approximate range)
            - Current Market Standing
            
            Be as factual as possible using search results.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            industry: { type: Type.STRING },
                            description: { type: Type.STRING },
                            promoters: { type: Type.ARRAY, items: { type: Type.STRING } },
                            products: { type: Type.ARRAY, items: { type: Type.STRING } },
                            customers: { type: Type.ARRAY, items: { type: Type.STRING } },
                            marketPosition: { type: Type.STRING },
                            employees: { type: Type.STRING }
                        },
                        required: ["name", "industry", "description", "promoters", "products", "customers", "employees"]
                    }
                }
            });

            // Handle potential null/undefined text - try property first, then method if exists
            let rawText = response.text;
            if (typeof rawText === 'function') {
                rawText = rawText(); // handle if it's a method in this SDK version
            }
            if (!rawText) rawText = "{}";

            console.log("AI Raw Response:", rawText); // DEBUG
            const data = JSON.parse(rawText);
            console.log("Parsed Data:", data); // DEBUG

            if (!data.name && !data.industry) {
                console.warn("AI returned empty structured data.");
                throw new Error("Empty AI Data");
            }

            setProfile(prev => ({
                ...prev,
                companyName: data.name || prev.companyName,
                industry: data.industry || "",
                products: data.products?.join(", ") || "",
                customers: data.customers?.join(", ") || "",
                employees: data.employees || "",
                keyPersonnel: data.promoters?.join(", ") || "",
                // Heuristic: If we found promoters, use the first one as potential lead suggestion
                growthLead: (data.promoters && data.promoters.length > 0) ? data.promoters[0] : prev.growthLead
            }));

            setAiContext(`Analyzed ${data.name || profile.companyName}. Industry: ${data.industry}. Position: ${data.marketPosition || 'N/A'}`);
            setStep(2);

        } catch (e) {
            console.error("Deep Research Error", e);
            // Fallback to simple simulation or just proceed
            setAiContext(`Could not auto-analyze. Please fill manually.`);
            setStep(2);
        }
        setLoading(false);
    };

    // --- STEP 6: SUPPORT OPTIONS ---
    const supportOptions = [
        { id: 'Product', label: 'Help with Product', icon: Target },
        { id: 'Plan', label: 'Help with Plan', icon: Sparkles },
        { id: 'Sales', label: 'Help with Sales', icon: DollarSign },
        { id: 'People', label: 'Help with People', icon: Users },
        { id: 'Process', label: 'Help Fix Process', icon: Building2 },
        { id: 'Money', label: 'Help Get Money', icon: DollarSign },
    ];

    const toggleSupport = (id) => {
        setProfile(prev => {
            const exists = prev.supportNeeded.includes(id);
            return {
                ...prev,
                supportNeeded: exists
                    ? prev.supportNeeded.filter(x => x !== id)
                    : [...prev.supportNeeded, id]
            };
        });
    };

    const handleChatSubmit = async () => {
        if (!chatInput.trim()) return;
        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput("");

        // Context-aware AI response
        const prompt = `
            Act as a Senior Growth Consultant for:
            Company: ${profile.companyName}
            Industry: ${profile.industry}
            Product: ${profile.products}
            Employees: ${profile.employees}
            Current Revenue: ${profile.revenue}
            
            Context: The user is defining their "${profile.ventureType}" expansion strategy.
            User Question: "${userMsg}"
            
            Provide a short, specific, and high-impact piece of advice (max 2 sentences).
        `;
        const reply = await callGemini(prompt);
        setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    };

    const handleLearnMore = async (selectedType) => {
        setShowLearnMore(true);
        setLearnMoreLoading(true);
        setLearnMoreData(null);

        // Analyze SPECIFICALLY the selected type
        const typeToAnalyze = selectedType || profile.ventureType;

        const prompt = `
            Analyze the strategy: "${typeToAnalyze} Expansion" for:
            Company: ${profile.companyName}
            Industry: ${profile.industry}
            Products: ${profile.products}
            Customers: ${profile.customers}
            Revenue: ${profile.revenue}

            Task: Provide a strategic analysis for this SPECIFIC choice.
            Return a JSON object:
            {
                "type": "QUICK WIN" or "LONG TERM BET",
                "title": "Strategy Headline (e.g. Dominate Local Niche)",
                "recommendation": "One paragraph strategic rationale.",
                "execution_steps": ["Step 1", "Step 2", "Step 3"],
                "impact": "Projected outcome..."
            }
            Return strictly JSON.
        `;

        try {
            const raw = await callGemini(prompt);
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            setLearnMoreData([JSON.parse(clean)]); // Wrap in array to keep map logic or refactor
        } catch (e) {
            console.error("AI Error", e);
            setLearnMoreData([{
                title: `${typeToAnalyze} EXECUTION PLAN`,
                type: "RECOMMENDED PATH",
                recommendation: `Focus on ${typeToAnalyze.toLowerCase()} markets to leverage your current strengths in ${profile.industry}.`,
                execution_steps: ["Audit current capabilities", "Identify key pilot markets", "Align sales incentives"],
                impact: "Steady revenue growth with manageable risk."
            }]);
        }
        setLearnMoreLoading(false);
    };

    // --- FINAL SAVE ---
    const handleSave = async () => {
        if (!user || !user.uid) {
            alert("Authentication missing. Please reload or sign in.");
            return;
        }

        setLoading(true);
        console.log("Saving to Supabase for User:", user.uid);

        const { error } = await supabase
            .from('profiles')
            .upsert([
                {
                    user_id: user.uid,
                    company_name: profile.companyName,
                    details: profile,
                    updated_at: new Date()
                }
            ], { onConflict: 'user_id' });

        if (error) {
            console.error("Supabase Error:", error);
            // FALLBACK: Save to LocalStorage so the user can still proceed!
            console.log("Falling back to local storage...");
            localStorage.setItem('user_profile_data', JSON.stringify({
                companyName: profile.companyName,
                details: profile,
                updated_at: new Date()
            }));

            alert(`Note: Database request failed (${error.message}). \n\nWe saved your profile locally so you can continue to the dashboard.`);
            window.location.href = '/';
            setLoading(false);
            return;
        }

        // on successful save, clear local fallback to avoid confusion
        localStorage.removeItem('user_profile_data');

        // Redirect to Dashboard
        window.location.href = '/';
        setLoading(false);
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium animate-pulse">AI Agent Working...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-red-100 selection:text-red-900">

            {/* HEADER */}
            <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <img src={WADHWANI_LOGO_URL} alt="Wadhwani Foundation" className="h-10" />
                    <div className="h-6 w-px bg-gray-300 mx-1"></div>
                    <span className="font-semibold text-gray-700 tracking-tight">Venture Profile</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Step {step} of 9
                    </div>
                    {/* Progress Bar */}
                    <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#D32F2F] to-[#F57C00] transition-all duration-300 ease-out"
                            style={{ width: `${(step / 9) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </header>

            <div className="pt-28 pb-20">

                {/* STEP 1: COMPANY NAME */}
                {step === 1 && (
                    <StepContainer
                        title="Let's start about your company"
                        showBack={false}
                        aiContext={aiContext}
                    >
                        <p className="-mt-6 mb-6 text-gray-500">We'll use AI to pre-fill your business details.</p>
                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-gray-700">Company Name</label>
                            <input
                                type="text"
                                value={profile.companyName}
                                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                                className="w-full text-2xl p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all placeholder:text-gray-300 font-light"
                                placeholder="e.g. Acme Industries"
                                autoFocus
                            />
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                <Sparkles size={14} className="text-indigo-500" />
                                AI will attempt to auto-fill your profile details on the next page.
                            </p>
                            <button
                                onClick={handleScrape}
                                disabled={!profile.companyName}
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                Analyze Company <ArrowRight size={18} />
                            </button>
                        </div>
                    </StepContainer>
                )}

                {/* STEP 2: AUTO-POPULATED INFO */}
                {step === 2 && (
                    <StepContainer
                        title="Confirm Business Profile"
                        onBack={handleBack}
                        aiContext={aiContext}
                    >
                        <p className="-mt-6 mb-6 text-gray-500 border-b pb-4">Review and edit your company's details retrieved by the AI.</p>

                        <div className="space-y-6">
                            {/* Short Fields Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Industry</label>
                                    <input
                                        value={profile.industry}
                                        onChange={e => setProfile({ ...profile, industry: e.target.value })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Employees</label>
                                    <input
                                        value={profile.employees}
                                        onChange={e => setProfile({ ...profile, employees: e.target.value })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Long Fields (Single Column) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Key Products / Services</label>
                                <textarea
                                    rows={3}
                                    value={profile.products}
                                    onChange={e => setProfile({ ...profile, products: e.target.value })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Customers</label>
                                <textarea
                                    rows={2}
                                    value={profile.customers}
                                    onChange={e => setProfile({ ...profile, customers: e.target.value })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Key Personnel / Directors</label>
                                <input
                                    value={profile.keyPersonnel}
                                    onChange={e => setProfile({ ...profile, keyPersonnel: e.target.value })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                    placeholder="e.g. John Doe (CEO), Jane Smith (CTO)"
                                />
                            </div>

                            <button key="next2" onClick={handleNext} className="w-full btn-primary py-3 px-6 bg-[#D32F2F] text-white rounded-lg font-bold hover:bg-[#B71C1C] transition-colors shadow-lg shadow-red-100">
                                Confirm & Continue
                            </button>
                        </div>
                    </StepContainer>
                )}

                {/* STEP 3: FINANCIALS */}
                {step === 3 && (
                    <StepContainer title="Financial Health" onBack={handleBack} aiContext={aiContext}>
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Last Fiscal Year Performance</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            Annual Revenue <Info size={14} className="text-gray-400" />
                                        </label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                            <select
                                                value={profile.revenue}
                                                onChange={e => setProfile({ ...profile, revenue: e.target.value })}
                                                className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="">Select Revenue Range</option>
                                                <option value="<1M">&lt; $1M / ₹8Cr</option>
                                                <option value="1M-5M">$1M - $5M</option>
                                                <option value="5M-20M">$5M - $20M</option>
                                                <option value=">20M">&gt; $20M</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Profitability Indicator</label>
                                        <select
                                            value={profile.profitability}
                                            onChange={e => setProfile({ ...profile, profitability: e.target.value })}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none cursor-pointer"
                                        >
                                            <option value="">Select Status</option>
                                            <option value="Profitable">Profitable (&gt;10% EBITDA)</option>
                                            <option value="BreakEven">Break-even</option>
                                            <option value="LossMaking">Loss Making (Burn Phase)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleNext} className="w-full py-3 bg-[#D32F2F] text-white rounded-xl font-bold hover:bg-[#B71C1C] transition-colors shadow-lg shadow-red-100">
                                Continue
                            </button>
                        </div>
                    </StepContainer>
                )}

                {/* STEP 4: GROWTH ASPIRATION */}
                {step === 4 && (
                    <StepContainer title="Growth Ambition" onBack={handleBack} aiContext={aiContext}>
                        <div className="text-center mb-8">
                            <div className="inline-block p-4 bg-red-50 text-[#D32F2F] rounded-full mb-4">
                                <Target size={32} />
                            </div>
                            <p className="text-gray-600 font-medium">Enter your revenue goal (in USD) for 3 years from now.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Target Revenue Goal</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-4 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={profile.growthTarget}
                                    onChange={e => {
                                        // Numeric validation
                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                        setProfile({ ...profile, growthTarget: val });
                                    }}
                                    onBlur={() => {
                                        // Format on blur
                                        if (profile.growthTarget && !profile.growthTarget.includes('M')) {
                                            // Simple formatter placeholder
                                        }
                                    }}
                                    className="w-full text-2xl p-4 pl-12 bg-white border-2 border-gray-200 rounded-xl focus:border-[#D32F2F] outline-none shadow-sm placeholder:text-gray-300 font-bold"
                                    placeholder="15,000,000"
                                />
                                {profile.growthTarget && !isNaN(profile.growthTarget) && (
                                    <p className="text-xs text-green-600 mt-2 font-medium">
                                        Reads as: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(profile.growthTarget)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={!profile.growthTarget}
                            className="w-full mt-8 py-3 bg-[#D32F2F] text-white rounded-xl font-bold hover:bg-[#B71C1C] transition-colors shadow-lg shadow-red-100 disabled:opacity-50"
                        >
                            Set Goal
                        </button>
                    </StepContainer>
                )}

                {/* STEP 5: VENTURE TYPE */}
                {step === 5 && (
                    <StepContainer title="Expansion Strategy" onBack={handleBack} aiContext={aiContext}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                onClick={() => {
                                    setProfile({ ...profile, ventureType: 'Domestic' });
                                    handleLearnMore('Domestic');
                                }}
                                className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-4 ${profile.ventureType === 'Domestic' ? 'border-red-600 bg-red-50' : 'border-gray-100 bg-white hover:border-red-200'}`}
                            >
                                <div className="p-3 bg-orange-100 text-orange-600 rounded-full"><Building2 /></div>
                                <h3 className="font-bold text-lg">Expand Domestically</h3>
                                <p className="text-sm text-gray-500">Deepen market share within current geography.</p>
                            </div>

                            <div
                                onClick={() => {
                                    setProfile({ ...profile, ventureType: 'International' });
                                    handleLearnMore('International');
                                }}
                                className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-4 ${profile.ventureType === 'International' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
                            >
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Globe /></div>
                                <h3 className="font-bold text-lg">Go International</h3>
                                <p className="text-sm text-gray-500">Enter new global markets using exports or direct entry.</p>
                            </div>
                        </div>
                        <button key="next5" onClick={handleNext} className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                            Confirm Strategy
                        </button>

                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={() => handleLearnMore(null)}
                                className="text-sm font-semibold text-indigo-600 flex items-center gap-2 hover:underline"
                            >
                                <Info size={16} /> Learn more about these options
                            </button>
                        </div>
                    </StepContainer>
                )}



                {/* --- GLOBAL AI PANEL (Rendered outside StepContainer for stacking context) --- */}
                {showLearnMore && (
                    <div className="fixed top-0 right-0 h-full w-full md:w-[45%] bg-[#0f172a] shadow-2xl z-[100] border-l border-gray-800 animate-in slide-in-from-right duration-500 flex flex-col">

                        {/* Header Section */}
                        <div className="sticky top-0 bg-[#0f172a]/95 backdrop-blur z-10 px-8 py-6 border-b border-gray-800 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold text-xs tracking-widest uppercase">
                                    <Sparkles size={14} /> Strategic Intelligence
                                </div>
                                <h3 className="text-2xl font-bold text-white leading-tight">
                                    Contextual Analysis
                                </h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    For <span className="text-white font-medium">{profile.companyName}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowLearnMore(false)}
                                className="absolute top-6 right-6 text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
                                title="Close Panel"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                            {learnMoreLoading ? (
                                <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-20 animate-pulse"></div>
                                        <Loader2 className="relative w-16 h-16 text-yellow-500 animate-spin" />
                                    </div>
                                    <p className="mt-8 text-gray-400 font-medium text-lg animate-pulse">
                                        Synthesizing market data...
                                    </p>
                                    <p className="text-gray-600 text-sm mt-2">Comparing growth vectors for your industry</p>
                                </div>
                            ) : (
                                learnMoreData?.map((item, idx) => (
                                    <div key={idx} className="group relative">
                                        {/* Connecting Line for timeline effect */}
                                        {idx !== learnMoreData.length - 1 && (
                                            <div className="absolute left-6 top-16 bottom-[-32px] w-0.5 bg-gray-800 group-hover:bg-gray-700 transition-colors"></div>
                                        )}

                                        <div className="relative bg-[#1e293b] rounded-2xl p-6 border border-gray-700 hover:border-yellow-500/50 transition-all shadow-lg hover:shadow-yellow-500/5">
                                            {/* Badge */}
                                            <div className="flex items-center justify-between mb-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${item.type.includes('WIN') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                    {item.type.includes('WIN') ? <CheckCircle size={12} /> : <Target size={12} />}
                                                    {item.type}
                                                </span>
                                                <div className="text-gray-500 opacity-20">
                                                    {item.title.includes('DOMESTIC') ? <Building2 size={24} /> : <Globe size={24} />}
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h4 className="text-xl font-bold text-white mb-3 tracking-tight">{item.title}</h4>

                                            {/* Body */}
                                            <p className="text-gray-300 text-sm leading-relaxed mb-6 border-l-2 border-gray-700 pl-4">
                                                {item.recommendation}
                                            </p>

                                            {/* Execution Steps */}
                                            {item.execution_steps && (
                                                <div className="mb-6">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Execution Strategy</p>
                                                    <ul className="space-y-2">
                                                        {item.execution_steps.map((step, sIdx) => (
                                                            <li key={sIdx} className="text-sm text-gray-300 flex items-start gap-2">
                                                                <div className="mt-1.5 w-1 h-1 rounded-full bg-yellow-400"></div>
                                                                {step}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Impact Box */}
                                            <div className="bg-[#0f172a] rounded-xl p-4 flex gap-4 border border-gray-800">
                                                <div className="mt-1 min-w-[20px]">
                                                    <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Projected Impact</div>
                                                    <div className="text-sm font-medium text-yellow-50 leading-tight">
                                                        {item.impact}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-800 bg-[#0f172a] text-center">
                            <p className="text-xs text-gray-500">
                                AI inputs based on {profile.industry} trends & public market data.
                            </p>
                        </div>
                    </div>
                )}


                {/* STEP 6: STRATEGY DESCRIPTION (NEW) */}
                {
                    step === 6 && (
                        <StepContainer title="Describe your Strategy" onBack={handleBack} aiContext={aiContext}>
                            <div className="space-y-6">
                                <p className="text-gray-600 text-sm">Tell us more about how you plan to execute this. Use the AI chat for help.</p>

                                <div className="relative">
                                    <textarea
                                        rows={4}
                                        value={profile.strategyDescription}
                                        onChange={e => setProfile({ ...profile, strategyDescription: e.target.value })}
                                        className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none pr-12"
                                        placeholder="e.g. We plan to partner with local distributors..."
                                    />
                                    <button className="absolute right-4 bottom-4 p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors" title="Record Voice">
                                        <Mic size={20} />
                                    </button>
                                </div>

                                {/* AI Chat Interface */}
                                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                    <div className="flex items-center gap-2 mb-3 text-indigo-800 font-bold text-xs uppercase tracking-wide">
                                        <Sparkles size={14} /> AI Strategy Assistant
                                    </div>
                                    <div className="h-32 overflow-y-auto mb-3 space-y-2 pr-2">
                                        {chatMessages.map((msg, i) => (
                                            <div key={i} className={`text-sm p-2 rounded-lg ${msg.role === 'user' ? 'bg-white ml-auto max-w-[80%]' : 'bg-indigo-100 mr-auto max-w-[90%]'}`}>
                                                {msg.text}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleChatSubmit()}
                                            className="flex-1 p-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-400"
                                            placeholder="Ask for suggestions..."
                                        />
                                        <button onClick={handleChatSubmit} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>

                                <button onClick={handleNext} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                                    Next
                                </button>
                            </div>
                        </StepContainer>
                    )
                }

                {/* STEP 7: SUPPORT NEEDED */}
                {
                    step === 7 && (
                        <StepContainer title="How can Wadhwani help?" onBack={handleBack} aiContext={aiContext}>
                            <p className="text-gray-500 mb-6 text-sm">Select all areas where you need expert guidance.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {supportOptions.map(opt => (
                                    <div
                                        key={opt.id}
                                        onClick={() => toggleSupport(opt.id)}
                                        className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center gap-3 ${profile.supportNeeded.includes(opt.id) ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                    >
                                        <opt.icon size={18} className={profile.supportNeeded.includes(opt.id) ? 'text-red-600' : 'text-gray-400'} />
                                        <span className={`text-sm font-semibold ${profile.supportNeeded.includes(opt.id) ? 'text-red-900' : 'text-gray-600'}`}>{opt.label}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleNext} className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                                Next
                            </button>
                        </StepContainer>
                    )
                }

                {/* STEP 8: COMMITMENT */}
                {
                    step === 8 && (
                        <StepContainer title="Commitment Check" onBack={handleBack} aiContext={aiContext}>
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">Are you willing to dedicate 4-6 hours per week specifically to drive this initiative?</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="radio"
                                            name="commitment"
                                            value="Yes"
                                            onChange={e => setProfile({ ...profile, commitmentHours: e.target.value })}
                                            checked={profile.commitmentHours === 'Yes'}
                                            className="w-5 h-5 text-red-600"
                                        />
                                        <span className="font-medium">Yes, I am fully committed.</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="radio"
                                            name="commitment"
                                            value="No"
                                            onChange={e => setProfile({ ...profile, commitmentHours: e.target.value })}
                                            checked={profile.commitmentHours === 'No'}
                                            className="w-5 h-5 text-red-600"
                                        />
                                        <span className="font-medium">No, I can't spare that much time right now.</span>
                                    </label>
                                </div>
                            </div>
                            <button
                                onClick={handleNext}
                                disabled={!profile.commitmentHours}
                                className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                            >
                                Almost Done
                            </button>
                        </StepContainer>
                    )
                }

                {/* STEP 9: TEAM */}
                {
                    step === 9 && (
                        <StepContainer title="Assign a Growth Lead" onBack={handleBack} aiContext={aiContext}>
                            <div className="space-y-6">
                                <p className="text-gray-600 text-sm">Success requires ownership. Who will be the dedicated 'Growth Lead' from your team to own the sprint deliverables?</p>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lead Name / Role</label>
                                    <input
                                        type="text"
                                        value={profile.growthLead}
                                        onChange={e => setProfile({ ...profile, growthLead: e.target.value })}
                                        className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-lg"
                                        placeholder="e.g. Sarah J. (Marketing Head)"
                                    />
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={!profile.growthLead}
                                    className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Save size={20} /> Complete Profile & Launch
                                </button>
                            </div>
                        </StepContainer>
                    )
                }

            </div >
        </div >
    );
}
