import React, { useState } from 'react';
import { useProgressiveDiscounts } from '../hooks/useProgressiveDiscounts';
import toast from 'react-hot-toast';

const ProgressiveDiscountsView: React.FC = () => {
    const { discounts, loading, updateDiscount } = useProgressiveDiscounts();
    const [editingDay, setEditingDay] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const handleSave = async (day: number) => {
        const value = parseFloat(editValue.replace(',', '.'));
        if (isNaN(value)) {
            toast.error('Valor inválido');
            return;
        }

        const success = await updateDiscount(day, value);
        if (success) {
            toast.success(`Desconto do dia ${day} atualizado!`);
            setEditingDay(null);
        } else {
            toast.error('Erro ao atualizar desconto');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Desconto Progressivo</h2>
                <p className="text-slate-500 dark:text-slate-400">Configure as porcentagens de desconto acumulativo por dia de locação.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dia</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Desconto (%)</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-10 text-center">
                                        <span className="animate-spin material-symbols-outlined text-primary text-3xl">progress_activity</span>
                                    </td>
                                </tr>
                            ) : discounts.map((d) => (
                                <tr key={d.day} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">Dia {d.day}</td>
                                    <td className="px-6 py-4">
                                        {editingDay === d.day ? (
                                            <input
                                                type="text"
                                                className="w-20 h-8 bg-slate-100 dark:bg-slate-900 border-none rounded px-2 text-sm font-bold dark:text-white"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                autoFocus
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{d.discount_percent}%</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {editingDay === d.day ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setEditingDay(null)} className="text-slate-400 hover:text-slate-600">
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                                <button onClick={() => handleSave(d.day)} className="text-emerald-500 hover:text-emerald-600">
                                                    <span className="material-symbols-outlined text-lg">check</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setEditingDay(d.day);
                                                    setEditValue(d.discount_percent.toString());
                                                }}
                                                className="text-primary dark:text-accent-sunshine hover:opacity-70"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProgressiveDiscountsView;