import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import netlifyIdentity from 'netlify-identity-widget';
import { MapPin, Briefcase, Globe, Linkedin, Save, Loader2, Sparkles, LogOut } from 'lucide-react';

// Config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

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

    const handleScrape = async () => {
        if (!formData.linkedin_url && !formData.website_url) {
            alert("Please enter a LinkedIn or Website URL first.");
            return;
        }
        setScraping(true);

        const prompt = `
      Act as a professional profiler. Research the consultant based on these URLs. Priority: Official Website > LinkedIn (if accessible).
      LinkedIn: ${formData.linkedin_url}
      Website: ${formData.website_url}
      
      Extract the following details in JSON format. Be precise and avoid hallucinating.
      {
          "name": "Full Name (as found on profile)",
          "location": "City, Country (e.g. Mumbai, India)",
          "industry_focus": "Key industries mentioned (e.g. Manufacturing, Retail). Max 3.",
          "function_focus": "Key functional expertise (e.g. Strategy, Supply Chain). Max 3.",
          "bio": "A professional summary (3-4 sentences) highlighting experience level and key value proposition.",
          "past_companies": "List of companies they have worked at or consulted for.",
          "other_comments": "Notable achievements, awards, or specific methodologies mentioned."
      }
      If specific data is not found, leave it blank. Return ONLY JSON.
      `;

        try {
            // Use Gemini search
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        tools: [{ google_search: {} }]
                    })
                }
            );
            const resJson = await response.json();
            const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const data = JSON.parse(clean);
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
            } else {
                console.warn("No text in Gemini response");
            }
        } catch (e) {
            console.error(e);
            alert("Auto-fill failed or timed out. Please fill manually.");
        }
        setScraping(false);
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
                        {/* Scrape Section */}
                        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Sparkles size={16} /> Auto-Fill from Web
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-xs font-bold text-indigo-400 uppercase mb-1 block">LinkedIn URL</label>
                                    <div className="flex items-center bg-white border border-indigo-200 rounded-lg px-3 py-2">
                                        <Linkedin size={16} className="text-indigo-400 mr-2 shrink-0" />
                                        <input
                                            value={formData.linkedin_url || ''}
                                            onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                                            placeholder="linkedin.com/in/..."
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
                                            placeholder="myconsultancy.com"
                                            className="w-full text-sm outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleScrape}
                                disabled={scraping}
                                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {scraping ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                {scraping ? 'Analyzing...' : 'Auto-Fill Profile Details'}
                            </button>
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
