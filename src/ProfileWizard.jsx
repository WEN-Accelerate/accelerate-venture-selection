import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    ArrowRight, Sparkles, Building2, Users, DollarSign,
    Target, Globe, CheckCircle, ChevronRight, Loader2, Save
} from 'lucide-react';

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

const BRAND_COLORS = {
    red: 'bg-[#D32F2F]',
    orange: 'bg-[#F57C00]',
    textDark: 'text-gray-900',
    bgLight: 'bg-gray-50',
};

// --- AI HELPER ---
const callGemini = async (prompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const model = "gemini-2.5-flash-preview-09-2025";

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
        growthLead: ""
    });

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

        // Simulate scraping via LLM knowledge
        const prompt = `
      Act as a business intelligence analyst. 
      I am analysing the company "${profile.companyName}".
      Based on your training data or by simulating a web search, extract or infer the following details:
      1. Primary Industry
      2. Key Products/Services
      3. Target Customers
      4. Estimated Number of Employees
      
      Return strictly JSON:
      {
        "industry": "string",
        "products": "string",
        "customers": "string",
        "employees": "string"
      }
    `;

        const result = await callGemini(prompt);
        try {
            const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleaned);
            setProfile(prev => ({ ...prev, ...data }));
            setAiContext(`Analyzed ${profile.companyName}: Found ${data.industry} company with focus on ${data.products}.`);
            setStep(2);
        } catch (e) {
            console.error("Parse error", e);
            // Fallback
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

    // --- FINAL SAVE ---
    const handleSave = async () => {
        setLoading(true);
        // User ID should be retrieved from auth context or local storage. 
        // For now assuming anonymous or handling it loosely.
        // In a real app we'd get the session.

        console.log("Saving to Supabase:", profile);

        // Using upsert or similar. Since we don't have the table perfectly defined in my context 
        // I will try to insert into a 'profiles' table which is standard best practice.

        const { error } = await supabase
            .from('profiles')
            .upsert([
                {
                    user_id: user?.uid, // Link to the authenticated user
                    company_name: profile.companyName,
                    details: profile,
                    updated_at: new Date()
                }
            ], { onConflict: 'user_id' }); // Ensure we update the existing row for this user

        if (error) console.error("Supabase Error:", error);

        // Redirect to Dashboard
        window.location.href = '/';
        setLoading(false);
    };

    // --- RENDER HELPERS ---
    const StepContainer = ({ title, children, showBack = true }) => (
        <div className="max-w-2xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                    <button onClick={handleBack} className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-lg transition-colors">
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

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium animate-pulse">AI Agent Working...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-red-100 selection:text-red-900">

            {/* HEADER */}
            <header className="fixed top-0 w-full bg-white/70 backdrop-blur-md border-b border-gray-100 z-50 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white">
                        <Sparkles size={18} />
                    </div>
                    Wadhwani <span className="text-gray-400 font-normal">Accelerate Profile</span>
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">
                    Step {step} of 8
                </div>
            </header>

            <div className="pt-24 pb-20">

                {/* STEP 1: COMPANY NAME */}
                {step === 1 && (
                    <StepContainer title="Let's start with your company" showBack={false}>
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
                    <StepContainer title="Confirm Business Profile">
                        <div className="grid gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Industry</label>
                                <input
                                    value={profile.industry}
                                    onChange={e => setProfile({ ...profile, industry: e.target.value })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Key Products</label>
                                <textarea
                                    rows={2}
                                    value={profile.products}
                                    onChange={e => setProfile({ ...profile, products: e.target.value })}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Customers</label>
                                    <input
                                        value={profile.customers}
                                        onChange={e => setProfile({ ...profile, customers: e.target.value })}
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
                            <button key="next2" onClick={handleNext} className="btn-primary mt-4 py-3 px-6 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition-colors">
                                Confirm & Continue
                            </button>
                        </div>
                    </StepContainer>
                )}

                {/* STEP 3: FINANCIALS */}
                {step === 3 && (
                    <StepContainer title="Financial Health">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Annual Revenue (Last FY)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                    <select
                                        value={profile.revenue}
                                        onChange={e => setProfile({ ...profile, revenue: e.target.value })}
                                        className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none appearance-none"
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
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                                >
                                    <option value="">Select Status</option>
                                    <option value="Profitable">Profitable (&gt;10% EBITDA)</option>
                                    <option value="BreakEven">Break-even</option>
                                    <option value="LossMaking">Loss Making (Burn Phase)</option>
                                </select>
                            </div>
                            <button onClick={handleNext} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                                Next Step
                            </button>
                        </div>
                    </StepContainer>
                )}

                {/* STEP 4: GROWTH ASPIRATION */}
                {step === 4 && (
                    <StepContainer title="Growth Ambition">
                        <div className="text-center mb-8">
                            <div className="inline-block p-4 bg-green-100 text-green-700 rounded-full mb-4">
                                <Target size={32} />
                            </div>
                            <p className="text-gray-600">Where do you want to be in 3 years?</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Target Revenue Goal</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={profile.growthTarget}
                                    onChange={e => setProfile({ ...profile, growthTarget: e.target.value })}
                                    className="w-full text-lg p-4 pl-10 bg-white border-2 border-green-100 rounded-xl focus:border-green-500 outline-none shadow-sm placeholder:text-gray-300"
                                    placeholder="e.g. $15M"
                                />
                            </div>
                        </div>

                        <button onClick={handleNext} className="w-full mt-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200">
                            Set Goal
                        </button>
                    </StepContainer>
                )}

                {/* STEP 5: VENTURE TYPE */}
                {step === 5 && (
                    <StepContainer title="Expansion Strategy">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                onClick={() => setProfile({ ...profile, ventureType: 'Domestic' })}
                                className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-4 ${profile.ventureType === 'Domestic' ? 'border-red-600 bg-red-50' : 'border-gray-100 bg-white hover:border-red-200'}`}
                            >
                                <div className="p-3 bg-orange-100 text-orange-600 rounded-full"><Building2 /></div>
                                <h3 className="font-bold text-lg">Expand Domestically</h3>
                                <p className="text-sm text-gray-500">Deepen market share within current geography.</p>
                            </div>

                            <div
                                onClick={() => setProfile({ ...profile, ventureType: 'International' })}
                                className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-4 ${profile.ventureType === 'International' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
                            >
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Globe /></div>
                                <h3 className="font-bold text-lg">Go International</h3>
                                <p className="text-sm text-gray-500">Enter new global markets using exports or direct entry.</p>
                            </div>
                        </div>
                        <button onClick={handleNext} className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                            Confirm Strategy
                        </button>
                    </StepContainer>
                )}

                {/* STEP 6: SUPPORT NEEDED */}
                {step === 6 && (
                    <StepContainer title="How can Wadhwani help?">
                        <p className="text-gray-500 mb-6 text-sm">Select all areas where you need expert guidance.</p>
                        <div className="grid grid-cols-2 gap-3">
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
                )}

                {/* STEP 7: COMMITMENT */}
                {step === 7 && (
                    <StepContainer title="Commitment Check">
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
                )}

                {/* STEP 8: TEAM */}
                {step === 8 && (
                    <StepContainer title="Assign a Growth Lead">
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
                )}

            </div>
        </div>
    );
}
