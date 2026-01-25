import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
    Target, User, Calendar, ExternalLink, Filter,
    BookOpen, MessageCircle, X, Check, Save, Loader2, Building2, Globe
} from 'lucide-react';

// --- CONFIG ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchProfile(currentUser.uid);
            } else {
                // If not logged in, first check if we have a Guest ID (from Wizard)
                const guestId = localStorage.getItem('accelerate_guest_id');
                if (guestId) {
                    console.log("Found Guest ID:", guestId);
                    // Try determining if this guest has a profile in Supabase
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('details')
                        .eq('user_id', guestId)
                        .maybeSingle();

                    if (data && data.details) {
                        setUser({ uid: guestId, isAnonymous: true });
                        setProfile(data.details);
                        setLoading(false);
                        return;
                    }
                }

                // Fallback: Check for local data blob (legacy or offline support)
                const localData = localStorage.getItem('user_profile_data');
                if (localData) {
                    const parsed = JSON.parse(localData);
                    // Mock user structure for local dev
                    setUser({ uid: 'guest', isAnonymous: true });
                    setProfile(parsed.details);
                    setLoading(false);
                } else {
                    // Start fresh or show error
                    setLoading(false);
                }
            }
        });
        return () => unsubscribe();
    }, []);

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
            No profile data found. Please complete the setup wizard first.
        </div>
    );

    const cards = getCards();

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900 pb-20">

            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 sticky top-0 z-30 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">Operations Dashboard</h1>
                    <p className="text-gray-500 text-sm font-medium italic mt-1">Expansion Execution: {profile.companyName}</p>
                </div>

                {/* VIEW MODE TOGGLE */}
                <div className="bg-gray-100 p-1 rounded-xl flex gap-1 shadow-inner relative">
                    <button
                        onClick={() => setViewMode('context')}
                        className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'context'
                            ? 'bg-gray-900 text-white shadow-lg transform scale-105 ring-1 ring-gray-900/10'
                            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-200'
                            }`}
                    >
                        Strategic Context
                    </button>
                    <button
                        onClick={() => setViewMode('sprint')}
                        className={`px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 ${viewMode === 'sprint'
                            ? 'bg-[#D32F2F] text-white shadow-lg transform scale-105 ring-1 ring-red-900/10'
                            : 'text-gray-400 hover:text-red-900 hover:bg-red-50'
                            }`}
                    >
                        Execution Sprint
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="max-w-7xl mx-auto px-8 pt-8 pb-20">

                {/* VIEW: CONTEXT (STRATEGY SNAPSHOT) */}
                {viewMode === 'context' && (
                    <div className="bg-gray-900 text-white rounded-[2rem] p-10 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>

                        <div className="relative z-10">
                            {/* Top Row */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-white/10 pb-8 gap-6">
                                <div>
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                                        <Target size={14} className="text-red-500" /> Strategic Direction
                                    </label>
                                    <div className="flex items-center gap-4 text-4xl font-black tracking-tight text-white">
                                        {profile.ventureType === 'Domestic' ?
                                            <Building2 size={40} className="text-orange-400" /> :
                                            <Globe size={40} className="text-indigo-400" />
                                        }
                                        {profile.ventureType} Expansion
                                    </div>
                                </div>
                                <div className="text-left md:text-right bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">4-Year Revenue Target</label>
                                    <div className="text-4xl font-black text-emerald-400 tracking-tighter">
                                        {profile.growthTarget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 }).format(profile.growthTarget) : '-'}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-10">
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-4">Core Strategy Statement</label>
                                <p className="text-xl text-gray-200 leading-relaxed font-light border-l-4 border-red-500 pl-8 italic">
                                    "{profile.strategyDescription || 'No summary provided.'}"
                                </p>
                            </div>

                            {/* 4Ps Grid */}
                            <div>
                                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-5">Execution Framework (4Ps)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] duration-300 group">
                                        <div className="text-[10px] text-indigo-300 font-bold uppercase mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Product
                                        </div>
                                        <div className="text-base font-medium text-gray-100 leading-snug group-hover:text-white">{profile.strategyDimensions?.product || '-'}</div>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] duration-300 group">
                                        <div className="text-[10px] text-indigo-300 font-bold uppercase mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Proposition
                                        </div>
                                        <div className="text-base font-medium text-gray-100 leading-snug group-hover:text-white">{profile.strategyDimensions?.proposition || '-'}</div>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] duration-300 group">
                                        <div className="text-[10px] text-indigo-300 font-bold uppercase mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Channel (Place)
                                        </div>
                                        <div className="text-base font-medium text-gray-100 leading-snug group-hover:text-white">{profile.strategyDimensions?.place || '-'}</div>
                                    </div>
                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] duration-300 group">
                                        <div className="text-[10px] text-indigo-300 font-bold uppercase mb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Promotion
                                        </div>
                                        <div className="text-base font-medium text-gray-100 leading-snug group-hover:text-white">{profile.strategyDimensions?.promotion || '-'}</div>
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
