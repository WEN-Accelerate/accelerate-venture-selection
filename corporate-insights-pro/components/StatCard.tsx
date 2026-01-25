
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | string[];
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => {
  return (
    <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <i className={`fa-solid ${icon} text-xl ${color.replace('bg-', 'text-')}`}></i>
        </div>
      </div>
      <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">{label}</h3>
      {Array.isArray(value) ? (
        <ul className="space-y-1">
          {value.map((v, i) => (
            <li key={i} className="text-slate-800 font-semibold text-lg line-clamp-1">
              • {v}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-800 font-semibold text-xl leading-tight">{value || 'N/A'}</p>
      )}
    </div>
  );
};

export default StatCard;
