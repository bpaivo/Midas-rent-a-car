import React, { useState, useEffect } from 'react';
import { Client, Vehicle, Reservation, ReservationStatus, InsuranceItem } from '../types';
import { reservationSchema } from '../schemas/reservation.schema';
import toast from 'react-hot-toast';
import Calendar from './Calendar';
import { supabase } from '../lib/supabase';
import { retryAsync } from '../utils/retry';

interface ReservationModalProps {
    clients: Client[];
    vehicles: Vehicle[];
    onClose: () => void;
    onSave: (reservation: Omit<Reservation, 'id' | 'clientName' | 'vehicleModel' | 'vehiclePlate' | 'dateStr' | 'created_at'>) => Promise<void>;
}

const DISCOUNT_TIERS = [
    { label: '1 diária', min: 1, max: 1, discount: 0 },
    { label: '2 diárias', min: 2, max: 2, discount: 5 },
    { label: '3 diárias', min: 3, max: 3, discount: 10 },
    { label: '4 diárias', min: 4, max: 4, discount: 15 },
    { label: '5 diárias', min: 5, max: 5, discount: 20 },
    { label: '6-10 diárias', min: 6, max: 10, discount: 25 },
    { label: '11-15 diárias', min: 11, max: 15, discount: 30 },
    { label: 'Acima de 15', min: 16, max: 9999, discount: 35 },
];

const ADDITIONAL_SERVICES = [
    { id: 'lavagem', name: 'Taxa de lavagem', price: 30.00, type: 'fixed' },
    { id: 'km_livre', name: 'Km livre', price: 24.99, type: 'daily' },
    { id: 'condutor', name: 'Condutor adicional', price: 24.99, type: 'daily' },
    { id: 'locatario_jovem', name: 'Locatário Jovem', price: 29.79, type: 'daily' },
];

const INSURANCE_COVERAGES = [
    "INCÊNDIO PROVENIENTE DE COLISÃO",
    "FENÔMENOS DA NATUREZA",
    "PROTEÇÃO VIDRO/FAROL/LANTERNA/RETROVISOR",
    "ASSISTÊNCIA FUNERAL INDIVIDUAL PARA O ASSOCIADO - VALOR LIMITADO A R$ 5.000,00",
    "PAP - ACIDENTE PESSOAL POR PASSAGEIRO - R$ 10.000,00 (ATÉ 5 PASSAGEIROS)",
    "REBOQUE - 1000 KM - PANE",
    "COLISÃO INTEGRAL",
    "CARRO RESERVA EM CASO DE EVENTO (SINISTRO) - 15 DIAS",
    "ASSISTÊNCIA 24H - VEÍCULO LEVE - PLENO - 01/2024 KM ILIMITADO COLISÃO",
    "REBOQUE - 200 KM PANE SECA",
    "MEIO DE TRANSPORTE ALTERNATIVO",
    "TROCA DE PNEU",
    "RETORNO A DOMICILIO",
    "CHAVEIRO",
    "HOSPEDAGEM EMERGENCIAL - DIÁRIA DE HOTEL EM CASO DE EMERGÊNCIA R$500,00",
    "VALOR DE ATÉ R$ 70.000,00 PARA RESSARCIMENTO AOS PREJUÍZOS MATERIAIS CAUSADOS AO TERCEIRO.",
    "COLISÃO PARCIAL",
    "ROUBO E FURTO",
    "CARGA DE BATERIA"
];

const ReservationModal: React.FC<ReservationModalProps> = ({ clients, vehicles, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        client_id: '',
        vehicle_id: '',
        pickup_date: '',
        return_date: '',
        base_rate: 0,
        discount_percent: 0,
        security_deposit: 0,
        insurance_value: 0,
        additional_services: '',
        status: ReservationStatus.AGUARDANDO
    });
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [insuranceDetails, setInsuranceDetails] = useState<InsuranceItem[]>(
        INSURANCE_COVERAGES.map(name => ({ name, value: 0, selected: false }))
    );
    const [defaultInsuranceItemValue, setDefaultInsuranceItemValue] = useState(0);
    const [isManualDiscount, setIsManualDiscount] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [occupiedRanges, setOccupiedRanges] = useState<{ start: Date; end: Date }[]>([]);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    const availableVehicles = vehicles.filter(v => v.status === 'Disponível');
    const activeClients = clients.filter(c => c.status === 'Ativo');

    const fetchAvailability = async (vehicleId: string, signal?: { aborted: boolean }) => {
        setIsLoadingAvailability(true);
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

            if (signal?.aborted) return;

            if (data) {
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
            const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
            if (vehicle) {
                setFormData(prev => ({
                    ...prev,
                    pickup_date: '',
                    return_date: '',
                    security_deposit: vehicle.default_security_deposit || 0,
                    insurance_value: vehicle.default_insurance_value || 0
                }));
            }
            fetchAvailability(formData.vehicle_id, isAborted);
        }
        return () => { isAborted.aborted = true; };
    }, [formData.vehicle_id]);

    // Atualiza o valor total do seguro quando os detalhes mudam
    useEffect(() => {
        const total = insuranceDetails
            .filter(item => item.selected)
            .reduce((sum, item) => sum + item.value, 0);
        setFormData(prev => ({ ...prev, insurance_value: total }));
    }, [insuranceDetails]);

    const handleInsuranceToggle = (index: number) => {
        setInsuranceDetails(prev => prev.map((item, i) => {
            if (i === index) {
                const newSelected = !item.selected;
                return {
                    ...item,
                    selected: newSelected,
                    value: newSelected ? defaultInsuranceItemValue : 0
                };
            }
            return item;
        }));
    };

    const handleInsuranceValueChange = (index: number, newValue: number) => {
        setInsuranceDetails(prev => prev.map((item, i) => 
            i === index ? { ...item, value: newValue } : item
        ));
    };

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

        const currentDailyRate = formData.base_rate * (1 - (formData.discount_percent / 100));
        const total_value = (currentDailyRate * days) + formData.insurance_value;

        const { base_rate, discount_percent, ...cleanFormData } = formData;

        const dataToSave = {
            ...cleanFormData,
            daily_rate: currentDailyRate,
            days,
            total_value,
            insurance_details: insuranceDetails.filter(item => item.selected)
        };

        const validation = reservationSchema.safeParse(dataToSave);

        if (!validation.success) {
            const firstError = validation.error.issues[0];
            toast.error(`${String(firstError.path[0])}: ${firstError.message}`);
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave(dataToSave);
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
        if (!formData.pickup_date || !formData.return_date) return { days: 0, subtotal: 0, suggestedDiscount: 0, currentTier: DISCOUNT_TIERS[0], servicesTotal: 0 };
        const pickup = new Date(formData.pickup_date);
        const returnD = new Date(formData.return_date);
        const diffTime = Math.abs(returnD.getTime() - pickup.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

        const tier = DISCOUNT_TIERS.find(t => days >= t.min && days <= t.max) || DISCOUNT_TIERS[0];
        const effectiveDiscount = isManualDiscount ? formData.discount_percent : tier.discount;

        const dailyRate = formData.base_rate * (1 - (effectiveDiscount / 100));
        let subtotal = days * dailyRate;

        let servicesTotal = 0;
        selectedServices.forEach(serviceId => {
            const service = ADDITIONAL_SERVICES.find(s => s.id === serviceId);
            if (service) {
                if (service.type === 'fixed') {
                    servicesTotal += service.price;
                } else {
                    servicesTotal += service.price * days;
                }
            }
        });

        subtotal += servicesTotal;

        return { days, subtotal, suggestedDiscount: tier.discount, currentTier: tier, servicesTotal };
    };

    const { days: currentDays, subtotal: currentSubtotal, suggestedDiscount, currentTier, servicesTotal } = calculateTotals();

    useEffect(() => {
        if (!isManualDiscount && currentDays > 0) {
            setFormData(prev => ({ ...prev, discount_percent: suggestedDiscount }));
        }
    }, [currentDays, suggestedDiscount, isManualDiscount]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-20 backdrop-blur-md">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Nova Reserva</h2>
                        <p className="text-sm text-slate-500 font-medium">Preencha os dados da nova locação</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
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
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Base Diária (R$)</label>
                            <input
                                type="number"
                                required
                                className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all dark:text-white"
                                value={formData.base_rate}
                                onChange={e => setFormData({ ...formData, base_rate: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Bloco de Informações do Seguro */}
                    <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Informações do Seguro</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Selecione as coberturas desejadas</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Padrão Item (R$)</label>
                                <input 
                                    type="number"
                                    className="w-20 h-8 bg-slate-50 dark:bg-slate-900 border-none rounded-lg text-xs font-bold dark:text-white"
                                    value={defaultInsuranceItemValue}
                                    onChange={e => setDefaultInsuranceItemValue(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {insuranceDetails.map((item, index) => (
                                <div 
                                    key={item.name}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${item.selected 
                                        ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/30' 
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:bg-slate-50'}`}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <input 
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                            checked={item.selected}
                                            onChange={() => handleInsuranceToggle(index)}
                                        />
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{item.name}</span>
                                    </div>
                                    {item.selected && (
                                        <div className="flex items-center gap-2 ml-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">R$</span>
                                            <input 
                                                type="number"
                                                className="w-20 h-8 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold dark:text-white text-right"
                                                value={item.value}
                                                onChange={e => handleInsuranceValueChange(index, Number(e.target.value))}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Seguro</span>
                            <span className="text-lg font-black text-primary dark:text-accent-sunshine">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.insurance_value)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Subtotal Final</label>
                            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentSubtotal)}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-emerald-600/60 font-medium">
                                    Diária efetiva: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((currentSubtotal - servicesTotal) / (currentDays || 1))}
                                </span>
                                {servicesTotal > 0 && (
                                    <span className="text-[10px] text-primary/60 font-medium">
                                        Serviços inclusos: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servicesTotal)}
                                    </span>
                                )}
                            </div>
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