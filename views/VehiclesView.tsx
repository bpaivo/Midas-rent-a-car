import React, { useState } from 'react';
import { Vehicle } from '../types';
import { vehicleSchema } from '../schemas/vehicle.schema';
import toast from 'react-hot-toast';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { supabase } from '../lib/supabase';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  isLoading?: boolean;
  onAddVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>;
  onUpdateVehicle: (id: string, v: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
}

const initialState: Omit<Vehicle, 'id'> = {
  plate: '',
  brand: '',
  model: '',
  year: 2024,
  category: '',
  km: 0,
  status: 'Disponível',
  color: '',
  passengers: 5,
  doors: 4,
  transmission: 'Manual',
  renavan: '',
  chassis: '',
  default_security_deposit: 0,
  default_insurance_value: 0,
  image_url: null
};

const VehiclesView: React.FC<VehiclesViewProps> = ({ vehicles, onAddVehicle, onUpdateVehicle, onDeleteVehicle, isLoading }) => {
  const [formData, setFormData] = useState<Omit<Vehicle, 'id'>>(initialState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);

  const handleEdit = (v: Vehicle) => {
    const { id, ...data } = v;
    setFormData({
      ...initialState,
      ...data,
      image_url: data.image_url || null
    });
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialState);
    setEditingId(null);
    setAttachedImage(null);
  };

  const uploadFile = async (file: File) => {
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

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = vehicleSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast.error(`${String(firstError.path[0])}: ${firstError.message}`);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Salvando veículo...');

    try {
      const finalData = { ...formData };
      
      if (attachedImage) {
        finalData.image_url = await uploadFile(attachedImage);
      }

      // Se image_url for nulo ou vazio, removemos do objeto para evitar erro de coluna inexistente no cache
      if (!finalData.image_url) {
        delete (finalData as any).image_url;
      }

      if (editingId) {
        await onUpdateVehicle(editingId, finalData);
      } else {
        await onAddVehicle(finalData);
      }
      
      toast.success('Veículo salvo com sucesso!', { id: loadingToast });
      handleCloseModal();
    } catch (err: any) {
      console.error("Erro ao salvar veículo:", err);
      
      // Tratamento específico para erro de cache de esquema
      if (err.message?.includes('image_url') && err.message?.includes('schema cache')) {
        toast.error('O banco de dados ainda não reconheceu a nova coluna. Por favor, clique no botão REBUILD acima para atualizar o sistema.', { id: loadingToast, duration: 6000 });
      } else {
        toast.error('Erro ao salvar veículo: ' + (err.message || 'Falha na conexão'), { id: loadingToast });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-primary dark:text-white text-3xl font-black tracking-tight">Veículos da Frota</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie a disponibilidade e cadastro dos veículos</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:opacity-90 transition active:scale-95"
        >
          + Novo Veículo
        </button>
      </div>

      <div className="bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm mb-12 p-6">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-primary/10 border-b border-gray-200 dark:border-gray-800">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Veículo</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Placa</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ano</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {vehicles && vehicles.length > 0 ? vehicles.filter(v => v.status !== 'Desativado').map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {v.image_url ? (
                          <img src={v.image_url} alt={v.model} className="size-10 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="size-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined">directions_car</span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-primary dark:text-white">{v.model}</span>
                          <span className="text-xs text-gray-400 uppercase tracking-tighter">{v.brand}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-primary dark:text-white">{v.plate}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{v.year}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-semibold bg-primary/5 text-primary dark:text-accent-sunshine border border-primary/20 rounded-full">{v.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${v.status === 'Disponível' ? 'bg-green-100 text-green-700' :
                        v.status === 'Alugado' ? 'bg-red-100 text-red-700' :
                          v.status === 'Reservado' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-blue-700'
                        }`}>
                        <span className={`size-1.5 rounded-full ${v.status === 'Disponível' ? 'bg-green-500' :
                          v.status === 'Alugado' ? 'bg-red-500' :
                            v.status === 'Reservado' ? 'bg-orange-500' :
                              'bg-blue-500'
                          }`}></span>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative flex justify-end">
                        <button
                          onClick={() => setActiveMenu(activeMenu === v.id ? null : v.id)}
                          className="p-1 px-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-400 dark:text-gray-500 transition-colors"
                        >
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>

                        {activeMenu === v.id && (
                          <div className="absolute right-0 mt-8 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                            <button
                              onClick={() => {
                                handleEdit(v);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                              Editar
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                            <button
                              onClick={() => {
                                onUpdateVehicle(v.id, { status: 'Disponível' });
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">check_circle</span>
                              Status: Disponível
                            </button>
                            <button
                              onClick={() => {
                                onUpdateVehicle(v.id, { status: 'Em manutenção' });
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">build</span>
                              Status: Em manutenção
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                            <button
                              onClick={async () => {
                                if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
                                  await onDeleteVehicle(v.id);
                                  setActiveMenu(null);
                                }
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                              Excluir Veículo
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 italic">Nenhum veículo encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-background-dark w-full max-w-4xl rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-bold text-primary dark:text-white">
                {editingId ? 'Editar Veículo' : 'Cadastro de Novo Veículo'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-red-500 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="p-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Foto do Veículo */}
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Foto do Veículo</label>
                  <div className="flex items-center gap-6">
                    <div className="size-32 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                      {attachedImage ? (
                        <img src={URL.createObjectURL(attachedImage)} className="w-full h-full object-cover" />
                      ) : formData.image_url ? (
                        <img src={formData.image_url} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-slate-300">add_a_photo</span>
                      )}
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*"
                        onChange={(e) => setAttachedImage(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-slate-500 font-medium">Clique no quadro ao lado para selecionar uma imagem.</p>
                      <p className="text-[10px] text-slate-400">Formatos aceitos: JPG, PNG. Tamanho máximo: 2MB.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Marca</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Ex: TOYOTA"
                    type="text"
                    required
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Modelo</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Ex: COROLLA XEI"
                    type="text"
                    required
                    value={formData.model}
                    onChange={e => setFormData({ ...formData, model: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Placa</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3 font-mono"
                    placeholder="ABC1234"
                    type="text"
                    required
                    maxLength={7}
                    value={formData.plate}
                    onChange={e => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setFormData({ ...formData, plate: value });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ano</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="YYYY"
                    type="number"
                    required
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Categoria</label>
                  <select
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value="Compacto">Compacto</option>
                    <option value="Sedan Premium">Sedan Premium</option>
                    <option value="SUV">SUV</option>
                    <option value="Econômico">Econômico</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cor</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Ex: PRATA"
                    type="text"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">KM Atual</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    type="text"
                    value={new Intl.NumberFormat('pt-BR').format(formData.km)}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, km: Number(rawValue) });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    required
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="Disponível">Disponível</option>
                    <option value="Alugado">Alugado</option>
                    <option value="Reservado">Reservado</option>
                    <option value="Em manutenção">Em manutenção</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Transmissão</label>
                  <select
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    value={formData.transmission}
                    onChange={e => setFormData({ ...formData, transmission: e.target.value as any })}
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automático">Automático</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Renavan</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Digite o Renavan"
                    type="text"
                    value={formData.renavan}
                    onChange={e => setFormData({ ...formData, renavan: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chassis</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    placeholder="Número do Chassis"
                    type="text"
                    value={formData.chassis}
                    onChange={e => setFormData({ ...formData, chassis: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Passageiros / Portas</label>
                  <div className="flex gap-2">
                    <input
                      className="w-1/2 h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                      type="number"
                      placeholder="Passageiros"
                      value={formData.passengers}
                      onChange={e => setFormData({ ...formData, passengers: Number(e.target.value) })}
                    />
                    <input
                      className="w-1/2 h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                      type="number"
                      placeholder="Portas"
                      value={formData.doors}
                      onChange={e => setFormData({ ...formData, doors: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Caução Padrão (R$)</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    type="number"
                    required
                    value={formData.default_security_deposit}
                    onChange={e => setFormData({ ...formData, default_security_deposit: Number(e.target.value) })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Seguro Padrão (Total R$)</label>
                  <input
                    className="w-full h-12 rounded-lg border-gray-200 dark:border-gray-800 dark:bg-background-dark focus:ring-primary focus:border-primary text-slate-900 dark:text-white p-3"
                    type="number"
                    required
                    value={formData.default_insurance_value}
                    onChange={e => setFormData({ ...formData, default_insurance_value: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  className="px-6 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="px-8 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="animate-spin material-symbols-outlined">progress_activity</span>
                  ) : (
                    <span>{editingId ? 'Salvar Alterações' : 'Salvar Veículo'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesView;