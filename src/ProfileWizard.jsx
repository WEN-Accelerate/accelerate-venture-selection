import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    ArrowRight, Sparkles, Building2, Users, DollarSign,
    Target, Globe, CheckCircle, ChevronRight, Loader2, Save,
    Mic, MessageSquare, Send, Info, X
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

import netlifyIdentity from 'netlify-identity-widget';

// --- CONFIG ---

// --- CONFIG ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// WADHWANI BRAND ASSETS
const WADHWANI_LOGO_URL = "/Logo WF.png"; // Local public asset


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
    const [supportStep, setSupportStep] = useState(0); // For Step 8 pagination
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
        strategyDescription: "",
        strategyDimensions: { product: "", proposition: "", place: "", promotion: "" },
        supportDetails: {} // { "Product_MVP": "WF", "Product_Design": "Self" }
    });

    const [hypotheticalExamples, setHypotheticalExamples] = useState({ domestic: "", international: "" });
    const [onePageSummary, setOnePageSummary] = useState("");
    const [onePageLoading, setOnePageLoading] = useState(false);

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
        // Initialize Netlify Identity
        netlifyIdentity.init();

        const currentUser = netlifyIdentity.currentUser();
        if (currentUser) {
            setUser({
                uid: currentUser.id, // Map Netlify ID to uid for consistency
                email: currentUser.email,
                isAnonymous: false
            });
        } else {
            // Guest Logic
            const guestId = localStorage.getItem('accelerate_guest_id') || `guest_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('accelerate_guest_id', guestId);
            setUser({ uid: guestId, isAnonymous: true });
        }

        // Listen for Login during wizard usage
        netlifyIdentity.on('login', (u) => {
            setUser({
                uid: u.id,
                email: u.email,
                isAnonymous: false
            });
        });

    }, []);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    // --- STEP 1: SCRAPE ---
    // --- STEP 1: SCRAPE ---
    const handleScrape = async () => {
        if (!profile.companyName) return;
        setLoading(true);
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
        const ai = new GoogleGenAI({ apiKey });

        // Helper to parse loose JSON
        const parseLooseJson = (text) => {
            try {
                const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(clean);
            } catch (e) {
                console.error("JSON Parse Failed", e);
                return {};
            }
        };

        try {
            console.log("Attempting Deep Search with gemini-2.0-flash-exp...");
            // ATTEMPT 1: Deep Search with gemini-2.0-flash-exp
            const prompt = `Research the company "${profile.companyName}".
            Return a JSON object with these exact keys:
            {
                "name": "Legal Name",
                "industry": "Industry Category",
                "description": "2 sentence description",
                "promoters": ["Name 1", "Name 2"],
                "products": ["Product 1", "Product 2"],
                "customers": ["Segment 1"],
                "marketPosition": "Current standing",
                "employees": "Estimated count (e.g. 100-500)"
            }
            If specific data is not found, make a best guess or leave empty. Return ONLY JSON.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp",
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    // Relaxed schema: we parse manually to avoid validation errors on partial data
                }
            });

            // Handle response
            let rawText = response.text;
            if (typeof rawText === 'function') rawText = rawText();
            if (!rawText) throw new Error("Empty response from Search model");

            console.log("Search Response:", rawText);
            const data = parseLooseJson(rawText);

            if (!data.name && !data.industry) {
                throw new Error("Search returned not useful data");
            }

            // Success Update
            setProfile(prev => ({
                ...prev,
                companyName: data.name || prev.companyName,
                industry: data.industry || "",
                products: Array.isArray(data.products) ? data.products.join(", ") : (data.products || ""),
                customers: Array.isArray(data.customers) ? data.customers.join(", ") : (data.customers || ""),
                employees: data.employees || "",
                keyPersonnel: Array.isArray(data.promoters) ? data.promoters.join(", ") : (data.promoters || ""),
                growthLead: (Array.isArray(data.promoters) && data.promoters.length > 0) ? data.promoters[0] : prev.growthLead
            }));
            setAiContext(`Analyzed ${data.name}. Source: Deep Search.`);
            setStep(2);

        } catch (error) {
            console.warn("Deep Search Failed, falling back to Internal Knowledge...", error);

            try {
                // ATTEMPT 2: Fallback to gemini-1.5-flash (Internal Knowledge)
                const fallbackPrompt = `Act as a business analyst. Analyze company "${profile.companyName}".
                Return JSON with: name, industry, description, promoters (array), products (array), customers (array), employees, marketPosition.`;

                const response = await ai.models.generateContent({
                    model: "gemini-1.5-flash",
                    contents: fallbackPrompt
                });

                let rawText = response.text;
                if (typeof rawText === 'function') rawText = rawText();
                const data = parseLooseJson(rawText || "{}");

                setProfile(prev => ({
                    ...prev,
                    companyName: data.name || prev.companyName,
                    industry: data.industry || "",
                    products: Array.isArray(data.products) ? data.products.join(", ") : (data.products || ""),
                    customers: Array.isArray(data.customers) ? data.customers.join(", ") : (data.customers || ""),
                    employees: data.employees || "",
                    keyPersonnel: Array.isArray(data.promoters) ? data.promoters.join(", ") : (data.promoters || ""),
                }));
                setAiContext(`Analyzed ${profile.companyName} using Internal Knowledge.`);
                setStep(2);

            } catch (finalError) {
                console.error("All AI attempts failed", finalError);
                setAiContext("Could not auto-analyze. Please fill manually.");
                setStep(2);
            }
        }
        setLoading(false);
    };

    // --- STEP 4 HELPERS ---
    const generateHypotheticalExamples = async () => {
        if (hypotheticalExamples.domestic) return; // Already loaded
        setLoading(true);
        const prompt = `
            Context: Company ${profile.companyName}, Industry: ${profile.industry}, Product: ${profile.products}.
            Generate 2 hypothetical expansion scenarios (2 sentences each):
            1. Domestic Expansion Scenario
            2. International Expansion Scenario
            
            Return JSON: { "domestic": "string", "international": "string" }
        `;
        try {
            const raw = await callGemini(prompt);
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(clean);
            setHypotheticalExamples({
                domestic: data.domestic || "Expand to adjacent cities...",
                international: data.international || "Export to Southeast Asia..."
            });
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }

    useEffect(() => {
        if (step === 4) generateHypotheticalExamples();
        if (step === 9) generateOnePager();
    }, [step]);

    // --- STEP 8: SUPPORT DETAILS ---
    // Reordered for 2-screen split: Screen 1 (Growth/Market) vs Screen 2 (Ops/Finance)
    const SUPPORT_SUB_DOMAINS = {
        'Product': ['Market Fit', 'Feature Roadmap', 'Tech Stack', 'UI/UX Design', 'Quality QA'],
        'Selling': ['Sales Scripting', 'Lead Generation', 'CRM Setup', 'Sales Training', 'Closing Strategies'],
        'Placement': ['Channel Entry', 'Logistics Setup', 'E-commerce Ops', 'Retail Partnerships', 'Supply Chain'],
        'Money': ['Fundraising', 'Valuation', 'Financial Modeling', 'Grant Strategy', 'Cash Flow'],
        'People': ['Org Structure', 'Hiring Key Roles', 'ESOP Planning', 'Culture Building', 'Performance Mgmt'],
        'Process': ['Legal / Compliance', 'Accounting Setup', 'Agile Implementation', 'KPI Dashboards', 'Ops Manuals']
    };

    const handleSupportDetailChange = (category, subItem, value) => {
        setProfile(prev => {
            // Rule: Max 5 "WF" selections
            if (value === 'WF') {
                const currentWFCount = Object.values(prev.supportDetails).filter(v => v === 'WF').length;
                const isAlreadyWF = prev.supportDetails[`${category}_${subItem}`] === 'WF';

                if (currentWFCount >= 5 && !isAlreadyWF) {
                    alert("Focus limit reached! You can select a maximum of 5 areas for Wadhwani Support.");
                    return prev;
                }
            }

            return {
                ...prev,
                supportDetails: {
                    ...prev.supportDetails,
                    [`${category}_${subItem}`]: value
                }
            };
        });
    };

    const handleSubItemLearnMore = async (category, subItem) => {
        const prompt = `Explain what "${subItem}" involves in the context of "${category}" for a startup. Keep it to 1 sentence.`;
        const res = await callGemini(prompt);
        alert(`${subItem} (${category}):\n\n${res}`);
    };

    const handleSupportNext = () => {
        if (supportStep < 1) { // 2 pages total (0, 1)
            setSupportStep(prev => prev + 1);
        } else {
            handleNext();
        }
    };

    const handleSupportBack = () => {
        if (supportStep > 0) {
            setSupportStep(prev => prev - 1);
        } else {
            handleBack();
        }
    };

    const generateOnePager = async () => {
        setOnePageLoading(true);
        const prompt = `
            Generate a "One Page Executive Summary" for ${profile.companyName}'s expansion strategy.
            Data:
            - Goal: Reach ${profile.growthTarget} in 4 years.
            - Strategy: ${profile.ventureType} Expansion.
            - Description: ${profile.strategyDescription}
            - 4Ps: ${JSON.stringify(profile.strategyDimensions)}
            - Help Needed: ${Object.entries(profile.supportDetails).filter(([k, v]) => v === 'WF').map(([k]) => k).join(', ')}

            Format as a cohesive narrative (approx 200 words).
        `;
        const res = await callGemini(prompt);
        setOnePageSummary(res);
        setOnePageLoading(false);
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

        const typeToAnalyze = selectedType || profile.ventureType;

        const prompt = `
            Context: Company ${profile.companyName}, Industry: ${profile.industry}.
            Goal: ${typeToAnalyze} Expansion.
            
            Generate 6 distinct, hypothetical expansion scenarios (strategies) for this company.
            Each should be different (e.g. M&A, Organic, Partnership, Digital-First, etc.).
            
            Return JSON array of objects:
            [
                {
                    "title": "Strategy Name",
                    "recommendation": "2 sentence description of this specific approach.",
                    "type": "SCENARIO"
                }
            ]
            Return strictly JSON.
        `;

        try {
            const raw = await callGemini(prompt);
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);
            setLearnMoreData(Array.isArray(parsed) ? parsed : [parsed]);
        } catch (e) {
            console.error("AI Error", e);
            setLearnMoreData([{
                title: "Standard Expansion",
                type: "SCENARIO",
                recommendation: "Expand geographically using current product lines."
            }]);
        }
        setLearnMoreLoading(false);
    };

    const handleSelectStrategy = (strategyDescription) => {
        setProfile(prev => ({
            ...prev,
            strategyDescription: strategyDescription
        }));
        setShowLearnMore(false);
        // Optionally move to next step automatically or let user review
        // setStep(5); 
    };

    const handleSuggestDimensions = async () => {
        setLoading(true);
        const prompt = `
            Act as a Strategy Consultant for ${profile.companyName} (${profile.industry}).
            Expansion Type: ${profile.ventureType}.
            
            Define the 4 Dimensions of their expansion strategy:
            1. Which Product/s? (What to sell)
            2. What Proposition? (Value prop)
            3. What Place? (Channel/Geo)
            4. What Promotion? (Marketing)

            Return JSON: { "product": "...", "proposition": "...", "place": "...", "promotion": "..." }
        `;
        try {
            const raw = await callGemini(prompt);
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(clean);
            setProfile(prev => ({
                ...prev,
                strategyDimensions: {
                    product: data.product || prev.strategyDimensions.product,
                    proposition: data.proposition || prev.strategyDimensions.proposition,
                    place: data.place || prev.strategyDimensions.place,
                    promotion: data.promotion || prev.strategyDimensions.promotion
                }
            }));
            setAiContext("Generated 4Ps Strategy.");
        } catch (e) {
            console.error(e);
            setAiContext("Could not generate strategy. Please fill manually.");
        }
        setLoading(false);
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
            window.location.href = '/dashboard.html';
            setLoading(false);
            return;
        }

        // on successful save, clear local fallback to avoid confusion
        localStorage.removeItem('user_profile_data');

        // Redirect to Dashboard
        window.location.href = '/dashboard.html';
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
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company Logo URL</label>
                                    <input
                                        value={profile.logoUrl || ''}
                                        onChange={e => setProfile({ ...profile, logoUrl: e.target.value })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                        placeholder="https://example.com/logo.png"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Industry</label>
                                    <input
                                        value={profile.industry}
                                        onChange={e => setProfile({ ...profile, industry: e.target.value })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                            Annual Revenue (INR Cr) <Info size={14} className="text-gray-400" />
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-gray-400 font-bold">₹</span>
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

                {/* STEP 4: EXPANSION STRATEGY (Venture Type) */}
                {step === 4 && (
                    <StepContainer title={`Define ${profile.ventureType} Strategy`} onBack={handleBack} aiContext={aiContext}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* DOMESTIC SIDE */}
                            <div className="space-y-4">
                                <div
                                    onClick={() => setProfile({ ...profile, ventureType: 'Domestic' })}
                                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-4 ${profile.ventureType === 'Domestic' ? 'border-red-600 bg-red-50' : 'border-gray-100 bg-white hover:border-red-200'}`}
                                >
                                    <div className="p-3 bg-orange-100 text-orange-600 rounded-full"><Building2 /></div>
                                    <h3 className="font-bold text-lg">Domestic Expansion</h3>
                                    <p className="text-sm text-gray-500">Deepen market share within current geography.</p>
                                </div>
                                {hypotheticalExamples.domestic && (
                                    <div className="bg-white p-4 rounded-xl border border-dashed border-gray-300 text-xs text-gray-600 italic">
                                        <span className="font-bold block not-italic mb-1 text-gray-800">Hypothetical Example:</span>
                                        "{hypotheticalExamples.domestic}"
                                    </div>
                                )}
                            </div>

                            {/* INTERNATIONAL SIDE */}
                            <div className="space-y-4">
                                <div
                                    onClick={() => setProfile({ ...profile, ventureType: 'International' })}
                                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-4 ${profile.ventureType === 'International' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'}`}
                                >
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Globe /></div>
                                    <h3 className="font-bold text-lg">International Expansion</h3>
                                    <p className="text-sm text-gray-500">Enter new global markets using exports or direct entry.</p>
                                </div>
                                {hypotheticalExamples.international && (
                                    <div className="bg-white p-4 rounded-xl border border-dashed border-gray-300 text-xs text-gray-600 italic">
                                        <span className="font-bold block not-italic mb-1 text-gray-800">Hypothetical Example:</span>
                                        "{hypotheticalExamples.international}"
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-center mt-6">
                            <button
                                onClick={() => handleLearnMore(profile.ventureType)}
                                className="text-sm font-semibold text-indigo-600 flex items-center gap-2 hover:underline bg-indigo-50 px-4 py-2 rounded-lg"
                            >
                                <Info size={16} /> Explore {profile.ventureType} Strategies
                            </button>
                        </div>

                        <button key="next4" onClick={handleNext} className="w-full mt-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                            Next
                        </button>
                    </StepContainer>
                )}

                {/* STEP 5: 4 DIMENSIONS */}
                {step === 5 && (
                    <StepContainer title="Define Expansion Strategy" onBack={handleBack} aiContext={aiContext}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-gray-500 text-sm">Define your strategy across 4 key dimensions.</p>
                                <button
                                    onClick={handleSuggestDimensions}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 flex items-center gap-1"
                                >
                                    <Sparkles size={12} /> Auto-Fill with AI
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">How do you want to expand?</label>
                                <div className="relative">
                                    <textarea
                                        rows={3}
                                        placeholder={`Describe your ${profile.ventureType} expansion plan...`}
                                        value={profile.strategyDescription || ""}
                                        onChange={e => setProfile({ ...profile, strategyDescription: e.target.value })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                    />
                                    <button className="absolute right-2 bottom-2 text-gray-400 hover:text-red-600"><Mic size={16} /></button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">1. Which Product/s?</label>
                                <div className="relative">
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Core SaaS Platform v2"
                                        value={profile.strategyDimensions?.product || ""}
                                        onChange={e => setProfile({ ...profile, strategyDimensions: { ...profile.strategyDimensions, product: e.target.value } })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                    />
                                    <button className="absolute right-2 bottom-2 text-gray-400 hover:text-red-600"><Mic size={16} /></button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">2. What Proposition?</label>
                                <div className="relative">
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Lowest cost provider for SMEs"
                                        value={profile.strategyDimensions?.proposition || ""}
                                        onChange={e => setProfile({ ...profile, strategyDimensions: { ...profile.strategyDimensions, proposition: e.target.value } })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                    />
                                    <button className="absolute right-2 bottom-2 text-gray-400 hover:text-red-600"><Mic size={16} /></button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">3. What Place (Channel)?</label>
                                <div className="relative">
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Direct Sales + Local Distributors"
                                        value={profile.strategyDimensions?.place || ""}
                                        onChange={e => setProfile({ ...profile, strategyDimensions: { ...profile.strategyDimensions, place: e.target.value } })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                    />
                                    <button className="absolute right-2 bottom-2 text-gray-400 hover:text-red-600"><Mic size={16} /></button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">4. What Promotion?</label>
                                <div className="relative">
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Digital Ads & Industry Events"
                                        value={profile.strategyDimensions?.promotion || ""}
                                        onChange={e => setProfile({ ...profile, strategyDimensions: { ...profile.strategyDimensions, promotion: e.target.value } })}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:border-red-500 outline-none"
                                    />
                                    <button className="absolute right-2 bottom-2 text-gray-400 hover:text-red-600"><Mic size={16} /></button>
                                </div>
                            </div>

                            <button onClick={handleNext} className="w-full py-3 bg-[#D32F2F] text-white rounded-xl font-bold hover:bg-[#B71C1C] transition-colors mt-4">
                                Continue
                            </button>
                        </div>
                    </StepContainer>
                )}

                {/* STEP 6: REVENUE TARGET */}
                {step === 6 && (
                    <StepContainer title="Target Revenue" onBack={handleBack} aiContext={aiContext}>
                        <div className="text-center mb-8">
                            <div className="inline-block p-4 bg-red-50 text-[#D32F2F] rounded-full mb-4">
                                <Target size={32} />
                            </div>
                            <p className="text-gray-600 font-medium">What is your target revenue (INR Cr) in 4 years?</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Target Revenue (INR Cr)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-4 text-gray-400 font-bold">₹</span>
                                <input
                                    type="text"
                                    value={profile.growthTarget}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                        setProfile({ ...profile, growthTarget: val });
                                    }}
                                    className="w-full text-2xl p-4 pl-10 bg-white border-2 border-gray-200 rounded-xl focus:border-[#D32F2F] outline-none shadow-sm placeholder:text-gray-300 font-bold"
                                    placeholder="e.g. 50"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={!profile.growthTarget}
                            className="w-full mt-8 py-3 bg-[#D32F2F] text-white rounded-xl font-bold hover:bg-[#B71C1C] transition-colors shadow-lg shadow-red-100 disabled:opacity-50"
                        >
                            Set Target
                        </button>
                    </StepContainer>
                )}



                {/* --- GLOBAL AI PANEL (Rendered outside StepContainer for stacking context) --- */}
                {showLearnMore && (
                    <div className="fixed top-0 right-0 h-full w-full md:w-[45%] bg-white shadow-2xl z-[100] border-l border-gray-200 animate-in slide-in-from-right duration-500 flex flex-col">

                        {/* Header Section */}
                        <div className="sticky top-0 bg-[#D32F2F] z-10 px-8 py-6 shadow-md flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-white/80 font-bold text-xs tracking-widest uppercase">
                                    <Sparkles size={14} /> Strategic Intelligence
                                </div>
                                <h3 className="text-2xl font-bold text-white leading-tight">
                                    Contextual Analysis
                                </h3>
                                <p className="text-white/80 text-sm mt-1">
                                    For <span className="font-medium">{profile.companyName}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowLearnMore(false)}
                                className="absolute top-6 right-6 text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
                                title="Close Panel"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-gray-50">
                            {learnMoreLoading ? (
                                <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 animate-pulse"></div>
                                        <Loader2 className="relative w-16 h-16 text-[#D32F2F] animate-spin" />
                                    </div>
                                    <p className="mt-8 text-gray-500 font-medium text-lg animate-pulse">
                                        Synthesizing market data...
                                    </p>
                                </div>
                            ) : (
                                learnMoreData?.map((item, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-red-400 transition-all shadow-sm hover:shadow-md mb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>
                                            <span className="bg-red-50 text-[#D32F2F] text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold">Scenario {idx + 1}</span>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                                            {item.recommendation}
                                        </p>
                                        <button
                                            onClick={() => handleSelectStrategy(item.recommendation)}
                                            className="w-full text-center py-2 bg-gray-900 hover:bg-[#D32F2F] text-white font-bold rounded-lg text-sm transition-colors"
                                        >
                                            Select This Strategy
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 bg-white text-center">
                            <p className="text-xs text-gray-400">
                                AI inputs based on {profile.industry} trends & public market data.
                            </p>
                        </div>
                    </div>
                )}


                {/* STEP 7: SHOW STRATEGY (REVIEW) */}
                {step === 7 && (
                    <StepContainer title="Review Your Strategy" onBack={handleBack} aiContext={aiContext}>
                        <div className="space-y-6">
                            {/* 1. HEADER CARD */}
                            <div className="bg-gradient-to-r from-[#D32F2F] to-[#b71c1c] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-yellow-300 font-bold text-xs tracking-widest uppercase mb-2">
                                        <Sparkles size={12} /> Strategic Blueprint
                                    </div>
                                    <h2 className="text-3xl font-bold mb-1">{profile.companyName}</h2>
                                    <p className="text-white/80 text-sm">Review your expansion roadmap before proceeding.</p>
                                </div>
                            </div>

                            {/* 2. KEY DETAILS GRID */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                                    <Building2 size={16} className="text-gray-400" /> Organization Profile
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="text-xs text-gray-500 font-semibold uppercase">Industry</label>
                                        <p className="font-medium text-gray-900">{profile.industry || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-semibold uppercase">Employees</label>
                                        <p className="font-medium text-gray-900">{profile.employees || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-semibold uppercase">Key Personnel</label>
                                        <p className="font-medium text-gray-900">{profile.keyPersonnel || '-'}</p>
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-1">
                                        <label className="text-xs text-gray-500 font-semibold uppercase">Target Customer</label>
                                        <p className="font-medium text-gray-900 text-sm">{profile.customers || '-'}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-gray-500 font-semibold uppercase">Key Products</label>
                                        <p className="font-medium text-gray-900 text-sm">{profile.products || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. FINANCIAL BASELINE */}
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                                    <DollarSign size={16} className="text-gray-400" /> Financial Baseline
                                </h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <label className="text-xs text-gray-500 font-semibold uppercase">Current Revenue</label>
                                        <p className="text-xl font-bold text-gray-900 flex items-baseline gap-1">
                                            {profile.revenue || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-semibold uppercase">Profitability Status</label>
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold mt-1 ${profile.profitability === 'Profitable' ? 'bg-emerald-100 text-emerald-700' :
                                            profile.profitability === 'BreakEven' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {profile.profitability || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. EXPANSION STRATEGY */}
                            <div className="bg-gray-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>

                                <div className="relative z-10">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-white/10 pb-4 gap-4">
                                        <div>
                                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expansion Type</label>
                                            <div className="flex items-center gap-2 text-xl font-bold mt-1">
                                                {profile.ventureType === 'Domestic' ? <Building2 size={20} className="text-orange-400" /> : <Globe size={20} className="text-indigo-400" />}
                                                {profile.ventureType} Expansion
                                            </div>
                                        </div>
                                        <div className="text-left md:text-right">
                                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">4-Year Revenue Target</label>
                                            <div className="text-2xl font-bold text-emerald-400 mt-1">
                                                {profile.growthTarget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 }).format(profile.growthTarget) : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">Strategy Summary</label>
                                        <p className="text-gray-200 text-sm leading-relaxed italic border-l-2 border-red-500 pl-4 bg-white/5 p-3 rounded-r-lg">
                                            "{profile.strategyDescription || 'No summary provided.'}"
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-3">Execution Strategy (4Ps)</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                                                <div className="text-[10px] text-indigo-300 font-bold uppercase mb-1">Product</div>
                                                <div className="text-sm font-medium">{profile.strategyDimensions?.product || '-'}</div>
                                            </div>
                                            <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                                                <div className="text-[10px] text-indigo-300 font-bold uppercase mb-1">Proposition</div>
                                                <div className="text-sm font-medium">{profile.strategyDimensions?.proposition || '-'}</div>
                                            </div>
                                            <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                                                <div className="text-[10px] text-indigo-300 font-bold uppercase mb-1">Channel (Place)</div>
                                                <div className="text-sm font-medium">{profile.strategyDimensions?.place || '-'}</div>
                                            </div>
                                            <div className="bg-white/10 p-4 rounded-xl border border-white/5">
                                                <div className="text-[10px] text-indigo-300 font-bold uppercase mb-1">Promotion</div>
                                                <div className="text-sm font-medium">{profile.strategyDimensions?.promotion || '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleNext} className="w-full mt-8 py-4 bg-[#D32F2F] text-white rounded-xl font-bold hover:bg-[#B71C1C] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg">
                            Looks Good, Continue <ArrowRight size={20} />
                        </button>
                    </StepContainer>
                )}

                {/* STEP 8: HELP NEEDED */}
                {step === 8 && (
                    <StepContainer title={`Support Assessment (${supportStep + 1}/2)`} onBack={handleSupportBack} aiContext={aiContext}>
                        <p className="text-gray-500 mb-6 text-sm">Select your execution model for each critical sub-area.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(SUPPORT_SUB_DOMAINS)
                                .slice(supportStep * 3, supportStep * 3 + 3)
                                .map(([category, subItems]) => (
                                    <div key={category} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md transition-all">
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start mb-6">
                                            <h3 className="text-xl font-black text-gray-900 tracking-tight">{category} Support</h3>
                                            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                                                {category === 'Product' && <Target size={18} />}
                                                {category === 'Money' && <DollarSign size={18} />}
                                                {category === 'Placement' && <Globe size={18} />}
                                                {category === 'Selling' && <Sparkles size={18} />}
                                                {category === 'People' && <Users size={18} />}
                                                {category === 'Process' && <Building2 size={18} />}
                                            </div>
                                        </div>

                                        {/* Sub Items List */}
                                        <div className="space-y-6 flex-1">
                                            {subItems.map(item => {
                                                const val = profile.supportDetails?.[`${category}_${item}`] || 'NA';
                                                return (
                                                    <div key={item} className="space-y-1.5">
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-gray-700 text-xs">{item}</span>
                                                            <button
                                                                onClick={() => handleSubItemLearnMore(category, item)}
                                                                className="text-[9px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-0.5 hover:underline"
                                                            >
                                                                AI HELP
                                                            </button>
                                                        </div>

                                                        <div className="flex bg-gray-50 p-1 rounded-lg gap-1">
                                                            {['WF', 'Self', 'NA'].map(opt => {
                                                                const isSelected = val === opt;
                                                                return (
                                                                    <button
                                                                        key={opt}
                                                                        onClick={() => handleSupportDetailChange(category, item, opt)}
                                                                        className={`
                                                                            flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200
                                                                            ${isSelected
                                                                                ? 'bg-[#D32F2F] text-white shadow-sm'
                                                                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                                            }
                                                                        `}
                                                                    >
                                                                        {opt === 'WF' ? 'WF' : opt}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="flex gap-4 mt-8">
                            <div className="flex-1 flex justify-center gap-2 py-4">
                                {[0, 1].map(i => (
                                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${supportStep === i ? 'bg-red-600 w-6' : 'bg-gray-200'}`}></div>
                                ))}
                            </div>
                            <button onClick={handleSupportNext} className="w-40 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                                {supportStep === 1 ? 'Finish' : 'Next'}
                            </button>
                        </div>
                    </StepContainer>
                )}

                {/* STEP 9: SUMMARY & SUBMIT */}
                {step === 9 && (
                    <StepContainer title="Submission Dashboard" onBack={handleBack} aiContext={aiContext}>
                        <div className="space-y-8">

                            {/* 1. COMPANY SNAPSHOT CARD */}
                            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#D32F2F]"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{profile.companyName}</h2>
                                        <div className="flex gap-3 text-sm text-gray-500 mt-1">
                                            <span>{profile.industry}</span>
                                            <span>•</span>
                                            <span>{profile.ventureType} Expansion</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Revenue</div>
                                        <div className="text-xl font-bold text-emerald-600">
                                            {profile.growthTarget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 }).format(profile.growthTarget) : '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Current Rev</label>
                                        <div className="font-semibold text-gray-900">{profile.revenue}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Profitability</label>
                                        <div className={`text-sm font-bold px-2 py-0.5 rounded w-fit mt-1 ${profile.profitability === 'Profitable' ? 'bg-emerald-100 text-emerald-700' :
                                            profile.profitability === 'BreakEven' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {profile.profitability}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Employees</label>
                                        <div className="font-semibold text-gray-900">{profile.employees}</div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Focus Areas</label>
                                        <div className="font-bold text-red-600">
                                            {Object.values(profile.supportDetails).filter(v => v === 'WF').length} / 5
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. ONE PAGE STRATEGY DOC */}
                            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 shadow-inner relative">
                                <div className="absolute top-4 right-4 text-gray-300">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="font-bold text-gray-900 border-b border-gray-300 pb-4 mb-6 text-lg flex items-center gap-2">
                                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded">DRAFT</span>
                                    Strategic Executive Summary
                                </h3>

                                {onePageLoading ? (
                                    <div className="p-12 flex flex-col items-center justify-center gap-4">
                                        <Loader2 className="animate-spin text-red-600 w-8 h-8" />
                                        <p className="text-gray-500 text-sm animate-pulse">Generating your strategy document...</p>
                                    </div>
                                ) : (
                                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-serif">
                                        <p className="whitespace-pre-wrap">{onePageSummary}</p>
                                    </div>
                                )}
                            </div>

                            {/* 3. SUPPORT DASHBOARD */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Execution Support Plan</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Focus Areas */}
                                    <div className="md:col-span-2 bg-gradient-to-br from-white to-red-50/50 border border-red-100 rounded-2xl p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-red-600 text-white p-1.5 rounded-lg">
                                                    <Target size={16} />
                                                </div>
                                                <span className="font-bold text-gray-900">Wadhwani Focus Areas</span>
                                            </div>
                                            <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                                {Object.values(profile.supportDetails).filter(v => v === 'WF').length} Selected
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {Object.entries(profile.supportDetails).filter(([_, v]) => v === 'WF').map(([key]) => {
                                                const [cat, item] = key.split('_');
                                                return (
                                                    <div key={key} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                        <CheckCircle size={16} className="text-red-500 shrink-0" />
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat}</div>
                                                            <div className="text-sm font-bold text-gray-800">{item}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {Object.values(profile.supportDetails).filter(v => v === 'WF').length === 0 && (
                                                <div className="col-span-full py-4 text-center text-gray-400 italic text-sm">None selected</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* In-House & NA */}
                                    <div className="space-y-4">
                                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                                    <Users size={14} className="text-gray-400" /> In-House
                                                </span>
                                                <span className="text-xs font-bold text-gray-500">{Object.values(profile.supportDetails).filter(v => v === 'Self').length}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {Object.entries(profile.supportDetails).filter(([_, v]) => v === 'Self').map(([key]) => (
                                                    <span key={key} className="text-[10px] font-semibold bg-gray-50 border border-gray-100 px-2 py-1 rounded text-gray-600">
                                                        {key.split('_')[1]}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5 opacity-75">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-gray-500 text-sm flex items-center gap-2">
                                                    <Info size={14} /> Not Applicable
                                                </span>
                                                <span className="text-xs font-bold text-gray-400">{Object.values(profile.supportDetails).filter(v => v === 'NA').length}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Final CTA */}
                            <div className="pt-4">
                                <button
                                    onClick={handleSave}
                                    className="w-full py-4 bg-[#D32F2F] text-white font-bold rounded-xl shadow-lg hover:bg-[#b71c1c] transition-all flex items-center justify-center gap-2 text-lg hover:scale-[1.005]"
                                >
                                    <Save size={20} /> Finalize Submission
                                </button>
                            </div>
                        </div>
                    </StepContainer>
                )}
            </div>
        </div >
    );
}
