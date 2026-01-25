import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import netlifyIdentity from 'netlify-identity-widget';
import {
    Building2, Plus, Calendar, TrendingUp, ExternalLink,
    Users, LogOut, Loader2, Search, Filter, Globe, Target,
    ChevronRight, Briefcase, AlertCircle
} from 'lucide-react';

// Supabase Setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ConsultantDashboard() {
    const [user, setUser] = useState(null);
    const [consultant, setConsultant] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, PLANNING

    // Auth & Data Loading
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
            loadConsultantData(currentUser.id);
        } else {
            setLoading(false);
            // Redirect to login
            window.location.href = '/index.html';
        }

        netlifyIdentity.on('logout', () => {
            setUser(null);
            window.location.href = '/index.html';
        });

        return () => {
            netlifyIdentity.off('logout');
        };
    }, []);

    const loadConsultantData = async (userId) => {
        try {
            // 1. Get consultant profile
            const { data: consultantData, error: consultantError } = await supabase
                .from('consultants')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (consultantError) {
                console.error('Not a consultant:', consultantError);
                alert('Access Denied: This account is not registered as a consultant.');
                window.location.href = '/index.html';
                return;
            }

            setConsultant(consultantData);

            // 2. Get assigned companies
            const { data: companiesData, error: companiesError } = await supabase
                .from('consultant_companies_view')
                .select('*')
                .eq('consultant_id', consultantData.id)
                .order('last_updated', { ascending: false });

            if (companiesError) {
                console.error('Error loading companies:', companiesError);
            } else {
                setCompanies(companiesData || []);
            }

        } catch (err) {
            console.error('Load error:', err);
        }
        setLoading(false);
    };

    const handleLogout = () => {
        netlifyIdentity.logout();
    };

    const handleAddNewCompany = () => {
        // Store consultant context in session
        sessionStorage.setItem('consultant_mode', 'true');
        sessionStorage.setItem('consultant_id', consultant.id);
        sessionStorage.setItem('consultant_user_id', user.uid);

        // Redirect to profile wizard
        window.location.href = '/profile.html';
    };

    const handleViewCompany = (companyUserId) => {
        // Store context for viewing as consultant
        sessionStorage.setItem('consultant_mode', 'true');
        sessionStorage.setItem('viewing_company_id', companyUserId);

        // Redirect to dashboard
        window.location.href = '/dashboard.html';
    };

    // Filter companies
    const filteredCompanies = companies.filter(company => {
        const matchesSearch = company.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            company.industry?.toLowerCase().includes(searchTerm.toLowerCase());

        // Add status filtering logic here if needed
        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <img
                                src="https://wadhwanifoundation.org/wp-content/uploads/2023/10/Wadhwani-Foundation-Logo.png"
                                alt="Wadhwani Foundation"
                                className="h-10 w-auto object-contain"
                            />
                            <div className="h-8 w-px bg-gray-300"></div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Consultant Portal</h1>
                                <p className="text-xs text-gray-500">Managing {companies.length} Companies</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <div className="text-sm font-bold text-gray-900">{consultant?.consultant_name}</div>
                                <div className="text-xs text-gray-500">{consultant?.email}</div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                title="Log Out"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold mb-2">Welcome back, {consultant?.consultant_name?.split(' ')[0]}!</h2>
                            <p className="text-red-100">Manage your client portfolio and track their growth journey</p>
                        </div>
                        <button
                            onClick={handleAddNewCompany}
                            className="bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center gap-2 shadow-lg"
                        >
                            <Plus size={20} />
                            Add New Company
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{companies.length}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Companies</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="text-green-600" size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {companies.filter(c => c.venture_type === 'International').length}
                                </div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider">International Ventures</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Target className="text-purple-600" size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">
                                    {companies.filter(c => c.venture_type === 'Domestic').length}
                                </div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider">Domestic Ventures</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="bg-white rounded-xl p-4 mb-6 border border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search companies by name or industry..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Companies Grid */}
                {filteredCompanies.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                        <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Companies Found</h3>
                        <p className="text-gray-500 mb-6">
                            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first company'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={handleAddNewCompany}
                                className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all inline-flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Add New Company
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCompanies.map((company) => (
                            <CompanyCard
                                key={company.user_id}
                                company={company}
                                onClick={() => handleViewCompany(company.user_id)}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

// Company Card Component
const CompanyCard = ({ company, onClick }) => {
    const isInternational = company.venture_type === 'International';

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-red-300 transition-all cursor-pointer group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isInternational ? 'bg-indigo-100' : 'bg-orange-100'}`}>
                        {isInternational ? (
                            <Globe className="text-indigo-600" size={20} />
                        ) : (
                            <Building2 className="text-orange-600" size={20} />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                            {company.company_name}
                        </h3>
                        <p className="text-xs text-gray-500">{company.industry}</p>
                    </div>
                </div>
                <ExternalLink className="text-gray-300 group-hover:text-red-600 transition-colors" size={18} />
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Venture Type</span>
                    <span className={`font-semibold ${isInternational ? 'text-indigo-600' : 'text-orange-600'}`}>
                        {company.venture_type}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="font-semibold text-gray-900">
                        {new Date(company.last_updated).toLocaleDateString()}
                    </span>
                </div>
            </div>

            {company.strategy && (
                <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-600 line-clamp-2 italic">
                        "{company.strategy}"
                    </p>
                </div>
            )}

            <div className="mt-4 flex items-center text-red-600 text-sm font-semibold group-hover:underline">
                View Dashboard
                <ChevronRight size={16} className="ml-1" />
            </div>
        </div>
    );
};
