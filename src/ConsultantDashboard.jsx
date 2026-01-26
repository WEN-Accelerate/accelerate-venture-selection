import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    Users, Plus, Building2, TrendingUp, Calendar, ChevronRight, LayoutGrid, LogOut
} from 'lucide-react';
import netlifyIdentity from 'netlify-identity-widget';

// --- CONFIG ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ConsultantDashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [consultantProfile, setConsultantProfile] = useState(null);
    const [filterHub, setFilterHub] = useState('All');

    // --- AUTH ---
    useEffect(() => {
        netlifyIdentity.init();
        const currentUser = netlifyIdentity.currentUser();

        if (currentUser) {
            verifyConsultant(currentUser);
        } else {
            // If no user, show login or redirect
            netlifyIdentity.on('login', (u) => {
                verifyConsultant(u);
            });
            netlifyIdentity.open(); // Force login
            setLoading(false);
        }

        netlifyIdentity.on('logout', () => {
            window.location.href = '/index.html';
        });

    }, []);

    const verifyConsultant = async (u) => {
        // 1. Check if email exists in 'consultants' table
        const { data, error } = await supabase
            .from('consultants')
            .select('*')
            .eq('email', u.email)
            .maybeSingle();

        if (data) {
            setUser(u);
            setConsultantProfile(data);
            fetchClients(u.email);
            setLoading(false);
        } else {
            alert("Access Denied: You are not registered as a consultant.");
            await netlifyIdentity.logout();
            window.location.href = '/index.html';
        }
    };

    const fetchClients = async (email) => {
        // 1. Get List of Client IDs assigned to this consultant
        const { data: assignments, error: assignError } = await supabase
            .from('consultant_clients')
            .select('client_profile_id')
            .eq('consultant_email', email);

        if (assignError) {
            console.error("Error fetching assignments:", assignError);
            return;
        }

        if (assignments && assignments.length > 0) {
            const clientIds = assignments.map(a => a.client_profile_id);

            // 2. Fetch Profile Details for these IDs
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .in('user_id', clientIds);

            if (profiles) {
                setClients(profiles);
            }
        } else {
            setClients([]);
        }
    };

    const handleAddCompany = () => {
        // Redirect to Profile Wizard with 'consultant' mode
        // We'll use a URL parameter to signal this state
        window.location.href = '/profile.html?mode=consultant_add';
    };

    const handleLogout = () => {
        netlifyIdentity.logout();
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900">
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img
                            src="https://wadhwanifoundation.org/wp-content/uploads/2023/10/Wadhwani-Foundation-Logo.png"
                            alt="Logo"
                            className="h-8"
                        />
                        <div className="h-6 w-px bg-gray-300"></div>
                        <span className="font-bold text-gray-700 tracking-tight uppercase text-sm">Advisor Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-gray-900">{consultantProfile?.name || user?.email}</div>
                            <div className="text-xs text-green-600 font-bold uppercase tracking-wider">Verified Consultant</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-full hover:bg-red-50 transition-all"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="max-w-7xl mx-auto px-6 py-10">

                {/* TOOLBAR */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 mb-2">Portfolio Management</h1>
                        <p className="text-gray-500 italic">Active Advisory: <span className="font-bold text-gray-900 not-italic">{clients.length} Companies</span></p>
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={filterHub}
                            onChange={(e) => setFilterHub(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold outline-none focus:border-red-500"
                        >
                            <option value="All">All Hubs</option>
                            <option value="Ahmedabad">Ahmedabad</option>
                            <option value="Pune">Pune</option>
                            <option value="Chennai">Chennai</option>
                            <option value="Bengaluru">Bengaluru</option>
                            <option value="Lucknow">Lucknow</option>
                        </select>
                        <button
                            onClick={handleAddCompany}
                            className="flex items-center gap-2 bg-[#D32F2F] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-800 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                        >
                            <PlusCircle size={20} /> Add New Company
                        </button>
                    </div>
                </div>

                {/* GRID */}
                {clients.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <LayoutGrid size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No active company profiles</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">You haven't onboarded any clients yet. Initialize your first client profile to start strategic modeling.</p>
                        <button
                            onClick={handleAddCompany}
                            className="text-[#D32F2F] font-bold hover:underline"
                        >
                            + Onboard First Client
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clients
                            .filter(client => filterHub === 'All' || (client.details?.hub === filterHub))
                            .map(client => (
                                <ClientCard key={client.id} client={client} />
                            ))}
                    </div>
                )}

            </main>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function ClientCard({ client }) {
    // Determine progress (mock logic or based on filled fields)
    const data = client.details || {};
    const industry = client.details?.industry || 'Unknown Sector';
    const stage = client.details?.ventureType || 'Undecided';
    const updatedAt = new Date(client.updated_at).toLocaleDateString();

    // Calculate a rough progress %
    const fields = ['companyName', 'industry', 'revenue', 'employees', 'strategyDescription'];
    const filled = fields.filter(f => data[f]).length;
    const progress = Math.round((filled / fields.length) * 100);

    return (
        <div
            onClick={() => window.location.href = `/dashboard.html?view_client_id=${client.user_id}`}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-6">
                {data.logo ? (
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 p-1 flex items-center justify-center overflow-hidden">
                        <img src={data.logo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-xl">
                        {data.companyName?.charAt(0) || 'C'}
                    </div>
                )}
                <div className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {stage === 'Domestic' ? 'Scaling' : 'Researching'}
                </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1" title={data.companyName}>
                {data.companyName || 'Untitled Company'}
            </h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">
                {industry}
            </p>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-1">
                        <span>Strategy Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#D32F2F] rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>

                <div className="flex justify-between items-end pt-2">
                    <span className="text-[10px] font-semibold text-gray-300">Updated {updatedAt}</span>
                    <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#D32F2F] group-hover:text-white transition-colors">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Icon helper
function PlusCircle(props) {
    return <Plus {...props} />
}
