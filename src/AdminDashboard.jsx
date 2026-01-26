import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import netlifyIdentity from 'netlify-identity-widget';
import {
    LayoutDashboard, Building2, Users, Briefcase, Settings, LogOut,
    Plus, Trash2, Edit2, Search, ArrowRight, TrendingUp, AlertCircle, CheckCircle,
    UserPlus, Shield, ExternalLink
} from 'lucide-react';

// Config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('overview'); // overview, companies, consultants
    const [loading, setLoading] = useState(true);

    // Data States
    const [profiles, setProfiles] = useState([]);
    const [consultants, setConsultants] = useState([]);
    const [stats, setStats] = useState({ revenue: 0, companies: 0, consultants: 0, hubs: 0 });

    // Modals
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');

    useEffect(() => {
        netlifyIdentity.init();
        const u = netlifyIdentity.currentUser();

        // Simple auth check (In production, verify against super_admins table)
        if (u) {
            setUser(u);
            fetchData();
        } else {
            netlifyIdentity.open();
            netlifyIdentity.on('login', (u) => {
                setUser(u);
                fetchData();
                netlifyIdentity.close();
            });
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // 1. Fetch Companies
        const { data: profs } = await supabase.from('profiles').select('*');
        setProfiles(profs || []);

        // 2. Fetch Consultants
        const { data: cons } = await supabase.from('consultants').select('*');
        setConsultants(cons || []);

        // 3. Calc Stats
        const totalRev = (profs || []).reduce((acc, p) => acc + (parseFloat(p.details?.revenue) || 0), 0);
        const hubs = new Set((profs || []).map(p => p.details?.hub)).size;

        setStats({
            revenue: totalRev,
            companies: (profs || []).length,
            consultants: (cons || []).length,
            hubs: hubs
        });

        setLoading(false);
    };

    const handleDeleteCompany = async (id) => {
        if (!confirm("Are you sure you want to DELETE this company? This cannot be undone.")) return;

        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) alert("Error: " + error.message);
        else fetchData();
    };

    const handleAddConsultant = async () => {
        if (!inviteEmail) return;
        const { error } = await supabase.from('consultants').insert([{
            email: inviteEmail,
            name: inviteName || 'New Consultant'
        }]);

        if (error) alert("Error adding consultant: " + error.message);
        else {
            alert("Consultant added! They can now log in.");
            setIsInviteModalOpen(false);
            setInviteEmail('');
            setInviteName('');
            fetchData();
        }
    };

    const handleAssignConsultant = async (consultantEmail, companyId) => {
        // Simple prompt for now
        // In a real app, use a proper modal
        const clientProfileId = companyId || prompt("Enter Client Profile ID to assign:");
        if (!clientProfileId) return;

        const { error } = await supabase.from('consultant_clients').insert({
            consultant_email: consultantEmail,
            client_profile_id: clientProfileId
        });

        if (error) alert("Error assigning: " + error.message);
        else alert("Assigned successfully.");
    };

    if (!user) return <div className="h-screen flex items-center justify-center">Loading Admin...</div>;

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setView(id)}
            className={`flex items-center gap-3 px-6 py-4 w-full text-left transition-colors border-l-4 ${view === id ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
        >
            <Icon size={20} />
            {label}
        </button>
    );

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xl tracking-tight">
                        <Shield size={24} /> Super Admin
                    </div>
                </div>

                <nav className="flex-1 py-6">
                    <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
                    <TabButton id="companies" label="Companies" icon={Building2} />
                    <TabButton id="consultants" label="Consultants" icon={Users} />
                    <TabButton id="sprints" label="Sprints & Progress" icon={TrendingUp} />
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button onClick={() => netlifyIdentity.logout()} className="flex items-center gap-2 text-gray-500 hover:text-red-600 px-4 py-2 w-full">
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
                    <h1 className="text-2xl font-bold text-gray-800 capitalize">{view}</h1>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm font-bold text-gray-900">{user.email}</div>
                            <div className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block font-bold uppercase tracking-wider">Super Admin</div>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {/* VIEW: OVERVIEW */}
                    {view === 'overview' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatsCard title="Total Companies" value={stats.companies} icon={Building2} color="blue" />
                                <StatsCard title="Active Consultants" value={stats.consultants} icon={Users} color="purple" />
                                <StatsCard title="Total Revenue (Est)" value={`₹${stats.revenue}Cr`} icon={Briefcase} color="green" />
                                <StatsCard title="Active Hubs" value={stats.hubs} icon={ExternalLink} color="orange" />
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                                <h3 className="font-bold text-gray-800 mb-6">Recent Activity</h3>
                                <div className="text-gray-400 italic text-sm">No recent activity logs found.</div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: COMPANIES */}
                    {view === 'companies' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input placeholder="Search companies..." className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 w-80 outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <button className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
                                    <Plus size={18} /> Add Company
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-400 font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Company Name</th>
                                            <th className="px-6 py-4">Industry</th>
                                            <th className="px-6 py-4">Revenue</th>
                                            <th className="px-6 py-4">Location</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {profiles.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-900">{p.details?.companyName || 'Untitled'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{p.details?.industry || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900 font-mono">₹{p.details?.revenue || '0'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{p.details?.location || '-'}</td>
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    <button onClick={() => window.open(`/dashboard.html?view_client_id=${p.user_id}`, '_blank')} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="View Dashboard">
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg" title="Edit">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteCompany(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* VIEW: CONSULTANTS */}
                    {view === 'consultants' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 text-lg">Advisor Network</h3>
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:bg-purple-700 transition-all flex items-center gap-2"
                                >
                                    <UserPlus size={18} /> Invite Consultant
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-400 font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Email</th>
                                            <th className="px-6 py-4">Focus Areas</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {consultants.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-900">{c.name || 'Unknown'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{c.email}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    <span className="truncate max-w-[150px] block">{c.industry_focus || '-'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Active</span>
                                                </td>
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleAssignConsultant(c.email)}
                                                        className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                                                    >
                                                        Assign to Client
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Invite New Consultant</h3>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                                <input
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    value={inviteName}
                                    onChange={e => setInviteName(e.target.value)}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                                <input
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsInviteModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                            <button onClick={handleAddConsultant} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">Send Invitation</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const StatsCard = ({ title, value, icon: Icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        green: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600'
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-4 rounded-xl ${colors[color]}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">{title}</p>
                <div className="text-2xl font-black text-gray-900">{value}</div>
            </div>
        </div>
    );
};
