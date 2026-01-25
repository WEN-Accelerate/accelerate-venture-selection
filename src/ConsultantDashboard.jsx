import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    Users, Plus, Search, Building2, TrendingUp,
    Calendar, CheckCircle, ArrowRight, Loader2, LogOut
} from 'lucide-react';
import netlifyIdentity from 'netlify-identity-widget';

// Config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ConsultantDashboard({ user, onLogout }) {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAssignedCompanies();
    }, [user]);

    const fetchAssignedCompanies = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('consultant_id', user.uid)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setCompanies(data || []);
        } catch (err) {
            console.error("Error fetching companies:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCompany = () => {
        // Set flag for Wizard to know this is a Consultant Action
        sessionStorage.setItem('accelerate_consultant_mode', 'true');
        sessionStorage.setItem('accelerate_consultant_id', user.uid);
        window.location.href = '/profile.html'; // Redirect to Profile Wizard
    };

    const handleViewCompany = (companyId) => {
        // Redirect to Dashboard with the target company context
        window.location.href = `/dashboard.html?companyId=${companyId}`;
    };

    const filteredCompanies = companies.filter(c =>
        c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.industry?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-indigo-600 w-12 h-12" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 border-b border-gray-200 shadow-sm px-8 py-5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                        <Users className="text-indigo-600 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Consultant Dashboard</h1>
                        <p className="text-xs text-gray-500 font-medium">Managing {companies.length} Companies</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-gray-900">{user.displayName}</div>
                        <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Senior Advisor</div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        title="Log Out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-10">

                {/* Actions Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search companies, industries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium shadow-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={handleAddCompany}
                        className="flex items-center gap-2 bg-[#1e293b] hover:bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-gray-200 transition-all transform hover:scale-[1.02]"
                    >
                        <Plus size={18} />
                        Add New Company
                    </button>
                </div>

                {/* Grid */}
                {filteredCompanies.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {searchTerm ? 'No matches found' : 'No companies assigned'}
                        </h3>
                        <p className="text-gray-500 text-sm mb-6">
                            {searchTerm ? 'Try a different search term.' : 'Start by onboarding your first client.'}
                        </p>
                        {!searchTerm && (
                            <button onClick={handleAddCompany} className="text-indigo-600 font-bold hover:underline">
                                Onboard Client Now
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCompanies.map(company => (
                            <div key={company.id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden">
                                {company.logoUrl && (
                                    <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-100 transition-opacity">
                                        <img src={company.logoUrl} className="w-10 h-10 object-contain" />
                                    </div>
                                )}

                                <div className="mb-6">
                                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
                                        {company.venture_stage || 'Exploration'} Stage
                                    </span>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1 truncate pr-8">{company.company_name}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{company.industry || 'Unknown Industry'}</p>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                                            <span>Strategy Progress</span>
                                            <span>{company.strategy_progress || 0}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                                style={{ width: `${company.strategy_progress || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Calendar size={14} />
                                        <span>Updated: {new Date(company.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {company.employees || '-'} Employees
                                    </span>
                                    <button
                                        onClick={() => handleViewCompany(company.id)}
                                        className="p-2 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full transition-colors"
                                    >
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </main>
        </div>
    );
}
