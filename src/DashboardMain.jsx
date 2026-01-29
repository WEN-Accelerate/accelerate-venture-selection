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
import { reliableGenerateContent, cleanAndParseJson } from './utils/aiService';

// --- CONFIG ---

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



    return (
        <div className="min-h-screen bg-[#F4F6F8] font-sans text-gray-900 selection:bg-red-100 selection:text-red-900">
            {/* HEADER */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src="https://wadhwanifoundation.org/wp-content/uploads/2023/10/Wadhwani-Foundation-Logo.png"
                            alt="Wadhwani Foundation"
                            className="h-8 w-auto object-contain"
                        />
                        <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
                        <h1 className="text-xl font-bold font-barlow tracking-tight text-gray-900">
                            Accelerate <span className="text-red-600">Dashboard</span>
                        </h1>
                    </div>

                    {/* CENTER: VIEW MODE TOGGLE */}
                    <div className="bg-white border border-gray-200 p-1 rounded-full flex gap-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('context')}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${viewMode === 'context'
                                ? 'bg-[#1e293b] text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <Sparkles size={12} className={viewMode === 'context' ? 'text-yellow-400' : ''} />
                            Blueprint
                        </button>
                        <button
                            onClick={() => setViewMode('sprint')}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${viewMode === 'sprint'
                                ? 'bg-[#D32F2F] text-white shadow-md'
                                : 'text-gray-500 hover:text-red-700 hover:bg-red-50'
                                }`}
                        >
                            <Target size={12} />
                            Sprint
                        </button>
                        <button
                            onClick={() => setViewMode('actions')}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${viewMode === 'actions'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-indigo-700 hover:bg-indigo-50'
                                }`}
                        >
                            <Briefcase size={12} />
                            Actions
                        </button>
                        <button
                            onClick={() => setViewMode('reviews')}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${viewMode === 'reviews'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                        >
                            <BarChart3 size={12} />
                            Reviews
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {isConsultantView && (
                            <a
                                href="/consultant.html"
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100 hover:bg-red-100 transition-colors uppercase tracking-wide"
                            >
                                <LayoutGrid size={14} /> Back to Portfolio
                            </a>
                        )}
                        <div className="text-right hidden md:block">
                            <div className="text-xs font-bold text-gray-900">
                                {isConsultantView ? consultantName : (user?.displayName || 'Guest User')}
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                                {isConsultantView ? 'Advisor View' : profile.industry}
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
                </div>
            </header>
            {/* USER JOURNEY TIMELINE (Visible Everywhere) */}
            <UserJourneyTimeline profile={profile} cards={cards} />

            <main className="max-w-7xl mx-auto px-8 pb-20">

                {/* VIEW: CONTEXT (STRATEGY BLUEPRINT) */}
                {viewMode === 'context' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* 1. HEADER CARD */}
                        <div className="bg-gradient-to-r from-[#D32F2F] to-[#b71c1c] text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            <div className="relative z-10 flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="text-yellow-300 w-4 h-4" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-yellow-300 uppercase">Strategic Blueprint</span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-white mb-2">{profile.companyName}</h2>
                                    <p className="text-white/80 text-sm">Review your expansion roadmap before proceeding.</p>
                                </div>
                                {profile.logo ? (
                                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 h-20 w-20 flex items-center justify-center">
                                        <img src={profile.logo} alt="Company Logo" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="h-20 w-20 rounded-xl bg-white p-1 shadow-sm border border-gray-100 flex items-center justify-center">
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-3xl rounded-lg">
                                            {profile.companyName?.charAt(0) || 'C'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. ORGANIZATION PROFILE */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                <Building2 className="text-gray-400" size={20} />
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Organization Profile</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Industry</label>
                                    <div className="font-semibold text-gray-900">{profile.industry || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Employees</label>
                                    <div className="font-semibold text-gray-900">{profile.employees || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Key Personnel</label>
                                    <div className="font-semibold text-gray-900">{profile.keyPersonnel || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Company Hub</label>
                                    <div className="font-semibold text-gray-900">{profile.hub || 'Not Assigned'}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Target Customer</label>
                                    <div className="font-semibold text-gray-900 leading-relaxed text-sm">{profile.customers || '-'}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Key Products</label>
                                    <div className="font-semibold text-gray-900 leading-relaxed text-sm">{profile.products || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 3. FINANCIAL BASELINE */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                <CreditCard className="text-gray-400" size={20} />
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Financial Baseline</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Current Revenue</label>
                                    <div className="text-3xl font-black text-gray-900">{profile.revenue || '-'}</div>
                                </div>
                                <div className="flex flex-col md:items-end">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Profitability Status</label>
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${profile.profitability === 'Profitable' ? 'bg-emerald-100 text-emerald-700' :
                                        profile.profitability === 'LossMaking' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-600'
                                        } `}>
                                        {profile.profitability || 'Unknown'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4. EXPANSION STRATEGY (Restyled) */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                <TrendingUp className="text-gray-400" size={20} />
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Expansion Strategy</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Venture Type</label>
                                    <div className="flex items-center gap-3">
                                        {profile.ventureType === 'Domestic' ?
                                            <Building2 size={24} className="text-orange-500" /> :
                                            <Globe size={24} className="text-indigo-500" />
                                        }
                                        <span className="text-xl font-bold text-gray-900">{profile.ventureType} Expansion</span>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">4-Year Revenue Target</label>
                                    <div className="text-2xl font-black text-emerald-600">
                                        ₹ {profile.growthTarget || '-'} Cr
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Core Strategy Statement</label>
                                <p className="text-sm text-gray-600 leading-relaxed border-l-4 border-red-500 pl-4 italic bg-gray-50 py-3 pr-3 rounded-r-lg">
                                    "{profile.strategyDescription || 'No summary provided.'}"
                                </p>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-4">Execution Framework (4Ps)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                        <div className="text-[10px] text-indigo-600 font-bold uppercase mb-2">Product</div>
                                        <div className="text-sm font-medium text-gray-800 leading-snug">{profile.strategyDimensions?.product || '-'}</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                        <div className="text-[10px] text-indigo-600 font-bold uppercase mb-2">Proposition</div>
                                        <div className="text-sm font-medium text-gray-800 leading-snug">{profile.strategyDimensions?.proposition || '-'}</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                        <div className="text-[10px] text-indigo-600 font-bold uppercase mb-2">Channel (Place)</div>
                                        <div className="text-sm font-medium text-gray-800 leading-snug">{profile.strategyDimensions?.place || '-'}</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                        <div className="text-[10px] text-indigo-600 font-bold uppercase mb-2">Promotion</div>
                                        <div className="text-sm font-medium text-gray-800 leading-snug">{profile.strategyDimensions?.promotion || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VIEW: SPRINT (CARDS) */}
                {viewMode === 'sprint' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* SPRINT FILTERS */}
                        <div className="flex justify-center mb-10">
                            <div className="bg-white p-1.5 rounded-full flex gap-1 shadow-sm border border-gray-200">
                                <FilterButton label="Everything" active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
                                <FilterButton label="WF" active={filter === 'WF'} onClick={() => setFilter('WF')} />
                                <FilterButton label="Self" active={filter === 'Self'} onClick={() => setFilter('Self')} />
                            </div>
                        </div>

                        {/* GRID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {cards.map(card => (
                                <KaizenCard
                                    key={card.id}
                                    card={card}
                                    onClick={() => setSelectedCard(card)}
                                />
                            ))}
                            {cards.length === 0 && (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                                    <Filter size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm font-semibold">No items found for this filter.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VIEW: ACTIONS (CONSOLIDATED RESOURCES & KANBAN) */}
                {viewMode === 'actions' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* ACTIONS FILTERS */}
                        <div className="flex justify-center mb-10">
                            <div className="bg-white p-1.5 rounded-full flex gap-1 shadow-sm border border-gray-200">
                                <FilterButton label="Everything" active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
                                <FilterButton label="WF" active={filter === 'WF'} onClick={() => setFilter('WF')} />
                                <FilterButton label="Self" active={filter === 'Self'} onClick={() => setFilter('Self')} />
                            </div>
                        </div>

                        <ActionCenterView
                            cards={cards}
                            isConsultant={isConsultantView}
                            sprintStatus={profile.sprint_status || 'Draft'}
                            onUpdateSprintStatus={(newStatus) => {
                                // Direct Profile Update for Sprint Status
                                const newProfile = { ...profile, sprint_status: newStatus };
                                setProfile(newProfile); // Optimistic

                                // Reuse existing update logic (hacky but works since we handle it in handleUpdateCard for metadata, 
                                // but for root level props we need a separate handler or just use the same pattern).
                                // handleUpdateCard only updates metadata. We need to update the root profile.
                                // Let's define a root updater logic inline or refactor update logic below.

                                // Since handleUpdateCard is cleaner, let's create `handleUpdateProfileRoot`
                                // Or simpler: Just call the same DB update logic.

                                const params = new URLSearchParams(window.location.search);
                                const viewClientId = params.get('view_client_id');
                                const targetUserId = viewClientId || user.uid;

                                if ((user && !user.isAnonymous) || viewClientId) {
                                    supabase.from('profiles').upsert([{
                                        user_id: targetUserId,
                                        details: newProfile,
                                        company_name: profile.companyName,
                                        updated_at: new Date()
                                    }], { onConflict: 'user_id' }).then(({ error }) => {
                                        if (error) console.error("Sprint Status Update Failed", error);
                                        else console.log("Sprint Status Updated to:", newStatus);
                                    });
                                } else {
                                    localStorage.setItem('user_profile_data', JSON.stringify({ details: newProfile }));
                                }
                            }}
                            onUpdateStatus={(cardId, actionId, newStatus) => {
                                // Find the card meta
                                const cardMeta = profile.supportMetadata?.[cardId] || {};
                                const currentSubActions = cardMeta.subActions || [];

                                const updatedSubActions = currentSubActions.map(a =>
                                    a.id === actionId ? { ...a, status: newStatus } : a
                                );

                                handleUpdateCard(cardId, { subActions: updatedSubActions });
                            }}
                        />
                    </div>
                )}

                {/* VIEW: REVIEWS (QUARTERLY PROGRESS) */}
                {viewMode === 'reviews' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
                        <QuarterlyProgress profileId={profile.id} isConsultant={isConsultantView} />
                    </div>
                )}

            </main>

            {/* RIGHT SIDE PANEL (SLIDE OVERS) */}
            {selectedCard && (
                <ActionPlanPanel
                    card={selectedCard}
                    profile={profile} // Pass full profile for AI context
                    isLocked={profile.sprint_status === 'Locked'}
                    isConsultant={isConsultantView}
                    onClose={() => setSelectedCard(null)}
                    onSave={(updates) => {
                        handleUpdateCard(selectedCard.id, updates);
                    }}
                />
            )}
        </div>
    );
}

// --- SUB-COMPONENTS ---

const FilterButton = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${active
            ? 'bg-[#D32F2F] text-white shadow-md transform scale-105'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
    >
        {label === 'ALL' ? 'Everything' : label}
    </button>
);

const KaizenCard = ({ card, onClick }) => {
    const isWF = card.type === 'WF';
    const accentColor = isWF ? 'text-[#D32F2F]' : 'text-emerald-600';
    const tag = isWF ? 'WF MANAGEMENT' : card.type === 'Self' ? 'SELF MANAGEMENT' : 'NOT APPLICABLE';

    // Compute Resource Needs
    const actions = card.subActions || [];
    const hasExpert = actions.some(a => a.expert);
    const hasMasterclass = actions.some(a => a.masterclass);
    const hasKP = actions.some(a => a.knowledgePack);
    const planReady = actions.length > 0;

    return (
        <div
            onClick={onClick}
            className="group bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col h-full"
        >
            {/* Top Tag */}
            <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-black tracking-widest uppercase ${accentColor}`}>
                    {tag}
                </span>
                <div className="text-gray-300 group-hover:text-gray-500 transition-colors">
                    <ExternalLink size={18} />
                </div>
            </div>

            {/* Title */}
            <div className="mb-6 flex-1">
                <h3 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{card.item}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{card.category} Pillar</p>

                {/* Description Snippet if available */}
                {card.description && (
                    <p className="mt-3 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {card.description}
                    </p>
                )}
            </div>

            {/* Metadata Fields */}
            <div className="space-y-3 mb-6 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-400 uppercase tracking-wider">Target Date</span>
                    <span className={`font-bold ${card.dueDate ? 'text-gray-900' : 'text-gray-300'}`}>
                        {card.dueDate || 'PENDING'}
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-400 uppercase tracking-wider">Ownership</span>
                    <span className={`font-bold ${card.owner ? 'text-gray-900' : 'text-gray-300'}`}>
                        {card.owner || 'UNASSIGNED'}
                    </span>
                </div>
            </div>

            {/* Separator */}
            <div className="h-px bg-gray-50 mb-4"></div>

            {/* Plan Status & Resources */}
            {planReady ? (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Plan Resources</span>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={10} /> Ready
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {hasExpert && (
                            <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg" title="Expert Consultation">
                                <MessageCircle size={14} />
                            </div>
                        )}
                        {hasMasterclass && (
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg" title="Masterclass">
                                <GraduationCap size={14} />
                            </div>
                        )}
                        {hasKP && (
                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg" title="Knowledge Pack">
                                <Box size={14} />
                            </div>
                        )}
                        {!hasExpert && !hasMasterclass && !hasKP && (
                            <span className="text-[10px] text-gray-400 italic">No external help needed</span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-red-50 rounded-xl p-3 border border-red-100 flex items-center justify-center gap-2 text-red-600 group-hover:bg-[#D32F2F] group-hover:text-white transition-colors">
                    <Plus size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Create Action Plan</span>
                </div>
            )}
        </div>
    );
};

// --- NEW COMPONENTS ---

const UserJourneyTimeline = ({ profile, cards }) => {
    // Determine Stage
    // 1. Onboarded (Default)
    // 2. Sprint Designed: If cards exist and have resources mapped
    // 3. Sprint Accepted: profile.sprint_locked === true
    // 4. Progressing: Accepted + at least one action "In Progress" or "Completed"
    // 5. Completed: Accepted + ALL actions "Completed"

    const isDesigned = cards.length > 0 && cards.some(c => c.subActions && c.subActions.length > 0);
    const isLocked = profile.sprint_status === 'Locked';

    // Check progress
    let totalActions = 0;
    let completedActions = 0;
    let inProgressActions = 0;

    cards.forEach(c => {
        const acts = c.subActions || [];
        totalActions += acts.length;
        completedActions += acts.filter(a => a.status === 'Completed').length;
        inProgressActions += acts.filter(a => a.status === 'In Progress').length;
    });

    const isProgressing = isLocked && (completedActions > 0 || inProgressActions > 0);
    const isCompleted = isLocked && totalActions > 0 && totalActions === completedActions;

    let currentStage = 1;
    if (isCompleted) currentStage = 5;
    else if (isProgressing) currentStage = 4;
    else if (isLocked) currentStage = 3;
    else if (isDesigned) currentStage = 2;

    const stages = [
        { id: 1, label: 'Onboarded', icon: Check },
        { id: 2, label: 'Sprint Designed', icon: Wand2 },
        { id: 3, label: 'Sprint Accepted', icon: ShieldCheck },
        { id: 4, label: 'Progressing', icon: TrendingUp },
        { id: 5, label: 'Completed', icon: Award },
    ];

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Sprint Journey</h3>
            <div className="relative flex justify-between">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded-full"></div>
                <div className="absolute top-1/2 left-0 h-1 bg-red-600 -z-10 -translate-y-1/2 rounded-full transition-all duration-1000"
                    style={{ width: `${((currentStage - 1) / (stages.length - 1)) * 100}%` }}></div>

                {stages.map((stage) => {
                    const isActive = currentStage >= stage.id;
                    const isCurrent = currentStage === stage.id;

                    return (
                        <div key={stage.id} className="flex flex-col items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${isActive
                                ? 'bg-red-600 border-red-100 text-white shadow-lg shadow-red-200 scale-110'
                                : 'bg-white border-gray-200 text-gray-300'
                                }`}>
                                <stage.icon size={16} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-gray-900' : 'text-gray-300'
                                }`}>
                                {stage.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SprintStats = ({ requests }) => {
    return (
        <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 flex items-center justify-between">
                <div>
                    <div className="text-2xl font-black text-purple-700">{requests.stats.expert}</div>
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Active Experts</div>
                </div>
                <MessageCircle className="text-purple-200" size={32} />
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center justify-between">
                <div>
                    <div className="text-2xl font-black text-blue-700">{requests.stats.masterclass}</div>
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Masterclasses</div>
                </div>
                <GraduationCap className="text-blue-200" size={32} />
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-center justify-between">
                <div>
                    <div className="text-2xl font-black text-amber-700">{requests.stats.knowledgePack}</div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Knowledge Packs</div>
                </div>
                <Box className="text-amber-200" size={32} />
            </div>
        </div>
    );
};

const ActionCenterView = ({ cards, isConsultant, onUpdateStatus, sprintStatus, onUpdateSprintStatus }) => {

    // 1. Flatten all actions
    const allActions = useMemo(() => {
        let actions = [];
        cards.forEach(card => {
            if (card.subActions) {
                card.subActions.forEach(action => {
                    actions.push({
                        ...action,
                        cardTitle: card.item, // Parent Capability
                        cardId: card.id,
                        cardType: card.type, // WF or Self
                        owner: card.owner
                    });
                });
            }
        });
        return actions;
    }, [cards]);

    // 2. Stats
    const stats = useMemo(() => {
        return {
            expert: allActions.filter(a => a.expert).length,
            masterclass: allActions.filter(a => a.masterclass).length,
            knowledgePack: allActions.filter(a => a.knowledgePack).length
        }
    }, [allActions]);

    const isLocked = sprintStatus === 'Locked';

    // Group by Status for Kanban
    const columns = {
        'Not Started': allActions.filter(a => !a.status || a.status === 'Not Started'),
        'In Progress': allActions.filter(a => a.status === 'In Progress'),
        'Completed': allActions.filter(a => a.status === 'Completed')
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header Stats */}
            <SprintStats requests={{ stats }} />

            <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Sprint Execution Board</h2>
                    <p className="text-sm text-gray-500">Track and update the status of every action item.</p>
                </div>

                {/* SPRINT LOCK CONTROLS */}
                {isConsultant ? (
                    <div className="flex items-center gap-3">
                        {sprintStatus === 'Locked' ? (
                            <span className="px-4 py-2 bg-gray-100 text-gray-500 font-bold rounded-xl flex items-center gap-2 border border-gray-200">
                                <ShieldCheck size={16} /> Sprint Locked & Progressing
                            </span>
                        ) : sprintStatus === 'SentToUser' ? (
                            <span className="px-4 py-2 bg-amber-50 text-amber-600 font-bold rounded-xl flex items-center gap-2 border border-amber-200 animate-pulse">
                                <CheckCircle size={16} /> Pending Client Acceptance
                            </span>
                        ) : (
                            // Default: Draft / Ready to Send
                            (() => {
                                // 3. Validate WF Cards
                                const wfCards = cards.filter(c => c.type === 'WF');
                                const isReadyToSend = wfCards.length > 0 && wfCards.every(c => c.subActions && c.subActions.length > 0);

                                return (
                                    <div className="flex items-center gap-3">
                                        {!isReadyToSend && (
                                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider text-right max-w-[150px] leading-tight">
                                                Action plan required for all WF cards
                                            </span>
                                        )}
                                        <button
                                            onClick={() => onUpdateSprintStatus('SentToUser')}
                                            disabled={!isReadyToSend}
                                            className={`px-6 py-2 font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${isReadyToSend
                                                    ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                                }`}
                                        >
                                            <Send size={16} /> Send Sprint to Client
                                        </button>
                                    </div>
                                );
                            })()
                        )}
                    </div>
                ) : (
                    // User View
                    <div className="flex items-center gap-3">
                        {sprintStatus === 'SentToUser' ? (
                            <button
                                onClick={() => onUpdateSprintStatus('Locked')}
                                className="px-6 py-2 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex items-center gap-2 animate-pulse"
                            >
                                <Check size={16} /> Accept Sprint Plan
                            </button>
                        ) : sprintStatus === 'Locked' ? (
                            <span className="px-4 py-2 bg-green-50 text-green-700 font-bold rounded-xl flex items-center gap-2 border border-green-200">
                                <ShieldCheck size={16} /> Sprint Accepted
                            </span>
                        ) : (
                            <span className="px-4 py-2 bg-gray-100 text-gray-500 font-bold rounded-xl flex items-center gap-2 border border-gray-200">
                                <Wand2 size={16} /> Designing Sprint...
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* KANBAN BOARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(columns).map(([colName, items]) => (
                    <div key={colName} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex flex-col h-full min-h-[500px]">
                        <div className={`flex justify-between items-center mb-4 px-2 pb-3 border-b border-gray-100 ${colName === 'Completed' ? 'border-green-200' :
                            colName === 'In Progress' ? 'border-amber-200' : 'border-gray-200'
                            }`}>
                            <h3 className="font-bold text-gray-700 uppercase tracking-wider text-xs flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${colName === 'Completed' ? 'bg-green-500' :
                                    colName === 'In Progress' ? 'bg-amber-500' : 'bg-gray-400'
                                    }`}></div>
                                {colName}
                            </h3>
                            <span className="bg-white px-2 py-0.5 rounded-md text-[10px] font-bold text-gray-400 border border-gray-200 shadow-sm">
                                {items.length}
                            </span>
                        </div>

                        <div className="flex-1 space-y-3">
                            {items.length === 0 && (
                                <div className="h-32 flex items-center justify-center text-gray-300 text-xs italic border-2 border-dashed border-gray-200 rounded-xl">
                                    No items
                                </div>
                            )}
                            {items.map(action => (
                                <div key={action.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md transition-all">

                                    {/* Card Tags */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${action.cardType === 'WF' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                            }`}>
                                            {action.cardType}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[120px]" title={action.cardTitle}>
                                            {action.cardTitle}
                                        </span>
                                    </div>

                                    <div className="text-sm font-bold text-gray-900 mb-3 leading-snug">
                                        {action.text}
                                    </div>

                                    {/* Resources Icons */}
                                    <div className="flex gap-1 mb-4">
                                        {action.expert && <div className="p-1 bg-purple-50 text-purple-600 rounded" title="Expert"><MessageCircle size={10} /></div>}
                                        {action.masterclass && <div className="p-1 bg-blue-50 text-blue-600 rounded" title="Masterclass"><GraduationCap size={10} /></div>}
                                        {action.knowledgePack && <div className="p-1 bg-amber-50 text-amber-600 rounded" title="Knowledge Pack"><Box size={10} /></div>}
                                    </div>

                                    {/* Actions */}
                                    {isConsultant ? (
                                        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                                            {/* Move Left */}
                                            {colName !== 'Not Started' ? (
                                                <button
                                                    onClick={() => onUpdateStatus(action.cardId, action.id, colName === 'Completed' ? 'In Progress' : 'Not Started')}
                                                    className="text-gray-400 hover:text-gray-600 text-[10px] font-bold uppercase flex items-center gap-1"
                                                >
                                                    ← Back
                                                </button>
                                            ) : <div></div>}

                                            {/* Move Right */}
                                            {colName !== 'Completed' ? (
                                                <button
                                                    onClick={() => onUpdateStatus(action.cardId, action.id, colName === 'Not Started' ? 'In Progress' : 'Completed')}
                                                    className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold uppercase flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md"
                                                >
                                                    Move to {colName === 'Not Started' ? 'In Progress' : 'Completed'} →
                                                </button>
                                            ) : (
                                                <div className="text-green-600 text-[10px] font-bold uppercase flex items-center gap-1">
                                                    <CheckCircle size={12} /> Done
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // User View (Read Only Status)
                                        <div className="pt-2 border-t border-gray-50 text-right">
                                            <span className={`text-[10px] font-bold uppercase ${action.status === 'Completed' ? 'text-green-600' :
                                                action.status === 'In Progress' ? 'text-amber-600' : 'text-gray-400'
                                                }`}>
                                                {action.status || 'Pending'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ActionPlanPanel = ({ card, profile, onClose, onSave, isLocked, isConsultant }) => {
    // Local state for form fields
    const [dueDate, setDueDate] = useState(card.dueDate || '');
    const [owner, setOwner] = useState(card.owner || '');
    const [description, setDescription] = useState(card.description || '');
    const [context, setContext] = useState(card.context || '');
    const [objectives, setObjectives] = useState(card.objectives || '');
    const [subActions, setSubActions] = useState(card.subActions || []);

    const [aiLoading, setAiLoading] = useState(false);

    // AI Helper (Only Viewable/Actionable if NOT Locked or if Consultant overrides - usually locked means frozen scope)
    // Actually, consultant can probably still edit, but user cannot.
    const canEdit = isConsultant; // Consultant has power to edit even if locked (Change request), but let's stick to request "SME should not change status" implies SME is read only mostly.
    // Spec: "User (SME) should able to see actions and not change the status"
    // Spec: "WF Sprint Locks once sent by consultant to user accepets the sprint"
    // Assuming Consultant defines, User accepts. Once accepted, can Consultant edit? Likely yes, to manage it.

    const generatePlanWithAI = async () => {
        if (!canEdit) return;
        setAiLoading(true);
        try {
            const prompt = `
                Act as a Strategy Consultant for ${profile.companyName || 'a company'} (Industry: ${profile.industry || 'Unknown'}).
                
                COMPREHENSIVE CONTEXT:
                - Products: ${profile.products || 'Not specified'}
                - Target Customers: ${profile.customers || 'Not specified'}
                - Current Revenue: ${profile.revenue || 'Not specified'} (${profile.profitability || 'Unknown Status'})
                - Team Size: ${profile.employees || 'Not specified'}
                - Core Strategy Statement: "${profile.strategyDescription || 'N/A'}"
                - Expansion Goal: ${profile.ventureType} Expansion targeting ${profile.growthTarget ? '$' + profile.growthTarget : 'growth'}.

                FOCUS AREA:
                - Capability to Build: "${card.item}"
                - Category: ${card.category} Support
                - Execution Mode: ${card.type} (Where 'WF' = Wadhwani Foundation supported, 'Self' = In-house)

                TASK:
                Create a highly specific, tactical Action Plan for executing this capability.
                
                Return a JSON object with:
                1. "description": A 2-sentence description of what this capability entails strategically.
                2. "context": Why is this specifically critical for ${profile.ventureType} expansion given the context above?
                3. "objectives": The primary specific outcome/objective to achieve implies success.
                4. "actions": An array of 5 specific, actionable sub-tasks. Each must have:
                   - "text": The action text (be specific).
                   - "masterclass": boolean (Is a workshop/training needed?)
                   - "expert": boolean (Is expert consultation needed?)
                   - "knowledge_pack": boolean (Is a template/guide/tool needed?)
                
                Return JSON only.
            `;

            const text = await reliableGenerateContent(prompt);

            if (!text) throw new Error("AI returned empty response");

            const data = cleanAndParseJson(text);

            setDescription(data.description || description);
            setContext(data.context || context);
            setObjectives(data.objectives || objectives);

            if (data.actions && Array.isArray(data.actions)) {
                const newActions = data.actions.map((act, idx) => ({
                    id: Date.now() + idx,
                    text: act.text,
                    masterclass: act.masterclass || false,
                    expert: act.expert || false,
                    knowledgePack: act.knowledge_pack || false,
                    status: 'Not Started' // Default status
                }));
                setSubActions(newActions);
            }

        } catch (e) {
            console.error("AI Error:", e);
            alert("Could not generate plan. Please try again.");
        }
        setAiLoading(false);
    };

    const handleSave = () => {
        if (!canEdit) return;
        onSave({
            dueDate,
            owner,
            description,
            context,
            objectives,
            subActions
        });
    };

    // Sub Action Handlers
    const addSubAction = () => {
        setSubActions([...subActions, {
            id: Date.now(),
            text: "",
            masterclass: false,
            expert: false,
            knowledgePack: false,
            status: 'Not Started'
        }]);
    };

    const removeSubAction = (id) => {
        setSubActions(subActions.filter(a => a.id !== id));
    };

    const updateSubAction = (id, field, value) => {
        setSubActions(subActions.map(a =>
            a.id === id ? { ...a, [field]: value } : a
        ));
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            {/* Panel */}
            <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-red-100 text-[#D32F2F] text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                                {card.category} Support
                            </span>
                            <span className="text-gray-400 text-xs">•</span>
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                                {card.type} Mode
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{card.item}</h2>
                        <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm hover:border-red-200 transition-colors group">
                                <Calendar size={14} className="text-gray-400 group-hover:text-red-500" />
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => canEdit && setDueDate(e.target.value)}
                                    readOnly={!canEdit}
                                    className="text-xs font-bold text-gray-700 outline-none bg-transparent uppercase cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm hover:border-red-200 transition-colors group flex-1">
                                <User size={14} className="text-gray-400 group-hover:text-red-500" />
                                <input
                                    type="text"
                                    value={owner}
                                    onChange={(e) => canEdit && setOwner(e.target.value)}
                                    readOnly={!canEdit}
                                    placeholder="Assign Owner..."
                                    className="text-xs font-bold text-gray-700 outline-none bg-transparent w-full"
                                />
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">

                    {/* Section 1: Context & Objectives (AI Powered) */}
                    <div className="relative group">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Target size={16} className="text-red-600" />
                                Strategic Context
                            </h3>
                            {canEdit && (
                                <button
                                    onClick={generatePlanWithAI}
                                    disabled={aiLoading}
                                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    {aiLoading ? 'Analyzing...' : 'Auto-Generate with AI'}
                                </button>
                            )}
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 focus-within:ring-2 focus-within:ring-red-500/10 transition-shadow">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                                <textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e) => canEdit && setDescription(e.target.value)}
                                    readOnly={!canEdit}
                                    className="w-full text-sm text-gray-800 font-medium bg-transparent outline-none resize-none placeholder:text-gray-300"
                                    placeholder="What is this initiative about?"
                                />
                            </div>
                            <div className="h-px bg-gray-100"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Strategic Importance</label>
                                    <textarea
                                        rows={3}
                                        value={context}
                                        onChange={(e) => canEdit && setContext(e.target.value)}
                                        readOnly={!canEdit}
                                        className="w-full text-sm text-gray-600 leading-relaxed bg-transparent outline-none resize-none placeholder:text-gray-300"
                                        placeholder="Why is this critical now?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Success Metrics</label>
                                    <textarea
                                        rows={3}
                                        value={objectives}
                                        onChange={(e) => canEdit && setObjectives(e.target.value)}
                                        readOnly={!canEdit}
                                        className="w-full text-sm text-gray-600 leading-relaxed bg-transparent outline-none resize-none placeholder:text-gray-300"
                                        placeholder="What does success look like?"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Action Plan */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={16} className="text-red-600" />
                                Execution Plan
                            </h3>
                            {canEdit && (
                                <button
                                    onClick={addSubAction}
                                    className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 flex items-center gap-1 transition-all"
                                >
                                    <Plus size={12} /> Add Item
                                </button>
                            )}
                        </div>

                        <div className="space-y-3">
                            {subActions.length === 0 && (
                                <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-sm text-gray-400 font-medium">No actions defined yet.</p>
                                    {canEdit && <button onClick={generatePlanWithAI} className="text-indigo-600 text-xs font-bold mt-2 hover:underline">Use AI to suggest actions</button>}
                                </div>
                            )}

                            {subActions.map((action, idx) => (
                                <div key={action.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm group hover:shadow-md transition-all">
                                    <div className="flex gap-3 items-start">
                                        <div className="mt-1 text-xs font-bold text-gray-300">0{idx + 1}</div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <input
                                                    value={action.text}
                                                    onChange={(e) => canEdit && updateSubAction(action.id, 'text', e.target.value)}
                                                    readOnly={!canEdit}
                                                    className="w-full text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300 border-b border-transparent focus:border-gray-200 transition-colors pb-1 mr-2"
                                                    placeholder="Describe the action item..."
                                                />
                                                {/* Status Badge / Toggle */}
                                                <div className="flex-shrink-0">
                                                    {isConsultant ? (
                                                        <select
                                                            value={action.status || 'Not Started'}
                                                            onChange={(e) => updateSubAction(action.id, 'status', e.target.value)}
                                                            className={`text-[9px] font-bold uppercase tracking-wider border rounded px-2 py-1 outline-none cursor-pointer ${action.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                action.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    'bg-gray-50 text-gray-500 border-gray-200'
                                                                }`}
                                                        >
                                                            <option value="Not Started">Not Started</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Completed">Completed</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${action.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            action.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                'bg-gray-50 text-gray-500 border-gray-200'
                                                            }`}>
                                                            {action.status || 'Not Started'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Support Toggles */}
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    disabled={!canEdit}
                                                    onClick={() => updateSubAction(action.id, 'masterclass', !action.masterclass)}
                                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${action.masterclass
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <GraduationCap size={12} />
                                                    Masterclass
                                                </button>
                                                <button
                                                    disabled={!canEdit}
                                                    onClick={() => updateSubAction(action.id, 'expert', !action.expert)}
                                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${action.expert
                                                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <MessageCircle size={12} />
                                                    Expert
                                                </button>
                                                <button
                                                    disabled={!canEdit}
                                                    onClick={() => updateSubAction(action.id, 'knowledgePack', !action.knowledgePack)}
                                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all ${action.knowledgePack
                                                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <Box size={12} />
                                                    Knowledge Pack
                                                </button>

                                            </div>
                                        </div>
                                        {canEdit && (
                                            <button
                                                onClick={() => removeSubAction(action.id)}
                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 z-10">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors text-sm"
                    >
                        Close
                    </button>
                    {canEdit && (
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 rounded-xl font-bold text-white bg-[#D32F2F] hover:bg-[#B71C1C] shadow-lg shadow-red-200 transition-all transform hover:scale-[1.02] flex items-center gap-2 text-sm"
                        >
                            <Save size={18} />
                            Save Action Plan
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

