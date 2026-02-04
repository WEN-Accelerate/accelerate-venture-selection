import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import netlifyIdentity from 'netlify-identity-widget';
import {
    Target, User, Calendar, ExternalLink, Filter,
    BookOpen, MessageCircle, X, Check, CheckCircle, Save, Loader2, Building2, Globe, Users, TrendingUp, CreditCard, Briefcase, Sparkles, LogOut,
    Trash2, Plus, Wand2, GraduationCap, Box, Play, Send, LayoutGrid, BarChart3, ShieldCheck, Award
} from 'lucide-react';
import { GoogleGenAI } from "@google/generative-ai";
import QuarterlyProgress from './QuarterlyProgressComponent';
import { reliableGenerateContent, cleanAndParseJson, generateWithContext } from './utils/aiService';
import { getPromptQuery, hydratePrompt } from './utils/promptManager';

// --- CONFIG ---
const STREAMS = ["GTM", "Product", "Operations", "Supply Chain", "Talent", "Money"];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function DashboardMain() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [filter, setFilter] = useState('ALL'); // ALL, WF, SELF, NA
    const [viewMode, setViewMode] = useState('context'); // 'context' or 'sprint'
    const [selectedCard, setSelectedCard] = useState(null); // For Modal
    const [isConsultantView, setIsConsultantView] = useState(false); // New state for consultant back button
    const [consultantName, setConsultantName] = useState('');

    // --- AUTH & DATA SYNC ---
    useEffect(() => {
        netlifyIdentity.init();

        const currentUser = netlifyIdentity.currentUser();
        if (currentUser) {
            setUser({
                uid: currentUser.id,
                email: currentUser.email,
                displayName: currentUser.user_metadata?.full_name,
                isAnonymous: false
            });
            fetchProfile(currentUser.id);
        } else {
            // Fallback: Check for Guest ID
            const guestId = localStorage.getItem('accelerate_guest_id');
            if (guestId) {
                checkGuestProfile(guestId);
            } else {
                // Fallback: Check for local data (legacy)
                const localData = localStorage.getItem('user_profile_data');
                if (localData) {
                    const parsed = JSON.parse(localData);
                    setUser({ uid: 'guest', isAnonymous: true });
                    setProfile(parsed.details);
                    setLoading(false);
                } else {
                    setLoading(false);
                    // Optionally redirect here if strict auth required
                }
            }
        }

        netlifyIdentity.on('login', (user) => {
            setUser({
                uid: user.id,
                email: user.email,
                displayName: user.user_metadata?.full_name,
                isAnonymous: false
            });
            fetchProfile(user.id);
        });

        netlifyIdentity.on('logout', () => {
            setUser(null);
            window.location.href = '/index.html';
        });

        return () => {
            netlifyIdentity.off('login');
            netlifyIdentity.off('logout');
        };
    }, []);

    const checkGuestProfile = async (guestId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('details')
            .eq('user_id', guestId)
            .maybeSingle();

        if (data && data.details) {
            setUser({ uid: guestId, isAnonymous: true });
            setProfile(data.details);
        }
        setLoading(false);
    };

    const handleLogout = () => {
        if (user && user.isAnonymous) {
            // Clear guest session
            localStorage.removeItem('accelerate_guest_id'); // Optional: decide if we want to clear or keep
            window.location.href = '/index.html';
        } else {
            netlifyIdentity.logout();
        }
    };

    const fetchProfile = async (uid) => {
        try {
            // 0. FIRST: Check if this user is a consultant (Redirect Guard)
            const { data: consultantData } = await supabase
                .from('consultants')
                .select('id')
                .eq('email', uid) // Netlify ID might not match email, wait. Netlify currentUser has email.
            // fetchProfile receives 'uid'. I need email.
            // 'user' state might not be set yet if calling from useEffect.
            // Let's rely on currentUser object from calling scope? No, fetchProfile is async.
            // Let's fetch email from 'auth' or just use the passed uid if it IS the email (rare).
            // Actually, I should pass the email to fetchProfile or check it if I have the user object.
            // But 'user' state is set before calling fetchProfile.
            // However, set is async. 
            // Simplest way: Check 'user' state? It might be stale in the closure.
            // Better: Pass email to fetchProfile or get it from netlifyIdentity.
            // Let's refactor fetchProfile to take email too or get it from Netlify.

            // 0. FIRST: Check if this user is a consultant (Redirect Guard)
            // REFACTOR: Logic inline here.

            // Check for Client View Mode
            const params = new URLSearchParams(window.location.search);
            const viewClientId = params.get('view_client_id');

            const nUser = netlifyIdentity.currentUser();
            if (nUser && nUser.email) {
                const { data: cData } = await supabase
                    .from('consultants')
                    .select('id, name')
                    .eq('email', nUser.email)
                    .maybeSingle();

                // If User IS a Consultant
                if (cData) {
                    if (viewClientId) {
                        // Consultant is trying to view a client. ALLOW access.
                        // Ideally, check if assigned:
                        // const { data: assignment } = await supabase.from('consultant_clients')....

                        console.log("Consultant viewing client:", viewClientId);
                        // Swap the UID to fetch the CLIENT'S profile, not the consultant's own (which is null/empty)
                        uid = viewClientId;
                        setIsConsultantView(true);
                        setConsultantName(cData.name || nUser.user_metadata?.full_name);
                    } else {
                        // Consultant trying to view their own "Dashboard" (which doesn't exist here) -> Redirect
                        console.log("Redirecting Consultant from SME Dashboard (No Client Selected)...");
                        window.location.href = '/consultant.html';
                        return;
                    }
                }
            }

            // 1. Try finding profile for THIS user
            let { data, error } = await supabase
                .from('profiles')
                .select('id, details')
                .eq('user_id', uid)
                .maybeSingle();

            // 2. If not found, check if we have a Guest ID to adopt (Migration Logic)
            if ((!data || !data.details) && localStorage.getItem('accelerate_guest_id')) {
                const guestId = localStorage.getItem('accelerate_guest_id');
                console.log("Checking for orphan guest profile:", guestId);

                const guestResult = await supabase
                    .from('profiles')
                    .select('*') // Get full row
                    .eq('user_id', guestId)
                    .maybeSingle();

                if (guestResult.data) {
                    console.log("Found guest profile. Migrating ownership to:", uid);

                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ user_id: uid })
                        .eq('user_id', guestId);

                    if (!updateError) {
                        console.log("Migration successful!");
                        data = { id: guestResult.data.id, details: guestResult.data.details };

                        // Clean up guest ID
                        localStorage.removeItem('accelerate_guest_id');
                    } else {
                        console.error("Migration failed:", updateError);
                    }
                }
            }
            // 2.5 Check for Email Match (Consultant Invitation Adoption)
            if ((!data || !data.details) && nUser && nUser.email) {
                console.log("Checking for profile by email (Adoption):", nUser.email);
                const { data: emailProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('email', nUser.email)
                    .maybeSingle();

                if (emailProfile && emailProfile.user_id !== uid) {
                    console.log("Found profile by email. Adopting ownership to:", uid);

                    // Update the profile to belong to the new real user
                    const { error: adoptError } = await supabase
                        .from('profiles')
                        .update({ user_id: uid })
                        .eq('id', emailProfile.id); // Safer to use primary key ID

                    if (!adoptError) {
                        console.log("Adoption successful!");
                        data = { id: emailProfile.id, details: emailProfile.details };
                    } else {
                        console.error("Adoption failed:", adoptError);
                    }
                }
            }

            // 3. If STILL not found, check LocalStorage Fallback (user_profile_data)
            // This handles cases where Supabase write failed in Wizard, but Local write succeeded.
            if ((!data || !data.details) && localStorage.getItem('user_profile_data')) {
                console.log("Found disconnected local profile data. Adopting...");
                try {
                    const localData = JSON.parse(localStorage.getItem('user_profile_data'));
                    if (localData && localData.details) {
                        data = { details: localData.details }; // Use local data

                        // SYNC ATTEMPT: Try to push this local data to Supabase now that we are here
                        // We don't await this to keep UI fast
                        supabase.from('profiles').upsert([{
                            user_id: uid,
                            company_name: localData.companyName || 'My Company',
                            details: localData.details,
                            updated_at: new Date()
                        }], { onConflict: 'user_id' }).then(({ error }) => {
                            if (!error) {
                                console.log("Background Sync: Restored local profile to server.");
                                localStorage.removeItem('user_profile_data'); // Cleanup on success
                            } else {
                                console.warn("Background Sync Failed:", error);
                            }
                        });
                    }
                } catch (e) {
                    console.error("Local profile parse error", e);
                }
            }

            if (data && data.details) {
                // Merge ID into profile object for easier access
                setProfile({ ...data.details, id: data.id });
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        }
        setLoading(false);
    };

    const handleUpdateCard = async (key, updates) => {
        if (!profile) return;

        // Create new metadata object
        const newMetadata = {
            ...(profile.supportMetadata || {}),
            [key]: {
                ...(profile.supportMetadata?.[key] || {}),
                ...updates
            }
        };

        const newProfile = { ...profile, supportMetadata: newMetadata };
        setProfile(newProfile); // Optimistic update

        // Save to DB
        // Check if Consultant Mode (viewing a client)
        const params = new URLSearchParams(window.location.search);
        const viewClientId = params.get('view_client_id');
        const targetUserId = viewClientId || user.uid;

        if ((user && !user.isAnonymous) || viewClientId) {
            console.log("Saving profile to Supabase...", targetUserId);

            const payload = {
                user_id: targetUserId,
                details: newProfile,
                company_name: profile.companyName || 'My Company',
                updated_at: new Date()
            };

            const { data, error } = await supabase
                .from('profiles')
                .upsert([payload], { onConflict: 'user_id' })
                .select();

            if (error) {
                console.error("Supabase Save Error:", error);
                console.error("Payload sent:", payload);
                alert(`Failed to save: ${error.message || 'Unknown DB Error'}`);
            } else {
                console.log("Supabase Save Success.", data);
            }
        } else {
            // Local save
            console.log("Saving profile to LocalStorage (Guest)...");
            localStorage.setItem('user_profile_data', JSON.stringify({ details: newProfile }));
        }
    };

    const handleUpdateSprintStatus = (newStatus) => {
        // Direct Profile Update for Sprint Status
        const newProfile = { ...profile, sprint_status: newStatus };
        setProfile(newProfile); // Optimistic

        const params = new URLSearchParams(window.location.search);
        const viewClientId = params.get('view_client_id');
        const targetUserId = viewClientId || user.uid;

        if ((user && !user.isAnonymous) || viewClientId) {
            supabase.from('profiles').upsert([{
                user_id: targetUserId,
                details: newProfile,
                company_name: profile.company_name || profile.companyName || 'My Company',
                updated_at: new Date()
            }], { onConflict: 'user_id' }).then(({ error }) => {
                if (error) console.error("Sprint Status Update Failed", error);
                else console.log("Sprint Status Updated to:", newStatus);
            });
        } else {
            localStorage.setItem('user_profile_data', JSON.stringify({ details: newProfile }));
        }
    };

    // --- RENDER HELPERS ---

    // Parse supportDetails into usable cards
    const cards = useMemo(() => {
        if (!profile || !profile.supportDetails) return [];

        return Object.entries(profile.supportDetails).map(([key, type]) => {
            const [category, item] = key.split('_');
            const meta = profile.supportMetadata?.[key] || {};

            return {
                id: key,
                category,
                item,
                type, // WF, Self, NA
                dueDate: meta.dueDate || '',
                owner: meta.owner || '',
                description: meta.description || '',
                context: meta.context || '',
                objectives: meta.objectives || '',
                subActions: meta.subActions || []
            };
        }).filter(card => {
            if (filter === 'ALL') return card.type !== 'NA'; // Usually hide NA in "Everything"
            if (filter === 'NA') return card.type === 'NA';
            return card.type === filter; // WF or Self
        });
    }, [profile, filter]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-red-600 w-12 h-12" />
        </div>
    );

    if (!profile) {
        if (loading) return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading Dashboard...</p>
            </div>
        );

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F8] p-6 text-center">
                <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="text-red-600 w-8 h-8" />
                    </div>

                    {!user ? (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                            <p className="text-gray-500 mb-8">Please log in to access your operations dashboard.</p>
                            <button
                                onClick={() => netlifyIdentity.open()}
                                className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all mb-4"
                            >
                                Log In
                            </button>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Required</h2>
                            <p className="text-gray-500 mb-8">
                                We couldn't find a business profile linked to <strong>{user.email || 'this account'}</strong>.
                            </p>
                            <a
                                href="/index.html"
                                className="block w-full py-3 bg-[#D32F2F] text-white font-bold rounded-xl hover:bg-red-800 transition-all mb-4"
                            >
                                Create New Profile
                            </a>
                            <button
                                onClick={handleLogout}
                                className="w-full py-3 border border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all mb-4"
                            >
                                Log Out
                            </button>
                        </>
                    )}

                    <a href="/index.html" className="text-sm text-gray-400 hover:text-gray-600 font-medium">
                        Return to Home
                    </a>
                </div>
            </div>
        );
    }



    // --- STREAM HANDLER ---
    const handleUpdateStream = async (streamKey, streamUpdates) => {
        if (!profile) return;

        const newStreams = {
            ...(profile.streams || {}),
            [streamKey]: {
                ...(profile.streams?.[streamKey] || {}),
                ...streamUpdates
            }
        };

        const newProfile = { ...profile, streams: newStreams };
        setProfile(newProfile); // Optimistic

        // Database Sync
        const params = new URLSearchParams(window.location.search);
        const viewClientId = params.get('view_client_id');
        const targetUserId = viewClientId || user.uid;

        if ((user && !user.isAnonymous) || viewClientId) {
            await supabase.from('profiles').upsert([{
                user_id: targetUserId,
                details: newProfile,
                company_name: profile.company_name || profile.companyName || 'My Company',
                updated_at: new Date()
            }], { onConflict: 'user_id' });
        } else {
            localStorage.setItem('user_profile_data', JSON.stringify({ details: newProfile }));
        }
    };

    // Playbook Generator (Mock/Real)
    const handleGeneratePlaybook = (title, content) => {
        // Open in new window for now
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#F4F6F8]">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <img
                        src="https://wadhwanifoundation.org/wp-content/uploads/2023/10/Wadhwani-Foundation-Logo.png"
                        alt="Wadhwani Foundation"
                        className="h-10 w-auto object-contain"
                    />
                    <div className="h-6 w-[1px] bg-gray-300 mx-2"></div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Accelerate<span className="text-[#D32F2F]">Dashboard</span></h1>
                    {/* CENTER: VIEW MODE TOGGLE */}
                    <div className="bg-gray-100 border border-gray-200 p-1 rounded-lg flex gap-1 ml-8">
                        <button
                            onClick={() => setViewMode('context')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${viewMode === 'context'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <Sparkles size={12} className={viewMode === 'context' ? 'text-yellow-500' : ''} />
                            Blueprint
                        </button>
                        <button
                            onClick={() => setViewMode('sprint')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${viewMode === 'sprint'
                                ? 'bg-white text-[#D32F2F] shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <Target size={12} />
                            Sprint
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isConsultantView && (
                        <a href="/consultant.html" className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100 hover:bg-red-100 transition-colors uppercase tracking-wide">
                            <LayoutGrid size={14} /> Back to Portfolio
                        </a>
                    )}
                    <div className="text-right hidden md:block">
                        <div className="text-xs font-bold text-gray-900">
                            {isConsultantView ? consultantName : (user?.displayName || 'Guest User')}
                        </div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                            {isConsultantView ? 'Advisor View' : profile?.industry || 'User'}
                        </div>
                    </div>
                    {!isConsultantView && (
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-all"
                            title="Log Out"
                        >
                            <LogOut size={20} />
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 py-8">
                {viewMode === 'context' ? (
                    // === BLUEPRINT VIEW ===
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
                        {/* 1. HEADER CARD */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 relative overflow-hidden flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="text-yellow-500 w-4 h-4" />
                                    <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Strategic Blueprint</span>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">{profile.companyName}</h2>
                                <p className="text-gray-500 text-sm">Review your expansion roadmap before proceeding.</p>
                            </div>
                            {profile.logo && (
                                <img src={profile.logo} alt="Company Logo" className="h-16 w-auto object-contain" />
                            )}
                        </div>

                        {/* 2. STRATEGY SUMMARY */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Core Strategy</h3>
                                <p className="text-gray-600 leading-relaxed italic border-l-4 border-red-500 pl-4 bg-gray-50 py-4 pr-4 rounded-r-lg">
                                    "{profile.strategyDescription || 'No summary provided.'}"
                                </p>
                            </div>
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Expansion Goals</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Target Revenue (4Y)</div>
                                        <div className="text-2xl font-black text-gray-900">₹ {profile.growthTarget} Cr</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Venture Type</div>
                                        <div className="text-lg font-bold text-indigo-600">{profile.ventureType}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // === SPRINT VIEW ===
                    <>
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sprint Execution</h2>
                                <p className="text-gray-500">Track implementation across 6 critical streams.</p>
                            </div>
                        </div>

                        <StreamExecutionView
                            profile={profile}
                            onUpdateProfile={handleUpdateStream}
                            onGeneratePlaybook={handleGeneratePlaybook}
                        />
                    </>
                )}
            </main>
        </div>
    );
}

// --- SUB-COMPONENTS ---

const StreamCard = ({ streamName, data, profile, onUpdate, onGeneratePlaybook }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [playbookLoading, setPlaybookLoading] = useState(false);
    const [showExperts, setShowExperts] = useState(false); // Modal state for experts

    // Ensure data structure exists
    const streamData = data || { goal: "", rag: "Green", suggestions: [], subStreams: [] };
    const actions = streamData.subStreams || [];

    // Derived state
    const currentActionId = streamData.currentActionId; // Store ID of selected current action
    const currentAction = actions.find(a => a.id === currentActionId) || actions[0] || null;

    const handleGenerateSubStreams = async () => {
        if (!streamData.goal) {
            alert("Please set an End Goal first.");
            return;
        }
        setIsGenerating(true);
        const { template } = await getPromptQuery('generate_substreams', `
            Act as an Execution Expert and Project Manager.
            
            Context:
            Stream: "{{streamName}}"
            Selected End Goal: "{{endGoal}}"
            Venture Context: {{strategyDescription}}
            
            Task:
            Generate 5 SMART sub-streams (actions/checkpoints) to achieve this End Goal.
            Spread them out over a timeline (approx 30, 90, 120, 150, 180 days).
            
            Return a JSON array of objects with this exact schema:
            [
                {
                    "title": "Short Action Title",
                    "description": "Specific action description",
                    "deliverable": "Tangible output/artifact",
                    "days_due": 30
                }
            ]
            Return ONLY valid JSON.
        `);
        const prompt = hydratePrompt(template, {
            streamName,
            endGoal: streamData.goal,
            strategyDescription: profile.strategyDescription || ''
        });

        try {
            console.log("🤖 Generating Execution Plan...");
            const raw = await generateWithContext(prompt, profile);
            console.log("📝 Raw AI Response:", raw);

            const list = cleanAndParseJson(raw);
            console.log("📊 Parsed List:", list);

            if (Array.isArray(list) && list.length > 0) {
                // Enrich with IDs
                const newActions = list.map((item, idx) => ({
                    ...item,
                    id: Date.now() + idx,
                    status: 'Not Started',
                    owner: '',
                    dueDate: ''
                }));

                onUpdate(streamName, {
                    subStreams: newActions,
                    currentActionId: newActions[0].id
                });
            } else {
                console.error("❌ Invalid format returned:", list);
                alert("AI generated invalid format. Please try again. Check console for details.");
            }
        } catch (e) {
            console.error("AI Generation Error:", e);
            alert(`Failed to generate actions. Error: ${e.message}`);
        }
        setIsGenerating(false);
    };

    const updateAction = (actionId, field, value) => {
        const newActions = actions.map(a => a.id === actionId ? { ...a, [field]: value } : a);
        onUpdate(streamName, { subStreams: newActions });
    };

    const handlePlaybook = async () => {
        if (!currentAction) return;
        setPlaybookLoading(true);
        const { template } = await getPromptQuery('generate_stream_playbook', `
            Act as a Business Process Expert.
            
            Context:
            Stream: "{{streamName}}"
            Action: "{{actionTitle}}"
            Goal: "{{endGoal}}"
            
            Task:
            Create a comprehensive, interactive "Playbook" for executing this specific action.
            Output MUST be valid HTML code using Tailwind CSS for styling.
            
            Structure:
            1. Title & Executive Summary
            2. Step-by-Step SOP (Standard Operating Procedure)
            3. Required Resources & Tools
            4. Key Performance Indicators (KPIs)
            5. Common Risks & Mitigation
            
            Design:
            - Use a clean, professional, "Enterprise SaaS" aesthetic (Inter font, slate/blue colors).
            - Use cards, lists, and clear typography.
            - Do NOT include <html> or <body> tags, just the inner content container.
            
            Return ONLY the HTML string.
        `);
        const prompt = hydratePrompt(template, {
            streamName,
            actionTitle: currentAction.title,
            endGoal: streamData.goal
        });

        // Mock opening playbook
        try {
            const html = await generateWithContext(prompt, profile);
            // In a real app, we'd open this in a modal or new window. 
            // For now, let's just save it to the action for display or log it.
            console.log("Playbook Generated:", html);
            onGeneratePlaybook(currentAction.title, html);
        } catch (e) {
            alert("Failed to generate playbook");
        }
        setPlaybookLoading(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
            {/* TOP: Header & Goal */}
            <div className="bg-gray-50 border-b border-gray-100 p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 text-lg">{streamName}</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${streamData.rag === 'Red' ? 'bg-red-500' : streamData.rag === 'Amber' ? 'bg-amber-400' : 'bg-emerald-500'}`}></div>
                        <select
                            value={streamData.rag || 'Green'}
                            onChange={(e) => onUpdate(streamName, { rag: e.target.value })}
                            className="text-xs font-bold bg-white border border-gray-200 rounded px-2 py-1 outline-none"
                        >
                            <option value="Green">On Track</option>
                            <option value="Amber">Issues</option>
                            <option value="Red">Critical</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">End Goal</label>
                    <textarea
                        className="w-full bg-transparent font-medium text-gray-900 border-b border-dashed border-gray-300 focus:border-indigo-500 outline-none py-1 text-sm resize-none"
                        rows={2}
                        value={streamData.goal}
                        onChange={(e) => onUpdate(streamName, { goal: e.target.value })}
                        placeholder="Define end goal..."
                    />
                </div>
            </div>

            {/* MIDDLE: ACTION PLANNING */}
            <div className="p-4 flex-1 space-y-4">
                {actions.length === 0 ? (
                    <div className="text-center py-8">
                        <button
                            onClick={handleGenerateSubStreams}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-sm hover:bg-indigo-100 transition-colors flex items-center gap-2 mx-auto"
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            Generate Execution Plan
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Current Action Selector */}
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Select Next Action</label>
                                <select
                                    className="w-full text-sm font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-lg p-2 outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                                    value={currentActionId || ''}
                                    onChange={(e) => onUpdate(streamName, { currentActionId: Number(e.target.value) })}
                                >
                                    {actions.map(a => (
                                        <option key={a.id} value={a.id}>{a.title} ({a.status})</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    const newAction = {
                                        id: Date.now(),
                                        title: "New Action Item",
                                        status: 'Not Started',
                                        owner: '',
                                        dueDate: ''
                                    };
                                    onUpdate(streamName, {
                                        subStreams: [...actions, newAction],
                                        currentActionId: newAction.id
                                    });
                                }}
                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                                title="Add Manual Action"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                        {/* Owner & Date */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Assign Owner</label>
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-1.5 code">
                                    <User size={12} className="text-gray-400" />
                                    <input
                                        className="bg-transparent w-full text-xs font-medium outline-none"
                                        placeholder="Name..."
                                        value={currentAction?.owner || ''}
                                        onChange={(e) => updateAction(currentActionId, 'owner', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Target Date</label>
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-1.5 code">
                                    <Calendar size={12} className="text-gray-400" />
                                    <input
                                        type="date"
                                        className="bg-transparent w-full text-xs font-medium outline-none"
                                        value={currentAction?.dueDate || ''}
                                        onChange={(e) => updateAction(currentActionId, 'dueDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* BOTTOM: EXECUTION CONTROLS */}
            {currentAction && (
                <div className="bg-gray-50 p-4 border-t border-gray-100 space-y-3">
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Action Status</label>
                        <div className="flex bg-white rounded border border-gray-200 p-1 shadow-sm">
                            {['Done', 'In Progress', 'Delayed'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => updateAction(currentActionId, 'status', st)}
                                    className={`flex-1 text-[10px] font-bold py-1.5 rounded transition-all ${currentAction.status === st
                                        ? (st === 'Done' ? 'bg-emerald-500 text-white shadow-md' : st === 'In Progress' ? 'bg-blue-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md')
                                        : 'text-gray-400 hover:bg-gray-50'
                                        }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                            onClick={handlePlaybook}
                            disabled={playbookLoading}
                            className="py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
                        >
                            {playbookLoading ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
                            Playbook
                        </button>
                        <button
                            onClick={() => setShowExperts(true)}
                            className="py-2 bg-white border border-purple-200 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-50 transition-colors flex items-center justify-center gap-1"
                        >
                            <Users size={12} /> Experts
                        </button>
                    </div>
                </div>
            )}

            {/* EXPERTS MODAL */}
            {showExperts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                        <div className="bg-purple-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold">Recommended Experts</h3>
                            <button onClick={() => setShowExperts(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={16} /></button>
                        </div>
                        <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">E{i}</div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-gray-900 group-hover:text-purple-600">Expert Name {i}</div>
                                        <div className="text-xs text-gray-500">Specialist in {streamName}</div>
                                    </div>
                                    <button className="p-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100">
                                        <MessageCircle size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                            <p className="text-xs text-gray-400">Select an expert to request a session.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StreamExecutionView = ({ profile, onUpdateProfile, onGeneratePlaybook }) => {
    // Helper to update specific deep stream data
    const handleStreamUpdate = (streamName, updates) => {
        const currentStreams = profile.streams || {};
        const newStreams = {
            ...currentStreams,
            [streamName]: {
                ...(currentStreams[streamName] || {}),
                ...updates
            }
        };
        // Update profile via parent handler
        onUpdateProfile('streams', newStreams);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {STREAMS.map(stream => (
                <StreamCard
                    key={stream}
                    streamName={stream}
                    data={profile.streams?.[stream]}
                    profile={profile}
                    onUpdate={handleStreamUpdate}
                    onGeneratePlaybook={onGeneratePlaybook}
                />
            ))}
        </div>
    );
};
