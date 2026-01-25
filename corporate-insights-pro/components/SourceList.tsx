
import React from 'react';

interface Source {
  title: string;
  uri: string;
}

interface SourceListProps {
  sources: Source[];
}

const SourceList: React.FC<SourceListProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-8 p-6 bg-white rounded-2xl border border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
        <i className="fa-solid fa-link mr-2 text-indigo-500"></i>
        Verified Sources
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.map((source, idx) => (
          <a
            key={idx}
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 group"
          >
            <div className="mr-3 text-slate-400 group-hover:text-indigo-500">
              <i className="fa-solid fa-file-lines"></i>
            </div>
            <span className="text-sm font-medium text-slate-700 line-clamp-1">
              {source.title}
            </span>
            <i className="fa-solid fa-arrow-up-right-from-square ml-auto text-xs text-slate-300"></i>
          </a>
        ))}
      </div>
    </div>
  );
};

export default SourceList;
