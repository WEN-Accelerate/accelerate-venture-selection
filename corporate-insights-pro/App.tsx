
import React, { useState, useCallback } from 'react';
import { researchCompany } from './services/geminiService';
import { SearchState, CompanyData } from './types';
import StatCard from './components/StatCard';
import SourceList from './components/SourceList';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);
  const [state, setState] = useState<SearchState>({
    loading: false,
    error: null,
    data: null,
  });

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setState({ loading: true, error: null, data: null });
    try {
      const data = await researchCompany(query);
      setState({ loading: false, error: null, data });
    } catch (err) {
      console.error(err);
      setState({
        loading: false,
        error: 'Failed to retrieve company data. Please try a different name.',
        data: null,
      });
    }
  }, [query]);

  const copyToProfile = () => {
    if (!state.data) return;
    
    const text = `
Company Name: ${state.data.name}
Industry: ${state.data.industry}
Description: ${state.data.description}
Promoters: ${state.data.promoters.join(', ')}
GST Number: ${state.data.gstNumber || 'Not Found'}
Key Products: ${state.data.products.join(', ')}
Primary Customers: ${state.data.customers.join(', ')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    });
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Mobile-Friendly Header */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 py-3 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <i className="fa-solid fa-building-columns text-white text-sm"></i>
            </div>
            <span className="text-lg font-bold text-slate-800">InsightsPro</span>
          </div>
          {state.data && (
            <button 
              onClick={copyToProfile}
              className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-transform"
            >
              <i className="fa-solid fa-copy mr-1"></i> Copy to Profile
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-6">
        {/* Simplified Search for App Use */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Company Search</h1>
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter company name..."
              className="w-full px-4 py-4 rounded-xl bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-24"
            />
            <button
              type="submit"
              disabled={state.loading}
              className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 text-white font-bold rounded-lg text-sm"
            >
              {state.loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Search'}
            </button>
          </form>
          {state.error && <p className="mt-2 text-red-500 text-xs font-medium">{state.error}</p>}
        </div>

        {/* Loading State */}
        {state.loading && (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
            <p className="text-slate-500 font-medium">Researching business details...</p>
          </div>
        )}

        {/* Results */}
        {state.data && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Identity Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Profile Found</span>
                <span className="text-xs font-medium text-slate-400">GST: {state.data.gstNumber || 'N/A'}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">{state.data.name}</h2>
              <p className="text-slate-600 text-sm leading-relaxed">{state.data.description}</p>
            </div>

            {/* Grid of Key Info */}
            <div className="grid grid-cols-1 gap-4">
              <StatCard 
                label="Promoters" 
                value={state.data.promoters} 
                icon="fa-user-tie" 
                color="bg-blue-600"
              />
              <StatCard 
                label="Products" 
                value={state.data.products} 
                icon="fa-box" 
                color="bg-purple-600"
              />
              <StatCard 
                label="Customers" 
                value={state.data.customers} 
                icon="fa-users" 
                color="bg-emerald-600"
              />
            </div>

            <SourceList sources={state.data.sources} />
          </div>
        )}

        {/* Empty State */}
        {!state.data && !state.loading && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <i className="fa-solid fa-magnifying-glass text-slate-200 text-5xl mb-4"></i>
            <p className="text-slate-400 text-sm">Find a company to auto-fill your profile.</p>
          </div>
        )}
      </main>

      {/* Copy Notification Toast */}
      {copyStatus && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 z-[100] animate-in fade-in zoom-in duration-300">
          <i className="fa-solid fa-check-circle text-emerald-400"></i>
          <span className="font-bold text-sm">Details copied to clipboard!</span>
        </div>
      )}
    </div>
  );
};

export default App;
