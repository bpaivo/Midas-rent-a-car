import React, { useState, useEffect } from 'react';
import { Client, Vehicle, Reservation, ReservationStatus } from '../types';
import { reservationSchema } from '../schemas/reservation.schema';
import toast from 'react-hot-toast';
import Calendar from './Calendar';
import { supabase } from '../lib/supabase';
import { retryAsync } from '../utils/retry';

interface ReservationModalProps {
    clients: Client[];
    vehicles: Vehicle[];
    onClose: () => void;
    onSave: (reservation: Omit<Reservation, 'id' | 'clientName' | 'vehicleModel' | 'vehiclePlate' | 'dateStr'>) => Promise<void>;
}

const ReservationModal: React.FC<ReservationModalProps> = ({ clients, vehicles, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        client_id: '',
        vehicle_id: '',
        pickup_date: '',
        return_date: '',
        daily_rate: 0,
        security_deposit: 0,
        insurance_value: 0,
        additional_services: '',
        status: ReservationStatus.AGUARDANDO
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [occupiedRanges, setOccupiedRanges] = useState<{ start: Date; end: Date }[]>([]);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    const availableVehicles = vehicles.filter(v => v.status === 'Disponível');
    const activeClients = clients.filter(c => c.status === 'Ativo');

    const fetchAvailability = async (vehicleId: string, signal?: { aborted: boolean }) => {
        setIsLoadingAvailability(true);
        console.log(`[ReservationModal] Buscando disponibilidade para veículo: ${vehicleId}`);

        try {
            const data = await retryAsync(async () => {
                const { data, error } = await supabase
                    .from('reservations')
                    .select('pickup_date, return_date')
                    .eq('vehicle_id', vehicleId)
                    .neq('status', 'reserva cancelada')
                    .neq('status', 'reserva perdida');

                if (error) throw error;
                return data;
            });

            if (signal?.aborted) {
                console.log(`[ReservationModal] Requisição para ${vehicleId} ignorada (limpeza).`);
                return;
            }

            if (data) {
                console.log(`[ReservationModal] Disponibilidade carregada: ${data.length} períodos ocupados.`);
                setOccupiedRanges(data.map(r => ({
                    start: new Date(r.pickup_date),
                    end: new Date(r.return_date)
                })));
            }
        } catch (err) {
            console.error('Erro ao buscar disponibilidade:', err);
            if (!signal?.aborted) {
                toast.error('Não foi possível carregar o calendário de disponibilidade.');
            }
        } finally {
            if (!signal?.aborted) {
                setIsLoadingAvailability(false);
            }
        }
    };

    useEffect(() => {
        let isAborted = { aborted: false };

        if (formData.vehicle_id) {
            fetchAvailability(formData.vehicle_id, isAborted);
            setFormData(prev => ({ ...prev, pickup_date: '', return_date: '' }));
        }

        return () => {
            isAborted.aborted = true;
        };
    }, [formData.vehicle_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.pickup_date || !formData.return_date) {
            toast.error('Selecione um período no calendário.');
            return;
        }

        const pickup = new Date(formData.pickup_date);
        const returnD = new Date(formData.return_date);
        const diffTime = Math.abs(returnD.getTime() - pickup.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const total_value = (formData.daily_rate * days) + formData.insurance_value;

        const dataToValidate = {
            ...formData,
            days,
            total_value
        };

        const validation = reservationSchema.safeParse(dataToValidate);

        if (!validation.success) {
            const firstError = validation.error.issues[0];
            toast.error(`${String(firstError.path[0])}: ${firstError.message}`);
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(dataToValidate);
            onClose();
        } catch (error: any) {
            console.error('Error saving reservation:', error);
            toast.error('Erro ao salvar reserva: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateTotals = () => {
        if (!formData.pickup_date || !formData.return_date) return { days: 0, subtotal: 0 };
        const pickup = new Date(formData.pickup_date);
        const returnD = new Date(formData.return_date);
        const diffTime = Math.abs(returnD.getTime() - pickup.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const subtotal = days * formData.daily_rate;
        return { days, subtotal };
    };

    const { days: currentDays, subtotal: currentSubtotal } = calculateTotals();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-20 backdrop-blur-md">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Nova Reserva</h2>
                        <p className="text-sm text-slate-500 font-medium">Preencha os dados da nova locação</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Veículo Disponível</label>
                            <select
                                required
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.vehicle_id}
                                onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                            >
                                <option value="">Selecione o veículo primeiro</option>
                                {availableVehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</label>
                            <select
                                required
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.client_id}
                                onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                            >
                                <option value="">Selecione um cliente</option>
                                {activeClients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} - {c.cpf}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 relative">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período da Reserva</label>
                            <button
                                type="button"
                                disabled={!formData.vehicle_id || isLoadingAvailability}
                                onClick={() => setShowCalendar(!showCalendar)}
                                className={`w-full h-12 flex items-center justify-between px-4 rounded-xl text-sm font-medium transition-all border
                                    ${!formData.vehicle_id ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-white'}
                                    ${showCalendar ? 'ring-2 ring-primary/20 border-primary' : ''}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm opacity-60">calendar_month</span>
                                    <span>
                                        {formData.pickup_date
                                            ? `${formatDateTime(formData.pickup_date)} - ${formatDateTime(formData.return_date).split(' ')[1]}`
                                            : !formData.vehicle_id ? 'Selecione o veículo' : 'Selecionar datas...'}
                                    </span>
                                </div>
                                {isLoadingAvailability && <span className="animate-spin material-symbols-outlined text-xs">progress_activity</span>}
                            </button>

                            {showCalendar && (
                                <div className="absolute top-full left-0 mt-2 z-[110]">
                                    <Calendar
                                        occupiedRanges={occupiedRanges}
                                        initialPickup={formData.pickup_date}
                                        initialReturn={formData.return_date}
                                        onClose={() => setShowCalendar(false)}
                                        onSelectRange={(start, end) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                pickup_date: start.toISOString(),
                                                return_date: end.toISOString()
                                            }));
                                            setShowCalendar(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor da Diária (R$)</label>
                            <input
                                type="number"
                                required
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.daily_rate}
                                onChange={e => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                            />
                        </div>

                        {/* Campos Informativos de Resumo */}
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                            <label className="text-[10px] font-black text-primary uppercase tracking-widest">Total de Diárias</label>
                            <div className="text-lg font-bold text-slate-900 dark:text-white">
                                {currentDays} {currentDays === 1 ? 'dia' : 'dias'}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Subtotal Diárias</label>
                            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentSubtotal)}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Caução (R$)</label>
                            <input
                                type="number"
                                required
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.security_deposit}
                                onChange={e => setFormData({ ...formData, security_deposit: Number(e.target.value) })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor do Seguro (Total R$)</label>
                            <input
                                type="number"
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.insurance_value}
                                onChange={e => setFormData({ ...formData, insurance_value: Number(e.target.value) })}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Serviços Adicionais</label>
                            <input
                                type="text"
                                placeholder="Ex: GPS, Cadeira Bebê..."
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.additional_services}
                                onChange={e => setFormData({ ...formData, additional_services: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-10 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                    <span>Confirmar Reserva</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReservationModal;
