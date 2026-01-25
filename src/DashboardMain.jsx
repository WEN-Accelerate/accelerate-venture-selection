import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import netlifyIdentity from 'netlify-identity-widget';
import {
    Target, User, Calendar, ExternalLink, Filter,
    BookOpen, MessageCircle, X, Check, Save, Loader2, Building2, Globe, Users, TrendingUp, CreditCard, Briefcase, Sparkles, LogOut
} from 'lucide-react';

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
            const { data, error } = await supabase
                .from('profiles')
                .select('details')
                .eq('user_id', uid)
                .maybeSingle();

            if (data && data.details) {
                setProfile(data.details);
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
        if (user && !user.isAnonymous) {
            await supabase.from('profiles').upsert([{
                user_id: user.uid,
                details: newProfile,
                updated_at: new Date()
            }], { onConflict: 'user_id' });
        } else {
            // Local save
            localStorage.setItem('user_profile_data', JSON.stringify({ details: newProfile }));
        }
    };

    // --- RENDER HELPERS ---

    // Parse supportDetails into usable cards
    const getCards = () => {
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
                owner: meta.owner || ''
            };
        }).filter(card => {
            if (filter === 'ALL') return card.type !== 'NA'; // Usually hide NA in "Everything"
            if (filter === 'NA') return card.type === 'NA';
            return card.type === filter; // WF or Self
        });
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-red-600 w-12 h-12" />
        </div>
    );

    if (!profile) return (
        <div className="flex items-center justify-center p-20 text-gray-400">
            No profile data found. <a href="/index.html" className="text-red-600 underline ml-2">Return to Home</a>
        </div>
    );

    const cards = getCards();

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
                    <div className="bg-gray-100 p-1 rounded-xl flex gap-1 shadow-inner relative">
                        <button
                            onClick={() => setViewMode('context')}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${viewMode === 'context'
                                ? 'bg-gray-900 text-white shadow-lg transform scale-105 ring-1 ring-gray-900/10'
                                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'
                                }`}
                        >
                            <Sparkles size={12} className={viewMode === 'context' ? 'text-yellow-400' : ''} />
                            Blueprint
                        </button>
                        <button
                            onClick={() => setViewMode('sprint')}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${viewMode === 'sprint'
                                ? 'bg-[#D32F2F] text-white shadow-lg transform scale-105 ring-1 ring-red-900/10'
                                : 'text-gray-400 hover:text-red-900 hover:bg-red-50'
                                }`}
                        >
                            <Target size={12} />
                            Sprint
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-xs font-bold text-gray-900">{user?.displayName || 'Guest User'}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{profile.industry}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-all"
                            title="Log Out"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-8 pt-8 pb-20">

                {/* VIEW: CONTEXT (STRATEGY BLUEPRINT) */}
                {viewMode === 'context' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* 1. HEADER CARD */}
                        <div className="bg-gray-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            <div className="relative z-10 flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="text-yellow-400 w-4 h-4" />
                                        <span className="text-[10px] font-bold tracking-[0.2em] text-yellow-400 uppercase">Strategic Blueprint</span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-white mb-2">{profile.companyName}</h2>
                                    <p className="text-gray-400 text-sm">Review your expansion roadmap before proceeding.</p>
                                </div>
                                {profile.logoUrl && (
                                    <div className="hidden md:block bg-white p-2 rounded-lg shadow-lg">
                                        <img src={profile.logoUrl} alt="Company Logo" className="h-16 w-auto object-contain max-w-[120px]" />
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
                                        }`}>
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
                                        {profile.growthTarget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 }).format(profile.growthTarget) : '-'}
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
                            <div className="bg-white p-1.5 rounded-full flex gap-1 shadow-sm border border-gray-100">
                                <FilterButton label="Everything" active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
                                <FilterButton label="WF" active={filter === 'WF'} onClick={() => setFilter('WF')} />
                                <FilterButton label="Self" active={filter === 'Self'} onClick={() => setFilter('Self')} />
                                <FilterButton label="NA" active={filter === 'NA'} onClick={() => setFilter('NA')} />
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

            </main>

            {/* MODAL */}
            {selectedCard && (
                <DetailModal
                    card={selectedCard}
                    onClose={() => setSelectedCard(null)}
                    onSave={(updates) => {
                        handleUpdateCard(selectedCard.id, updates);
                        setSelectedCard(null); // Close on save or keep open? UI implies 'Save Milestones' closes it.
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
            : 'text-gray-500 hover:text-gray-900 hover:bg-white'
            }`}
    >
        {label === 'ALL' ? 'Everything' : label}
    </button>
);

const KaizenCard = ({ card, onClick }) => {
    const isWF = card.type === 'WF';
    const accentColor = isWF ? 'text-[#D32F2F]' : 'text-emerald-600';
    const tag = isWF ? 'WF MANAGEMENT' : card.type === 'Self' ? 'SELF MANAGEMENT' : 'NOT APPLICABLE';

    return (
        <div
            onClick={onClick}
            className="group bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
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
            <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{card.item}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{card.category} Support</p>
            </div>

            {/* Fields */}
            <div className="space-y-3 mb-8">
                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
                    <span className="font-bold text-gray-400 uppercase tracking-wider">Target Date</span>
                    <span className={`font-bold ${card.dueDate ? 'text-gray-900' : 'text-gray-300'}`}>
                        {card.dueDate || 'PENDING'}
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-2">
                    <span className="font-bold text-gray-400 uppercase tracking-wider">Ownership</span>
                    <span className={`font-bold ${card.owner ? 'text-gray-900' : 'text-gray-300'}`}>
                        {card.owner || 'UNASSIGNED'}
                    </span>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
                <div className="flex-1 py-3 rounded-xl border border-gray-200 text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:bg-gray-50 transition-colors">
                    Masterclass
                </div>
                <div className="flex-1 py-3 rounded-xl border border-gray-200 text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:bg-gray-50 transition-colors">
                    Talk Expert
                </div>
            </div>
        </div>
    );
};

const DetailModal = ({ card, onClose, onSave }) => {
    const isWF = card.type === 'WF';
    const [dueDate, setDueDate] = useState(card.dueDate || '');
    const [owner, setOwner] = useState(card.owner || '');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1f2e]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full transition-colors z-10"
                >
                    <X size={20} className="text-gray-500" />
                </button>

                {/* Content */}
                <div className="p-12">

                    {/* Header */}
                    <div className="mb-10 relative">
                        {/* Decorative Background Icon */}
                        <div className="absolute -top-6 -right-6 text-gray-50 opacity-50 transform rotate-12 pointer-events-none">
                            <Target size={200} />
                        </div>

                        <span className="inline-block py-1 px-3 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest mb-4">
                            Management Model: {card.type}
                        </span>
                        <h2 className="text-4xl font-black text-gray-900 mb-2 relative z-10">{card.item}</h2>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm relative z-10">{card.category} Pillar</p>
                    </div>

                    {/* Inputs Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        <div className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors group">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 group-hover:text-gray-500">Milestone Due Date</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="bg-transparent text-xl font-bold text-gray-900 w-full outline-none"
                                />
                                <Calendar className="text-gray-400 group-hover:text-gray-600" size={20} />
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors group">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 group-hover:text-gray-500">Accountable Owner</label>
                            <input
                                type="text"
                                value={owner}
                                onChange={(e) => setOwner(e.target.value)}
                                placeholder="Assign Strategy Lead..."
                                className="bg-transparent text-xl font-bold text-gray-900 w-full outline-none placeholder:text-gray-300"
                            />
                        </div>
                    </div>

                    {/* Action Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-10">
                        <button className="bg-[#0f172a] text-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-lg">
                            <BookOpen size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Masterclasses</span>
                        </button>
                        <button className="bg-[#D32F2F] text-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-lg shadow-red-200">
                            <MessageCircle size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Expert Network</span>
                        </button>
                        <button className="bg-white border border-gray-100 text-gray-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm">
                            <ExternalLink size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Resource Bank</span>
                        </button>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => onSave({ dueDate, owner })}
                            className="bg-[#D32F2F] text-white px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-xl shadow-red-200 hover:bg-[#B71C1C] transition-all hover:scale-105"
                        >
                            Save Milestones
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};
