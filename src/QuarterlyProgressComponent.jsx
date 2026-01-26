import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart3, Save, CheckCircle, AlertTriangle, XCircle, TrendingUp, Users, DollarSign, Flag } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function QuarterlyProgress({ profileId, isConsultant }) {
    const [progressData, setProgressData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

    useEffect(() => {
        fetchProgress();
    }, [profileId]);

    const fetchProgress = async () => {
        const { data, error } = await supabase
            .from('quarterly_progress')
            .select('*')
            .eq('company_profile_id', profileId);

        if (data) {
            // Merge with defaults
            const merged = quarters.map(q => {
                const found = data.find(d => d.quarter_label === q);
                return found || {
                    company_profile_id: profileId,
                    quarter_label: q,
                    revenue_actual: '',
                    jobs_actual: '',
                    strategy_status: 'Green',
                    sprint_milestones_text: '',
                    commitment_signals: ''
                };
            });
            setProgressData(merged);
        }
        setLoading(false);
    };

    const handleUpdate = (index, field, value) => {
        if (!isConsultant) return;
        const newData = [...progressData];
        newData[index] = { ...newData[index], [field]: value };
        setProgressData(newData);
    };

    const handleSave = async (quarterData) => {
        if (!isConsultant) return;
        setSaving(true);
        // Clean numeric
        const payload = {
            ...quarterData,
            revenue_actual: parseFloat(quarterData.revenue_actual) || 0,
            jobs_actual: parseInt(quarterData.jobs_actual) || 0,
            company_profile_id: profileId // Ensure ID is set
        };
        // Remove ID if it is temporary/undefined to allow gen_random_uuid? 
        // Upsert uses unique (profile_id, quarter)

        const { error } = await supabase
            .from('quarterly_progress')
            .upsert(payload, { onConflict: 'company_profile_id, quarter_label' });

        if (error) alert("Error saving: " + error.message);
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading progress data...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Quarterly Progress Tracker</h2>
                    <p className="text-gray-500 max-w-2xl">Monitor key execution metrics, milestone completion, and leadership commitment levels.</p>
                </div>
                {!isConsultant && (
                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold uppercase">Read Only View</span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {progressData.map((data, idx) => (
                    <div key={data.quarter_label} className={`rounded-xl border ${data.strategy_status === 'Red' ? 'border-red-200 bg-red-50' : data.strategy_status === 'Amber' ? 'border-orange-200 bg-orange-50' : 'border-emerald-200 bg-white'} shadow-sm overflow-hidden transition-all hover:shadow-md`}>
                        {/* Header */}
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${data.strategy_status === 'Red' ? 'border-red-100' : data.strategy_status === 'Amber' ? 'border-orange-100' : 'border-gray-100 bg-emerald-50/30'}`}>
                            <h3 className="font-bold text-lg text-gray-800">{data.quarter_label}</h3>
                            {isConsultant ? (
                                <select
                                    value={data.strategy_status}
                                    onChange={(e) => handleUpdate(idx, 'strategy_status', e.target.value)}
                                    className={`text-xs font-bold px-2 py-1 rounded border outline-none cursor-pointer ${data.strategy_status === 'Red' ? 'bg-red-100 text-red-700 border-red-200' :
                                            data.strategy_status === 'Amber' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                'bg-emerald-100 text-emerald-700 border-emerald-200'
                                        }`}
                                >
                                    <option value="Green">On Track</option>
                                    <option value="Amber">At Risk</option>
                                    <option value="Red">Off Track</option>
                                </select>
                            ) : (
                                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${data.strategy_status === 'Red' ? 'bg-red-100 text-red-700' :
                                        data.strategy_status === 'Amber' ? 'bg-orange-100 text-orange-700' :
                                            'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {data.strategy_status === 'Red' ? <XCircle size={14} /> : data.strategy_status === 'Amber' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                    {data.strategy_status === 'Green' ? 'On Track' : data.strategy_status === 'Red' ? 'Off Track' : 'At Risk'}
                                </div>
                            )}
                        </div>

                        {/* Metrics */}
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1"><DollarSign size={12} /> Revenue (Actual)</label>
                                    {isConsultant ? (
                                        <div className="flex items-center">
                                            <span className="text-gray-400 text-sm font-bold mr-1">₹</span>
                                            <input
                                                type="number"
                                                value={data.revenue_actual}
                                                onChange={(e) => handleUpdate(idx, 'revenue_actual', e.target.value)}
                                                className="w-full font-bold text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                                placeholder="0.0"
                                            />
                                            <span className="text-gray-400 text-xs font-bold ml-1">Cr</span>
                                        </div>
                                    ) : (
                                        <div className="font-bold text-gray-900">₹ {data.revenue_actual || '-'} Cr</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1"><Users size={12} /> Jobs Created</label>
                                    {isConsultant ? (
                                        <input
                                            type="number"
                                            value={data.jobs_actual}
                                            onChange={(e) => handleUpdate(idx, 'jobs_actual', e.target.value)}
                                            className="w-full font-bold text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                                            placeholder="0"
                                        />
                                    ) : (
                                        <div className="font-bold text-gray-900">{data.jobs_actual || '-'}</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1"><Flag size={12} /> Sprint Milestones</label>
                                {isConsultant ? (
                                    <textarea
                                        rows={3}
                                        value={data.sprint_milestones_text}
                                        onChange={(e) => handleUpdate(idx, 'sprint_milestones_text', e.target.value)}
                                        className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-indigo-500 resize-none"
                                        placeholder="Summarize key milestones achieved..."
                                    />
                                ) : (
                                    <p className="text-sm text-gray-700 leading-relaxed min-h-[60px]">{data.sprint_milestones_text || 'No updates yet.'}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1"><TrendingUp size={12} /> Commitment Signals</label>
                                {isConsultant ? (
                                    <textarea
                                        rows={2}
                                        value={data.commitment_signals}
                                        onChange={(e) => handleUpdate(idx, 'commitment_signals', e.target.value)}
                                        className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-indigo-500 resize-none"
                                        placeholder="Notes on leadership engagement..."
                                    />
                                ) : (
                                    <p className="text-sm text-gray-700 leading-relaxed italic">{data.commitment_signals || '--'}</p>
                                )}
                            </div>

                            {isConsultant && (
                                <div className="border-t border-gray-100 pt-4 flex justify-end">
                                    <button
                                        onClick={() => handleSave(data)}
                                        disabled={saving}
                                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                                    >
                                        <Save size={12} /> Save {data.quarter_label}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
