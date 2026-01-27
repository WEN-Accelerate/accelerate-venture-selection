import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import netlifyIdentity from 'netlify-identity-widget';
import {
    LayoutDashboard, Building2, Users, Briefcase, Settings, LogOut,
    Plus, Trash2, Edit2, Search, ArrowRight, TrendingUp, AlertCircle, CheckCircle,
    UserPlus, Shield, ExternalLink, Mail, Filter
} from 'lucide-react';

// Config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminDashboard() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('overview'); // overview, companies, consultants, sprints
    const [loading, setLoading] = useState(true);

    // Data States
    const [profiles, setProfiles] = useState([]);
    const [consultants, setConsultants] = useState([]);
    const [quarterlyProgress, setQuarterlyProgress] = useState([]);
    const [stats, setStats] = useState({ revenue: 0, companies: 0, consultants: 0, hubs: 0 });

    // Modals
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [companyForm, setCompanyForm] = useState({});

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedConsultant, setSelectedConsultant] = useState(null);
    const [assignCompanyId, setAssignCompanyId] = useState('');
    const [assignments, setAssignments] = useState([]);

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

        // 3. Fetch Quarterly Progress (For Sprints View)
        const { data: prog } = await supabase.from('quarterly_progress').select('*');
        setQuarterlyProgress(prog || []);

        // 4. Fetch Assignments
        const { data: assigns } = await supabase.from('consultant_clients').select('*');
        setAssignments(assigns || []);

        // 5. Calc Stats
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

    const handleSignOut = () => {
        netlifyIdentity.logout();
        setUser(null);
        window.location.href = '/index.html';
    };

    // --- COMPANY ACTIONS ---

    const handleEditCompany = (company) => {
        setEditingCompany(company);
        setCompanyForm(company.details || {});
        setIsCompanyModalOpen(true);
    };

    const handleAddCompany = () => {
        setEditingCompany(null);
        setCompanyForm({});
        setIsCompanyModalOpen(true);
    };

    const handleSaveCompany = async () => {
        try {
            if (editingCompany) {
                // Update
                const { error } = await supabase
                    .from('profiles')
                    .update({ details: { ...editingCompany.details, ...companyForm } })
                    .eq('id', editingCompany.id);
                if (error) throw error;
            } else {
                // Create New (Requires a user_id placeholder usually, but we can try inserting just header data if table allows nullable user_id or we generate a dummy one)
                // For this demo, let's assume we create a profile with a random UUID for user_id to unlink it from auth for now until claimed?
                // Or better: Create a new profile row.
                const dummyId = crypto.randomUUID();
                const { error } = await supabase.from('profiles').insert([{
                    user_id: dummyId,
                    details: companyForm,
                    email: companyForm.email || `temp_${Date.now()}@example.com`
                }]);
                if (error) throw error;
            }
            setIsCompanyModalOpen(false);
            fetchData();
        } catch (e) {
            alert("Error saving company: " + e.message);
        }
    };

    const handleDeleteCompany = async (id) => {
        if (!confirm("Are you sure you want to DELETE this company? This cannot be undone.")) return;

        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) alert("Error: " + error.message);
        else fetchData();
    };

    // --- CONSULTANT ACTIONS ---

    const handleAddConsultant = async () => {
        if (!inviteEmail) return;

        // 1. Add to Database
        const { error } = await supabase.from('consultants').insert([{
            email: inviteEmail,
            name: inviteName || 'New Consultant'
        }]);

        if (error) {
            alert("Error adding consultant: " + error.message);
            return;
        }

        // 2. Simulate Sending Email (In production, assume Netlify Functions or Supabase Edge Functions)
        // For real email, we'd use: await fetch('/.netlify/functions/send-invite', ...)
        const body = `Subject: Invitation to Wadhwani Accelerate Advisor Portal\n\nHi ${inviteName},\n\nYou have been invited to join the Wadhwani Accelerate platform as an Advisor.\n\nPlease log in here: ${window.location.origin}/consultant.html`;
        window.open(`mailto:${inviteEmail}?subject=Advisor Invitation&body=${encodeURIComponent(body)}`);

        alert("Consultant whitelisted! Email draft opened.");
        setIsInviteModalOpen(false);
        setInviteEmail('');
        setInviteName('');
        fetchData();
    };

    const handleOpenAssignModal = (consultant) => {
        setSelectedConsultant(consultant);
        setAssignCompanyId('');
        setIsAssignModalOpen(true);
    };

    const handleAssignConsultant = async () => {
        if (!selectedConsultant || !assignCompanyId) return;

        try {
            const { error } = await supabase.from('consultant_clients').insert({
                consultant_email: selectedConsultant.email,
                client_profile_id: assignCompanyId
            });

            if (error) throw error;

            alert("Company assigned successfully!");
            setIsAssignModalOpen(false);
            fetchData();
        } catch (e) {
            alert("Error assigning company: " + e.message);
        }
    };

    // --- RENDERERS ---

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
                    <button onClick={handleSignOut} className="flex items-center gap-2 text-gray-500 hover:text-red-600 px-4 py-2 w-full">
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
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatsCard title="Total Companies" value={stats.companies} icon={Building2} color="blue" />
                                <StatsCard title="Active Consultants" value={stats.consultants} icon={Users} color="purple" />
                                <StatsCard title="Total Revenue (Est)" value={`₹${stats.revenue}Cr`} icon={Briefcase} color="green" />
                                <StatsCard title="Active Hubs" value={stats.hubs} icon={ExternalLink} color="orange" />
                            </div>
                        </div>
                    )}

                    {/* VIEW: COMPANIES */}
                    {view === 'companies' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="flex justify-between items-center">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input placeholder="Search companies..." className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 w-80 outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <button onClick={handleAddCompany} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
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
                                                <td className="px-6 py-4 font-bold text-gray-900 group relative">
                                                    {p.details?.companyName || 'Untitled'}
                                                    <div className="text-[10px] text-gray-300 font-mono hidden group-hover:block absolute top-1 left-6">{p.id}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{p.details?.industry || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900 font-mono">₹{p.details?.revenue || '0'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{p.details?.location || '-'}</td>
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    <button onClick={() => window.open(`/dashboard.html?view_client_id=${p.user_id}`, '_blank')} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="View Dashboard">
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button onClick={() => handleEditCompany(p)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg" title="Edit">
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
                        <div className="space-y-6 animate-in fade-in duration-500">
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
                                            <th className="px-6 py-4">Assigned Companies</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {consultants.map(c => {
                                            const count = assignments.filter(a => a.consultant_email === c.email).length;
                                            return (
                                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{c.name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{c.email}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        <span className="truncate max-w-[150px] block">{c.industry_focus || '-'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">
                                                            {count} Companies
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Active</span>
                                                    </td>
                                                    <td className="px-6 py-4 flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenAssignModal(c)}
                                                            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                                                        >
                                                            Assign Client
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* VIEW: SPRINTS & PROGRESS */}
                    {view === 'sprints' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">Portfolio Progress Tracking</h3>
                                    <p className="text-gray-500 text-sm">Monitor strategy execution across all companies.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
                                        <Filter size={16} /> Filter by Q1 2025
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-400 font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Company</th>
                                            <th className="px-6 py-4">Quarter</th>
                                            <th className="px-6 py-4">Strategy Status</th>
                                            <th className="px-6 py-4">Revenue (Act)</th>
                                            <th className="px-6 py-4">Jobs (Act)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {/* Join Profile Data with Quarterly Progress */}
                                        {profiles.map(p => {
                                            // Find Q1 stats for this company
                                            const q1 = quarterlyProgress.find(q => q.company_profile_id === p.id && q.quarter_label.includes('Q1')) || {};
                                            const status = q1.strategy_status || 'Pending';

                                            // Only show if filtered? Showing all for now
                                            return (
                                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900">{p.details?.companyName || 'Untitled'}</div>
                                                        <div className="text-xs text-gray-500">{p.details?.industry}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">Q1 2025</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 w-fit ${status === 'Green' ? 'bg-emerald-100 text-emerald-700' :
                                                            status === 'Amber' ? 'bg-orange-100 text-orange-700' :
                                                                status === 'Red' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
                                                            }`}>
                                                            {status === 'Green' ? <CheckCircle size={10} /> : status === 'Red' ? <AlertCircle size={10} /> : null}
                                                            {status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-mono font-semibold">
                                                        {q1.revenue_actual ? `₹${q1.revenue_actual} Cr` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-mono font-semibold">
                                                        {q1.jobs_actual ? `+${q1.jobs_actual}` : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
                                <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                                <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="john@example.com" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsInviteModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                            <button onClick={handleAddConsultant} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2">
                                <Mail size={16} /> Send Invitation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Company Modal */}
            {isCompanyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">{editingCompany ? 'Edit Company Profile' : 'Add New Company'}</h3>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company Name</label>
                                <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold" value={companyForm.companyName || ''} onChange={e => setCompanyForm({ ...companyForm, companyName: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Industry</label>
                                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={companyForm.industry || ''} onChange={e => setCompanyForm({ ...companyForm, industry: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Revenue (₹ Cr)</label>
                                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={companyForm.revenue || ''} onChange={e => setCompanyForm({ ...companyForm, revenue: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Location</label>
                                <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={companyForm.location || ''} onChange={e => setCompanyForm({ ...companyForm, location: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Hub</label>
                                <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={companyForm.hub || ''} onChange={e => setCompanyForm({ ...companyForm, hub: e.target.value })}>
                                    <option value="">Select Hub...</option>
                                    <option value="Bangalore">Bangalore</option>
                                    <option value="Delhi">Delhi</option>
                                    <option value="Mumbai">Mumbai</option>
                                </select>
                            </div>
                            {!editingCompany && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Admin Email (Login ID)</label>
                                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" value={companyForm.email || ''} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} placeholder="admin@company.com" />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsCompanyModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                            <button onClick={handleSaveCompany} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">Save Profile</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {isAssignModalOpen && selectedConsultant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Assign Company</h3>
                        <p className="text-sm text-gray-500 mb-6">Assign a client to <strong>{selectedConsultant.name}</strong> ({selectedConsultant.email})</p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Company</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={assignCompanyId}
                                    onChange={e => setAssignCompanyId(e.target.value)}
                                >
                                    <option value="">Choose a company...</option>
                                    {profiles.map(p => {
                                        // Check if already assigned to this consultant
                                        const isAssigned = assignments.some(a =>
                                            a.consultant_email === selectedConsultant.email &&
                                            a.client_profile_id === p.user_id
                                        );
                                        return (
                                            <option key={p.id} value={p.user_id} disabled={isAssigned}>
                                                {p.details?.companyName || 'Untitled'} {isAssigned ? '(Already Assigned)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsAssignModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                            <button
                                onClick={handleAssignConsultant}
                                disabled={!assignCompanyId}
                                className={`px-6 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg ${!assignCompanyId ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                            >
                                <CheckCircle size={16} /> Assign
                            </button>
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
