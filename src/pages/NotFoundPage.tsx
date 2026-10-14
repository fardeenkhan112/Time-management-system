import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center transition-colors">
      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
        <Clock className="w-6 h-6" />
      </div>
      <h1 className="text-4xl font-bold font-display text-slate-900 dark:text-white">404</h1>
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mt-2">
        Page Not Found
      </h2>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
        The requested attendance view or route does not exist.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};
