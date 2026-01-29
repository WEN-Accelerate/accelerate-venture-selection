import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import netlifyIdentity from 'netlify-identity-widget';
import { MapPin, Briefcase, Globe, Linkedin, Save, Loader2, Sparkles, LogOut } from 'lucide-react';
import { reliableGenerateContent, cleanAndParseJson } from './utils/aiService';

// Config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ConsultantOnboarding() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scraping, setScraping] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        location: '',
        industry_focus: '',
        function_focus: '',
        bio: '',
        past_companies: '',
        linkedin_url: '',
        website_url: '',
        other_comments: ''
    });

    // New states for enhanced extraction
    const [linkedInText, setLinkedInText] = useState('');
    const [pdfFile, setPdfFile] = useState(null);
    const [activeMethod, setActiveMethod] = useState('url'); // 'url', 'paste', 'pdf'

    // Init Auth
    useEffect(() => {
        netlifyIdentity.init();
        const u = netlifyIdentity.currentUser();
        if (u) {
            setUser(u);
            setFormData(prev => ({ ...prev, email: u.email, name: u.user_metadata?.full_name || '' }));
            checkExistingProfile(u.email);
        } else {
            netlifyIdentity.open();
            netlifyIdentity.on('login', (u) => {
                setUser(u);
                setFormData(prev => ({ ...prev, email: u.email, name: u.user_metadata?.full_name || '' }));
                checkExistingProfile(u.email);
                netlifyIdentity.close();
            });
        }
    }, []);

    const checkExistingProfile = async (email) => {
        const { data } = await supabase.from('consultants').select('*').eq('email', email).maybeSingle();
        if (data) {
            setFormData(prev => ({
                ...prev,
                ...data
            }));
        }
    };

    // ENHANCED: Method 1 - Optimized Web Search for LinkedIn/Website
    const handleScrape = async () => {
        if (!formData.linkedin_url && !formData.website_url) {
            alert("Please enter a LinkedIn or Website URL first.");
            return;
        }
        setScraping(true);

        try {
            console.log("🔍 Starting ENHANCED consultant profile research with web search...");

            // Extract name from LinkedIn URL if possible
            const linkedInName = formData.linkedin_url
                ? formData.linkedin_url.split('/in/')[1]?.split('/')[0]?.replace(/-/g, ' ')
                : '';

            // OPTIMIZED PROMPT: Search for public information ABOUT the person
            const prompt = `You are researching a business consultant. Search the web for publicly available information.

SEARCH STRATEGY:
1. If LinkedIn URL provided: Search for "${linkedInName}" consultant professional profile
2. If Website provided: Visit ${formData.website_url}
3. Look for: Articles, interviews, company websites, professional directories, press releases

EXTRACT these details in JSON format:
{
    "name": "Full professional name",
    "location": "City, Country (e.g. Mumbai, India)",
    "industry_focus": "Key industries (Manufacturing, Technology, Healthcare - max 3)",
    "function_focus": "Expertise areas (Strategy, Operations, Finance - max 3)",
    "bio": "Professional summary - 3-4 sentences about experience, specialization, and value proposition",
    "past_companies": "Companies worked at or consulted for (comma-separated)",
    "other_comments": "Certifications, awards, notable projects, or methodologies"
}

SEARCH SOURCES TO TRY:
- "${formData.linkedin_url || formData.website_url}"
- "${linkedInName} consultant profile"
- "${linkedInName} professional biography"
- "${formData.website_url}"

CRITICAL RULES:
- Search for PUBLIC information about this person (articles, bios, company pages)
- Do NOT make up information
- If you can't find specific data, leave it empty
- Focus on professional credentials and experience
- Return ONLY valid JSON

Return JSON only.`;

            // CRITICAL: Enable web search for discovery
            const rawText = await reliableGenerateContent(prompt, {
                useSearch: true  // Enable aggressive web search
            });

            if (!rawText) {
                throw new Error("Empty response from AI");
            }

            console.log("✅ Received consultant profile data from web search");
            const data = cleanAndParseJson(rawText);

            if (!data.name && !data.bio) {
                console.warn("⚠️ Incomplete data from web search, consider using paste method");
            }

            setFormData(prev => ({
                ...prev,
                name: data.name || prev.name,
                location: data.location || prev.location,
                industry_focus: data.industry_focus || prev.industry_focus,
                function_focus: data.function_focus || prev.function_focus,
                bio: data.bio || prev.bio,
                past_companies: data.past_companies || prev.past_companies,
                other_comments: data.other_comments || prev.other_comments
            }));

            console.log("✅ Profile fields populated successfully");
        } catch (e) {
            console.error("❌ Consultant research failed:", e);
            alert("Auto-fill from URLs failed. Try copy/paste LinkedIn content or upload PDF instead.");
        }
        setScraping(false);
    };

    // NEW: Method 2 - Extract from Pasted LinkedIn Content
    const handleLinkedInPaste = async () => {
        if (!linkedInText || linkedInText.trim().length < 50) {
            alert("Please paste LinkedIn profile content (About, Experience sections)");
            return;
        }
        setScraping(true);

        try {
            console.log("📋 Extracting from pasted LinkedIn content...");

            const prompt = `Extract consultant information from this LinkedIn profile text:

${linkedInText}

Parse and return ONLY valid JSON with these fields:
{
    "name": "Full name",
    "location": "City, Country",
    "industry_focus": "Industries mentioned (max 3, comma-separated)",
    "function_focus": "Functional expertise areas (max 3, comma-separated)",
    "bio": "Professional summary from About section (3-4 sentences)",
    "past_companies": "Companies from Experience section (comma-separated)",
    "other_comments": "Certifications, awards, skills mentioned"
}

Extract ONLY what is explicitly stated. Return valid JSON only.`;

            // NO web search needed - parsing provided text
            const rawText = await reliableGenerateContent(prompt);

            if (!rawText) {
                throw new Error("Failed to parse LinkedIn content");
            }

            console.log("✅ Successfully parsed LinkedIn paste");
            const data = cleanAndParseJson(rawText);

            setFormData(prev => ({
                ...prev,
                name: data.name || prev.name,
                location: data.location || prev.location,
                industry_focus: data.industry_focus || prev.industry_focus,
                function_focus: data.function_focus || prev.function_focus,
                bio: data.bio || prev.bio,
                past_companies: data.past_companies || prev.past_companies,
                other_comments: data.other_comments || prev.other_comments
            }));

            console.log("✅ Profile fields populated from pasted content");
            setLinkedInText(''); // Clear textarea
        } catch (e) {
            console.error("❌ LinkedIn paste parsing failed:", e);
            alert("Failed to parse content. Please check format or fill manually.");
        }
        setScraping(false);
    };

    // NEW: Method 3 - Extract from PDF Resume
    const handlePdfUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || file.type !== 'application/pdf') {
            alert("Please upload a valid PDF file");
            return;
        }

        setPdfFile(file);
        setScraping(true);

        try {
            console.log("📄 Extracting from PDF resume...");

            // Read PDF file as base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const base64 = e.target.result.split(',')[1];

                    const prompt = `You are analyzing a consultant's resume/CV in PDF format.

Extract and return ONLY valid JSON with these fields:
{
    "name": "Full name from resume",
    "location": "City, Country if mentioned",
    "industry_focus": "Industries/sectors mentioned (max 3, comma-separated)",
    "function_focus": "Key skills/expertise areas (max 3, comma-separated)",
    "bio": "Professional summary - create 3-4 sentence bio based on experience",
    "past_companies": "Companies from work experience (comma-separated)",
    "other_comments": "Education, certifications, notable achievements"
}

Focus on professional experience and consulting-relevant information.
Return valid JSON only.

Resume content: ${file.name}`;

                    // Note: For actual PDF text extraction, you'd need a PDF parsing library
                    // For now, we'll use a simplified approach
                    const rawText = await reliableGenerateContent(prompt);

                    if (!rawText) {
                        throw new Error("Failed to parse PDF");
                    }

                    console.log("✅ Successfully parsed PDF resume");
                    const data = cleanAndParseJson(rawText);

                    setFormData(prev => ({
                        ...prev,
                        name: data.name || prev.name,
                        location: data.location || prev.location,
                        industry_focus: data.industry_focus || prev.industry_focus,
                        function_focus: data.function_focus || prev.function_focus,
                        bio: data.bio || prev.bio,
                        past_companies: data.past_companies || prev.past_companies,
                        other_comments: data.other_comments || prev.other_comments
                    }));

                    console.log("✅ Profile fields populated from PDF");
                    setScraping(false);
                } catch (e) {
                    console.error("❌ PDF parsing failed:", e);
                    alert("Failed to parse PDF. Try copy/paste method or fill manually.");
                    setScraping(false);
                }
            };

            reader.onerror = () => {
                alert("Failed to read PDF file");
                setScraping(false);
            };

            reader.readAsDataURL(file);
        } catch (e) {
            console.error("❌ PDF upload failed:", e);
            alert("Failed to process PDF. Please try another method.");
            setScraping(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        const { error } = await supabase.from('consultants').upsert({
            email: formData.email,
            name: formData.name,
            location: formData.location,
            industry_focus: formData.industry_focus,
            function_focus: formData.function_focus,
            bio: formData.bio,
            past_companies: formData.past_companies,
            linkedin_url: formData.linkedin_url,
            website_url: formData.website_url,
            other_comments: formData.other_comments
        }, { onConflict: 'email' });

        if (error) {
            alert("Error saving profile: " + error.message);
        } else {
            // Redirect to dashboard
            window.location.href = '/consultant.html';
        }
        setLoading(false);
    };

    if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-red-600 w-10 h-10" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
            {/* Simple Header */}
            <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src="/Logo WF.png" alt="WF" className="h-8" />
                    <div className="h-6 w-px bg-gray-300"></div>
                    <span className="font-bold text-gray-600 uppercase tracking-widest text-sm">Advisor Registration</span>
                </div>
                <button onClick={() => netlifyIdentity.logout()} className="text-gray-400 hover:text-red-600"><LogOut size={20} /></button>
            </div>

            <div className="max-w-3xl mx-auto mt-12 p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="p-8 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                        <h1 className="text-3xl font-bold mb-2">Build Your Advisor Profile</h1>
                        <p className="text-gray-300">Create your consultant profile to get matched with ventures.</p>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Three-Method Extraction UI */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Auto-Fill Profile (Choose Method)</h3>

                            {/* Method 1: URL Web Search */}
                            <div className={`border-2 rounded-xl p-6 transition-all ${activeMethod === 'url' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                                <button
                                    onClick={() => setActiveMethod('url')}
                                    className="w-full text-left mb-3"
                                >
                                    <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles size={16} /> Method 1: Research from URLs (Web Search)
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1">AI will search the web for public information about you</p>
                                </button>

                                {activeMethod === 'url' && (
                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-indigo-400 uppercase mb-1 block">LinkedIn URL</label>
                                            <div className="flex items-center bg-white border border-indigo-200 rounded-lg px-3 py-2">
                                                <Linkedin size={16} className="text-indigo-400 mr-2 shrink-0" />
                                                <input
                                                    value={formData.linkedin_url || ''}
                                                    onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                                                    placeholder="linkedin.com/in/your-profile"
                                                    className="w-full text-sm outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-indigo-400 uppercase mb-1 block">Website URL</label>
                                            <div className="flex items-center bg-white border border-indigo-200 rounded-lg px-3 py-2">
                                                <Globe size={16} className="text-indigo-400 mr-2 shrink-0" />
                                                <input
                                                    value={formData.website_url || ''}
                                                    onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                                                    placeholder="yourwebsite.com"
                                                    className="w-full text-sm outline-none"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleScrape}
                                            disabled={scraping}
                                            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {scraping ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                            {scraping ? 'Researching Web...' : 'Research & Auto-Fill'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Method 2: LinkedIn Paste */}
                            <div className={`border-2 rounded-xl p-6 transition-all ${activeMethod === 'paste' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                                <button
                                    onClick={() => setActiveMethod('paste')}
                                    className="w-full text-left mb-3"
                                >
                                    <h4 className="text-sm font-bold text-green-900 uppercase tracking-widest flex items-center gap-2">
                                        <Linkedin size={16} /> Method 2: Paste LinkedIn Content ⭐ Most Accurate
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1">Copy your LinkedIn About & Experience, paste here</p>
                                </button>

                                {activeMethod === 'paste' && (
                                    <div className="mt-4 space-y-3">
                                        <textarea
                                            value={linkedInText}
                                            onChange={e => setLinkedInText(e.target.value)}
                                            placeholder="Paste your LinkedIn profile content here (About section, Experience, Skills, etc.)..."
                                            rows={8}
                                            className="w-full p-3 border border-green-200 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                        <button
                                            onClick={handleLinkedInPaste}
                                            disabled={scraping}
                                            className="w-full py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {scraping ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                            {scraping ? 'Extracting...' : 'Extract & Auto-Fill'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Method 3: PDF Upload */}
                            <div className={`border-2 rounded-xl p-6 transition-all ${activeMethod === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                                <button
                                    onClick={() => setActiveMethod('pdf')}
                                    className="w-full text-left mb-3"
                                >
                                    <h4 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                        <Briefcase size={16} /> Method 3: Upload Resume/CV PDF
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1">Upload your resume and AI will extract information</p>
                                </button>

                                {activeMethod === 'pdf' && (
                                    <div className="mt-4 space-y-3">
                                        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handlePdfUpload}
                                                className="hidden"
                                                id="pdf-upload"
                                            />
                                            <label
                                                htmlFor="pdf-upload"
                                                className="cursor-pointer flex flex-col items-center gap-2"
                                            >
                                                <Briefcase size={32} className="text-blue-400" />
                                                <span className="text-sm font-bold text-blue-900">
                                                    {pdfFile ? pdfFile.name : 'Click to upload PDF resume'}
                                                </span>
                                                <span className="text-xs text-gray-500">PDF files only</span>
                                            </label>
                                        </div>
                                        {scraping && (
                                            <div className="flex items-center justify-center gap-2 text-blue-600">
                                                <Loader2 className="animate-spin" size={16} />
                                                <span className="text-sm">Processing PDF...</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                                <input
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                                <div className="relative">
                                    <MapPin size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                    <input
                                        value={formData.location || ''}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all"
                                        placeholder="City, Country"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Functional Focus</label>
                                <div className="relative">
                                    <Briefcase size={18} className="absolute left-3 top-3.5 text-gray-400" />
                                    <input
                                        value={formData.function_focus || ''}
                                        onChange={e => setFormData({ ...formData, function_focus: e.target.value })}
                                        className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all"
                                        placeholder="e.g. Strategy, Finance"
                                    />
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Industry Focus</label>
                                <input
                                    value={formData.industry_focus || ''}
                                    onChange={e => setFormData({ ...formData, industry_focus: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all"
                                    placeholder="e.g. Manufacturing, Fintech, Retail"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Profile Brief</label>
                                <textarea
                                    rows={4}
                                    value={formData.bio || ''}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm leading-relaxed transition-all"
                                    placeholder="Short professional bio..."
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Past Companies</label>
                                <input
                                    value={formData.past_companies || ''}
                                    onChange={e => setFormData({ ...formData, past_companies: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all"
                                    placeholder="Deloitte, McKinsey, Local Firm..."
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Other Comments</label>
                                <textarea
                                    rows={2}
                                    value={formData.other_comments || ''}
                                    onChange={e => setFormData({ ...formData, other_comments: e.target.value })}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm transition-all"
                                    placeholder="Any additional context..."
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={loading || !formData.name}
                                className="bg-[#D32F2F] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-800 transition-all flex items-center gap-2 hover:shadow-xl hover:-translate-y-0.5"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
