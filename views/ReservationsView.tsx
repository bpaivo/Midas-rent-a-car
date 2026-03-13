import React, { useState } from 'react';
import { Reservation, ReservationStatus, VehicleChecklist, Client, Vehicle } from '../types';
import { TableSkeleton } from '../components/LoadingSkeleton';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import EditReservationModal from '../components/EditReservationModal';

const defaultChecklistItems = ['Lataria', 'Motor', 'Pneus', 'Interior', 'Vidros', 'Acessórios'];

interface ReservationsViewProps {
  reservations: Reservation[];
  clients: Client[];
  vehicles: Vehicle[];
  isLoading?: boolean;
  onEmitVoucher: (res: Reservation) => void;
  onAddReservation: (res: Omit<Reservation, 'id'>) => Promise<void>;
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
  onDeleteReservation: (id: string) => Promise<void>;
}

const ReservationsView: React.FC<ReservationsViewProps> = ({
  reservations,
  clients,
  vehicles,
  onEmitVoucher,
  onAddReservation,
  onUpdateReservation,
  onDeleteReservation,
  isLoading
}) => {
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [processingPickupRes, setProcessingPickupRes] = useState<Reservation | null>(null);
  const [processingReturnRes, setProcessingReturnRes] = useState<Reservation | null>(null);
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
                              {res.status === 'aguardando retirada' && (
                                <button
                                  onClick={() => {
                                    setProcessingPickupRes(res);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-lg">key</span>
                                  Concluir Retirada
                                </button>
                              )}
                              {res.status === 'locação em uso' && (
                                <button
                                  onClick={() => {
                                    setProcessingReturnRes(res);
                                    setActiveMenu(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
                                  Concluir Locação
                                </button>
                              )}
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
          clients={clients}
          vehicles={vehicles}
          onClose={() => setEditingRes(null)}
          onUpdate={onUpdateReservation}
        />
      )}
      {processingPickupRes && (
        <PickupModal
          reservation={processingPickupRes}
          onClose={() => setProcessingPickupRes(null)}
          onUpdate={onUpdateReservation}
        />
      )}
      {processingReturnRes && (
        <ReturnModal
          reservation={processingReturnRes}
          onClose={() => setProcessingReturnRes(null)}
          onUpdate={onUpdateReservation}
        />
      )}
    </div>
  );
};

interface PickupModalProps {
  reservation: Reservation;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Reservation>) => Promise<void>;
}

const PickupModal: React.FC<PickupModalProps> = ({ reservation, onClose, onUpdate }) => {
  const [actualPickupDate, setActualPickupDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [checklist, setChecklist] = useState<VehicleChecklist>(
    defaultChecklistItems.reduce((acc, item) => ({ ...acc, [item]: { hasIssue: false, observation: '' } }), {})
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    const urls: string[] = [];
    for (const file of photos) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('clients-docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('clients-docs')
        .getPublicUrl(filePath);

      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualPickupDate) {
      toast.error('Informe a data e hora real da retirada.');
      return;
    }

    // Validação obrigatória: se temIssue for true, a observação não pode ser vazia
    const itemsComEdicaoPendete = Object.entries(checklist).filter(([_, data]) => data.hasIssue && !data.observation.trim());
    if (itemsComEdicaoPendete.length > 0) {
      toast.error(`Descreva a avaria para: ${itemsComEdicaoPendete.map(([item]) => item).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Processando retirada e enviando fotos...');

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      await onUpdate(reservation.id, {
        status: ReservationStatus.EM_USO,
        actual_pickup_date: new Date(actualPickupDate).toISOString(),
        pickup_photos: photoUrls,
        pickup_checklist: checklist
      });

      toast.success('Retirada concluída com sucesso!', { id: loadingToast });
      onClose();
    } catch (error: any) {
      console.error('Erro na retirada:', error);
      toast.error('Erro ao processar retirada: ' + (error.message || 'Falha na conexão'), { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-300">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500">key</span>
            Concluir Retirada
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Resumo da Reserva</div>
            <div className="font-bold text-slate-900 dark:text-white">{reservation.clientName}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Veículo: {reservation.vehicleModel} - {reservation.vehiclePlate}</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data/Hora Real da Retirada</label>
            <input
              type="datetime-local"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary"
              value={actualPickupDate}
              onChange={e => setActualPickupDate(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fotos do Veículo (Check-in)</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:border-slate-500 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-1">add_a_photo</span>
                  <p className="text-xs font-semibold">Clique para adicionar fotos</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </label>
            </div>
            
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square">
                    <img src={URL.createObjectURL(photo)} alt={`preview-${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 text-right">{photos.length} foto(s) selecionada(s)</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 hover:brightness-110 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">check</span>
              )}
              Confirmar Retirada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ReturnModalProps {
  reservation: Reservation;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Reservation>) => Promise<void>;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ reservation, onClose, onUpdate }) => {
  const [actualReturnDate, setActualReturnDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [checklist, setChecklist] = useState<VehicleChecklist>(
    defaultChecklistItems.reduce((acc, item) => ({ ...acc, [item]: { hasIssue: false, observation: '' } }), {})
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    const urls: string[] = [];
    for (const file of photos) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `vehicles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('clients-docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('clients-docs')
        .getPublicUrl(filePath);

      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualReturnDate) {
      toast.error('Informe a data e hora real da devolução.');
      return;
    }

    // Validação obrigatória: se temIssue for true, a observação não pode ser vazia
    const itemsComEdicaoPendete = Object.entries(checklist).filter(([_, data]) => data.hasIssue && !data.observation.trim());
    if (itemsComEdicaoPendete.length > 0) {
      toast.error(`Descreva a avaria para: ${itemsComEdicaoPendete.map(([item]) => item).join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Processando devolução e enviando fotos...');

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      await onUpdate(reservation.id, {
        status: ReservationStatus.CONCLUIDO,
        actual_return_date: new Date(actualReturnDate).toISOString(),
        return_photos: photoUrls,
        return_checklist: checklist
      });

      toast.success('Devolução concluída com sucesso!', { id: loadingToast });
      onClose();
    } catch (error: any) {
      console.error('Erro na devolução:', error);
      toast.error('Erro ao processar devolução: ' + (error.message || 'Falha na conexão'), { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in duration-300">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">assignment_turned_in</span>
            Concluir Locação
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Resumo da Devolução</div>
            <div className="font-bold text-slate-900 dark:text-white">{reservation.clientName}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">Veículo: {reservation.vehicleModel} - {reservation.vehiclePlate}</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data/Hora Real da Devolução</label>
            <input
              type="datetime-local"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary"
              value={actualReturnDate}
              onChange={e => setActualReturnDate(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fotos do Veículo (Check-out)</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:border-slate-500 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-1">add_a_photo</span>
                  <p className="text-xs font-semibold">Clique para adicionar fotos</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
              </label>
            </div>
            
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square">
                    <img src={URL.createObjectURL(photo)} alt={`preview-${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 text-right">{photos.length} foto(s) selecionada(s)</p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Check-list de Integridade (Check-out)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {defaultChecklistItems.map((item) => (
                <div key={item} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item}</span>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setChecklist(prev => ({
                        ...prev, [item]: { ...prev[item], hasIssue: !prev[item].hasIssue }
                      }))}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${checklist[item].hasIssue ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    >
                      <span className="sr-only">Toggle {item} status</span>
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${checklist[item].hasIssue ? 'translate-x-5' : 'translate-x-0'}`}>
                        {checklist[item].hasIssue ? (
                          <span className="material-symbols-outlined text-[12px] text-amber-500">warning</span>
                        ) : (
                          <span className="material-symbols-outlined text-[12px] text-indigo-500">check</span>
                        )}
                      </span>
                    </button>
                  </div>
                  <div className={`text-xs mb-2 ${checklist[item].hasIssue ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {checklist[item].hasIssue ? 'Avaria/Obs identificada' : 'Em perfeitas condições'}
                  </div>
                  {checklist[item].hasIssue && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <textarea
                        className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-slate-400"
                        placeholder="Descreva detalhadamente a condição desta parte do veículo..."
                        value={checklist[item].observation}
                        onChange={(e) => setChecklist(prev => ({
                          ...prev, [item]: { ...prev[item], observation: e.target.value }
                        }))}
                        disabled={isSubmitting}
                        rows={2}
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/20 hover:brightness-110 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">check</span>
              )}
              Confirmar Devolução
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReservationsView;