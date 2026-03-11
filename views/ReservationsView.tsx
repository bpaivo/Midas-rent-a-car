import React, { useState } from 'react';
import { Reservation, ReservationStatus } from '../types';
import { reservationSchema } from '../schemas/reservation.schema';
import { TableSkeleton } from '../components/LoadingSkeleton';
import toast from 'react-hot-toast';

interface ReservationsViewProps {
  reservations: Reservation[];
  isLoading?: boolean;
  onEmitVoucher: (res: Reservation) => void;
  onAddReservation: (res: Omit<Reservation, 'id'>) => Promise<void>;
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
  onDeleteReservation: (id: string) => Promise<void>;
}

const ReservationsView: React.FC<ReservationsViewProps> = ({
  reservations,
  onEmitVoucher,
  onAddReservation,
  onUpdateReservation,
  onDeleteReservation,
  isLoading
}) => {
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredReservations = reservations.filter(res => {
    const matchesSearch = !searchQuery ||
      res.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.vehiclePlate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.vehicleModel?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || res.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return date;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'aguardando retirada':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200';
      case 'locação em uso':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200';
      case 'locação concluída':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
      case 'reserva cancelada':
      case 'reserva perdida':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 material-symbols-outlined">search</span>
              <input
                className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border-none rounded-lg focus:ring-2 focus:ring-primary/50 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                placeholder="Buscar por cliente, veículo ou placa..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button
              onClick={() => setStatusFilter(null)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap border transition-all ${!statusFilter
                ? 'bg-primary/10 text-primary dark:text-accent-sunshine border-primary/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              <span>Todos os Status</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            {['AGUARDANDO', 'EM_USO', 'CONCLUIDO'].map(key => {
              const status = ReservationStatus[key as keyof typeof ReservationStatus];
              const isActive = statusFilter === status;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(isActive ? null : status)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border capitalize ${isActive
                    ? 'bg-primary/10 text-primary dark:text-accent-sunshine border-primary/20 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  <span>{status}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto p-6">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Veículo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Retirada</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Devolução</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-primary dark:text-accent-sunshine font-bold text-xs">
                          {res.clientName?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{res.clientName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{res.vehicleModel}</div>
                      <div className="text-xs text-slate-400 font-mono tracking-tight">{res.vehiclePlate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-medium">{formatDate(res.pickup_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-medium">{formatDate(res.return_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyle(res.status)}`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        <button
                          onClick={() => onEmitVoucher(res)}
                          className="px-4 py-1.5 rounded-lg bg-primary/5 text-primary dark:text-accent-sunshine text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95 border border-primary/20"
                        >
                          Emitir Voucher
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === res.id ? null : res.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>

                          {activeMenu === res.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                              <button
                                onClick={() => {
                                  setEditingRes(res);
                                  setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                                Editar Reserva
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm('Tem certeza que deseja excluir esta reserva? esta ação não pode ser desfeita.')) {
                                    await onDeleteReservation(res.id);
                                    setActiveMenu(null);
                                  }
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                                Excluir Reserva
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {reservations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">Nenhuma reserva encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium font-mono">
            Exibindo {filteredReservations.length} de {reservations.length} reservas
          </p>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500 disabled:opacity-30" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="w-8 h-8 rounded-lg bg-primary text-white text-sm font-bold">1</button>
            <button className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {editingRes && (
        <EditReservationModal
          reservation={editingRes}
          onClose={() => setEditingRes(null)}
          onUpdate={onUpdateReservation}
        />
      )}
    </div>
  );
};

interface EditReservationModalProps {
  reservation: Reservation;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Reservation>) => Promise<void>;
}

const EditReservationModal: React.FC<EditReservationModalProps> = ({ reservation, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    status: reservation.status,
    pickup_date: reservation.pickup_date.split('.')[0].slice(0, 16),
    return_date: reservation.return_date.split('.')[0].slice(0, 16),
    daily_rate: reservation.daily_rate,
    total_value: reservation.total_value,
    observations: reservation.observations || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.observations.trim()) {
      toast.error('O campo observações é obrigatório para registrar a alteração.');
      return;
    }

    // Calcular dias e preparar dados para validação
    const pickup = new Date(formData.pickup_date);
    const returnD = new Date(formData.return_date);
    const diffTime = Math.abs(returnD.getTime() - pickup.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const dataToValidate = {
      client_id: reservation.client_id,
      vehicle_id: reservation.vehicle_id,
      pickup_date: new Date(formData.pickup_date).toISOString(),
      return_date: new Date(formData.return_date).toISOString(),
      daily_rate: formData.daily_rate,
      security_deposit: reservation.security_deposit,
      insurance_value: reservation.insurance_value,
      additional_services: reservation.additional_services,
      status: formData.status,
      days,
      total_value: formData.total_value
    };

    const validation = reservationSchema.safeParse(dataToValidate);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(`${String(firstError.path[0])}: ${firstError.message}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(reservation.id, {
        status: formData.status as ReservationStatus,
        pickup_date: dataToValidate.pickup_date,
        return_date: dataToValidate.return_date,
        daily_rate: formData.daily_rate,
        total_value: formData.total_value,
        observations: formData.observations
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-300">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">edit</span>
            Editar Reserva
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              >
                {Object.values(ReservationStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Retirada</label>
              <input
                type="datetime-local"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm"
                value={formData.pickup_date}
                onChange={e => setFormData({ ...formData, pickup_date: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Devolução</label>
              <input
                type="datetime-local"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm"
                value={formData.return_date}
                onChange={e => setFormData({ ...formData, return_date: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Diária</label>
              <input
                type="number"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm"
                value={formData.daily_rate}
                onChange={e => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Total (Global)</label>
              <input
                type="number"
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm"
                value={formData.total_value}
                onChange={e => setFormData({ ...formData, total_value: Number(e.target.value) })}
              />
            </div>

            {/* Resumo em tempo real */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <label className="text-[10px] font-black text-primary uppercase block mb-1">Diárias Calculadas</label>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{currentDays} {currentDays === 1 ? 'dia' : 'dias'}</div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase block mb-1">Subtotal Diárias</label>
              <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentSubtotal)}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações (Obrigatório)</label>
            <textarea
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm min-h-[100px]"
              placeholder="Descreva o motivo da alteração..."
              value={formData.observations}
              onChange={e => setFormData({ ...formData, observations: e.target.value })}
              required
            ></textarea>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReservationsView;
