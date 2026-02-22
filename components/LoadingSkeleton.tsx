import React from 'react';

export const TableSkeleton: React.FC = () => {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-full"></div>
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex-1"></div>
                        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex-1"></div>
                        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg w-24"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const CardSkeleton: React.FC = () => {
    return (
        <div className="animate-pulse bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-start">
                <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
        </div>
    );
}

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-6"></div>
                <TableSkeleton />
            </div>
        </div>
    );
}
