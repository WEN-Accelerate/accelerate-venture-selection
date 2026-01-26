import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart3, Save, CheckCircle, AlertTriangle, XCircle, TrendingUp, Users, DollarSign, Flag, Plus, X } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function QuarterlyProgress({ profileId, isConsultant }) {
    const [progressData, setProgressData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        quarter_label: '',
        revenue_actual: '',
        jobs_actual: '',
        strategy_status: 'Green',
        sprint_milestones_text: '',
        commitment_signals: ''
    });

    useEffect(() => {
        fetchProgress();
    }, [profileId]);

    const fetchProgress = async () => {
        const { data, error } = await supabase
            .from('quarterly_progress')
            .select('*')
            .eq('company_profile_id', profileId)
            .order('quarter_label', { ascending: true }); // Sort by label? Or we need proper date sort

        if (data) {
            setProgressData(data);
        }
        setLoading(false);
    };

    const handleSaveNew = async () => {
        if (!formData.quarter_label) {
            alert("Please enter a Quarter Label (e.g. Q1 2026)");
            return;
        }

        const payload = {
            ...formData,
            revenue_actual: parseFloat(formData.revenue_actual) || 0,
            jobs_actual: parseInt(formData.jobs_actual) || 0,
            company_profile_id: profileId,
            updated_at: new Date()
        };

        const { error } = await supabase
            .from('quarterly_progress')
            .upsert(payload, { onConflict: 'company_profile_id, quarter_label' });

        if (error) {
            alert("Error saving: " + error.message);
        } else {
            setShowForm(false);
            fetchProgress();
            // Reset form
            setFormData({
                quarter_label: '',
                revenue_actual: '',
                jobs_actual: '',
                strategy_status: 'Green',
                sprint_milestones_text: '',
                commitment_signals: ''
            });
        }
    };

    const handleEdit = (item) => {
        if (!isConsultant) return;
        setFormData(item);
        setShowForm(true);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading progress...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header / Add Button */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Quarterly Progress Tracker</h2>
                    <p className="text-gray-500 max-w-2xl">Monitor key execution metrics, milestone completion, and leadership commitment levels.</p>
                </div>
                {isConsultant && (
                    <button
                        onClick={() => {
                            setFormData({
                                quarter_label: '',
                                revenue_actual: '',
                                jobs_actual: '',
                                strategy_status: 'Green',
                                sprint_milestones_text: '',
                                commitment_signals: ''
                            });
                            setShowForm(true);
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                        <Plus size={18} /> Add Progress Update
                    </button>
                )}
            </div>

            {/* Empty State */}
            {progressData.length === 0 && !showForm && (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <BarChart3 className="mx-auto text-gray-300 w-16 h-16 mb-4" />
                    <h3 className="text-gray-500 font-bold">No progress updates yet</h3>
                    {isConsultant && <p className="text-gray-400 text-sm mt-2">Click "Add Progress Update" to begin tracking.</p>}
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {progressData.map((data) => (
                    <div
                        key={data.id || data.quarter_label}
                        onClick={() => handleEdit(data)}
                        className={`group cursor-pointer rounded-2xl border ${data.strategy_status === 'Red' ? 'border-red-200 bg-red-50' : data.strategy_status === 'Amber' ? 'border-orange-200 bg-orange-50' : 'border-emerald-200 bg-white'} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden relative`}
                    >
                        {/* Status Stripe */}
                        <div className={`h-2 w-full ${data.strategy_status === 'Red' ? 'bg-red-500' : data.strategy_status === 'Amber' ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>

                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-xl text-gray-900">{data.quarter_label}</h3>
                                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${data.strategy_status === 'Red' ? 'bg-red-100 text-red-700' :
                                    data.strategy_status === 'Amber' ? 'bg-orange-100 text-orange-700' :
                                        'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {data.strategy_status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Revenue</span>
                                    <div className="font-bold text-gray-900">₹ {data.revenue_actual} Cr</div>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Jobs</span>
                                    <div className="font-bold text-gray-900">{data.jobs_actual}</div>
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Milestones</span>
                                <p className="text-sm text-gray-600 line-clamp-2">{data.sprint_milestones_text || 'No updates.'}</p>
                            </div>

                            {isConsultant && <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                                <span className="text-xs font-bold">Edit</span>
                            </div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Slide-over Form Panel */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setShowForm(false)}></div>

                    <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">
                                {formData.quarter_label ? `Edit ${formData.quarter_label}` : 'New Progress Update'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Quarter Label</label>
                                <input
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Q1 2026"
                                    value={formData.quarter_label}
                                    onChange={e => setFormData({ ...formData, quarter_label: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Strategy Status</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[{ val: 'Green', label: 'Green (On Track)' }, { val: 'Amber', label: 'Amber (Late)' }, { val: 'Red', label: 'Red (Off Track)' }].map(status => (
                                        <button
                                            key={status.val}
                                            onClick={() => setFormData({ ...formData, strategy_status: status.val })}
                                            className={`py-2 rounded-lg font-bold text-xs border-2 transition-all ${formData.strategy_status === status.val
                                                ? (status.val === 'Green' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : status.val === 'Amber' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-red-500 bg-red-50 text-red-700')
                                                : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                }`}
                                        >
                                            {status.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Revenue (₹ Cr)</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0.0"
                                        value={formData.revenue_actual}
                                        onChange={e => setFormData({ ...formData, revenue_actual: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Jobs Created</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0"
                                        value={formData.jobs_actual}
                                        onChange={e => setFormData({ ...formData, jobs_actual: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Sprint Milestones</label>
                                <textarea
                                    rows={4}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="What was achieved this quarter?"
                                    value={formData.sprint_milestones_text}
                                    onChange={e => setFormData({ ...formData, sprint_milestones_text: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Commitment Signals</label>
                                <textarea
                                    rows={3}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="Founder engagement notes..."
                                    value={formData.commitment_signals}
                                    onChange={e => setFormData({ ...formData, commitment_signals: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNew}
                                className="px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                            >
                                <Save size={18} /> Save Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
