import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Client, Vehicle, Reservation } from './types';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useApp } from './hooks/useApp';
import ErrorBoundary from './components/ErrorBoundary';
import { retryAsync } from './utils/retry';

// Lazy Views
const Login = React.lazy(() => import('./views/Login'));
const Dashboard = React.lazy(() => import('./views/Dashboard'));
const ClientsView = React.lazy(() => import('./views/ClientsView'));
const VehiclesView = React.lazy(() => import('./views/VehiclesView'));
const ReservationsView = React.lazy(() => import('./views/ReservationsView'));
const UsersView = React.lazy(() => import('./views/UsersView'));

// Components
import Layout from './components/Layout';
import VoucherModal from './components/VoucherModal';
import ReservationModal from './components/ReservationModal';
import ProfileModal from './components/ProfileModal';

const App: React.FC = () => {
  const { session, profile, isDarkMode, toggleDarkMode, logout, loading: authLoading } = useApp();
  const [selectedVoucherRes, setSelectedVoucherRes] = useState<Reservation | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Data States
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Fetch Data when session exists - Dependency narrowed to user.id
  useEffect(() => {
    if (session?.user?.id) {
      console.log('[App] Sessão detectada para usuário:', session.user.id);
      fetchData();
    }
  }, [session?.user?.id]);

  const fetchClients = async () => {
    try {
      const data = await retryAsync(async () => {
        const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      });
      if (data) setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes.');
    }
  };

  const fetchVehicles = async () => {
    try {
      const data = await retryAsync(async () => {
        const { data, error } = await supabase.from('vehicles').select('*').order('model', { ascending: true });
        if (error) throw error;
        return data;
      });
      if (data) setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erro ao carregar frota.');
    }
  };

  const fetchReservations = async () => {
    try {
      const data = await retryAsync(async () => {
        const { data, error } = await supabase
          .from('reservations')
          .select('*, clients(name), vehicles(model, plate)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      });

      if (data) {
        const transformed: Reservation[] = data.map((r: any) => ({
          ...r,
          clientName: r.clients?.name || 'N/A',
          vehicleModel: r.vehicles?.model || 'N/A',
          vehiclePlate: r.vehicles?.plate || 'N/A',
          dateStr: new Date(r.created_at).toLocaleDateString('pt-BR')
        }));
        setReservations(transformed);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Erro ao carregar reservas.');
    }
  };

  const fetchData = async (isManualRefresh = false) => {
    // Só mostramos o loading global se for a primeira carga ou um refresh manual
    if (hasInitialLoaded && !isManualRefresh) {
      // Se já carregou uma vez e não é refresh manual, busca em background
      console.log('[App] Atualizando dados em background...');
      try {
        await Promise.all([
          fetchClients(),
          fetchVehicles(),
          fetchReservations()
        ]);
      } catch (error) {
        console.error('Background fetch error:', error);
      }
      return;
    }

    setIsLoading(true);
    try {
      console.log('[App] Executando carga inicial de dados...');
      await Promise.all([
        fetchClients(),
        fetchVehicles(),
        fetchReservations()
      ]);
      setHasInitialLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  if (!session) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
          <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
        </div>
      }>
        <Login onLogin={() => { }} />
      </React.Suspense>
    );
  }

  const userRole = profile?.role || 'user';

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Router>
        <React.Suspense fallback={
          <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
            <span className="animate-spin material-symbols-outlined text-4xl text-primary">progress_activity</span>
          </div>
        }>
          <Layout
            onLogout={logout}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            userProfile={profile}
            onAddReservation={() => setIsReservationModalOpen(true)}
            onViewProfile={() => setIsProfileModalOpen(true)}
          >
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={
                  <Dashboard
                    isLoading={isLoading}
                    stats={{
                      available: vehicles.filter(v => v.status === 'Disponível').length,
                      rented: vehicles.filter(v => v.status === 'Alugado').length,
                      total: vehicles.filter(v => v.status !== 'Desativado').length,
                      maintenance: vehicles.filter(v => v.status === 'Em manutenção').length
                    }}
                    recentReservations={reservations.slice(0, 4)}
                  />
                } />
                <Route path="/clients" element={
                  <ClientsView
                    clients={clients}
                    isLoading={isLoading}
                    onAddClient={async (c) => {
                      const tempId = crypto.randomUUID();
                      const optimisticItem = { ...c, id: tempId } as Client;
                      setClients(prev => [optimisticItem, ...prev]);

                      try {
                        const { data, error } = await supabase.from('clients').insert([c]).select().single();
                        if (error) throw error;
                        if (data) {
                          setClients(prev => prev.map(item => item.id === tempId ? data : item));
                          toast.success('Cliente cadastrado com sucesso!');
                        }
                      } catch (err: any) {
                        setClients(prev => prev.filter(item => item.id !== tempId));
                        console.error('Error adding client:', err);
                        toast.error(`Erro ao salvar cliente: ${err.message || 'Erro desconhecido'}`);
                      }
                    }}
                    onUpdateClient={async (id, c) => {
                      const original = clients.find(item => item.id === id);
                      setClients(prev => prev.map(item => item.id === id ? { ...item, ...c } as Client : item));

                      try {
                        const { data, error } = await supabase.from('clients').update(c).eq('id', id).select().single();
                        if (error) throw error;
                        if (data) {
                          setClients(prev => prev.map(item => item.id === id ? data : item));
                          toast.success('Dados do cliente atualizados!');
                        }
                      } catch (err: any) {
                        if (original) {
                          setClients(prev => prev.map(item => item.id === id ? original : item));
                        }
                        console.error('Error updating client:', err);
                        toast.error(`Erro ao atualizar cliente: ${err.message || 'Erro desconhecido'}`);
                      }
                    }}
                    onDeleteClient={async (id) => {
                      const original = [...clients];
                      setClients(prev => prev.filter(item => item.id !== id));

                      try {
                        const { error } = await supabase.from('clients').update({ status: 'Pendente' }).eq('id', id);
                        if (error) throw error;
                        toast.success('Cliente removido com sucesso!');
                      } catch (err: any) {
                        setClients(original);
                        console.error('Erro ao excluir cliente:', err);
                        toast.error(`Erro ao excluir cliente: ${err.message || 'Verifique reservas vinculadas.'}`);
                      }
                    }}
                  />
                } />
                <Route path="/vehicles" element={
                  <VehiclesView
                    vehicles={vehicles}
                    isLoading={isLoading}
                    onAddVehicle={async (v) => {
                      const tempId = crypto.randomUUID();
                      const optimisticItem = { ...v, id: tempId } as Vehicle;
                      setVehicles(prev => [optimisticItem, ...prev]);

                      try {
                        const { data, error } = await supabase.from('vehicles').insert(v).select().single();
                        if (error) throw error;
                        if (data) {
                          setVehicles(prev => prev.map(item => item.id === tempId ? data : item));
                          toast.success('Veículo adicionado com sucesso!');
                        }
                      } catch (err: any) {
                        setVehicles(prev => prev.filter(item => item.id !== tempId));
                        console.error('Erro ao salvar veículo:', err);
                        toast.error('Erro ao salvar veículo.');
                      }
                    }}
                    onUpdateVehicle={async (id, v) => {
                      const original = vehicles.find(item => item.id === id);
                      setVehicles(prev => prev.map(item => item.id === id ? { ...v, id } as Vehicle : item));

                      try {
                        const { data, error } = await supabase.from('vehicles').update(v).eq('id', id).select().single();
                        if (error) throw error;
                        if (data) {
                          setVehicles(prev => prev.map(item => item.id === id ? data : item));
                          toast.success('Veículo atualizado!');
                        }
                      } catch (err) {
                        if (original) {
                          setVehicles(prev => prev.map(item => item.id === id ? original : item));
                        }
                        console.error('Erro ao atualizar veículo:', err);
                        toast.error('Erro ao atualizar veículo.');
                      }
                    }}
                    onDeleteVehicle={async (id) => {
                      const original = [...vehicles];
                      setVehicles(prev => prev.filter(item => item.id !== id));

                      try {
                        const { error } = await supabase.from('vehicles').update({ status: 'Desativado' }).eq('id', id);
                        if (error) throw error;
                        toast.success('Veículo inativado com sucesso!');
                      } catch (err: any) {
                        setVehicles(original);
                        console.error('Erro ao excluir veículo:', err);
                        toast.error(`Erro ao excluir veículo: ${err.message || 'Erro desconhecido'}`);
                      }
                    }}
                  />
                } />
                <Route path="/reservations" element={
                  <ReservationsView
                    reservations={reservations}
                    isLoading={isLoading}
                    onEmitVoucher={setSelectedVoucherRes}
                    onUpdateReservation={async (id, updates) => {
                      try {
                        const { error } = await supabase.from('reservations').update(updates).eq('id', id);
                        if (error) throw error;
                        await fetchReservations();
                        toast.success('Reserva atualizada com sucesso!');
                      } catch (err) {
                        console.error('Error updating reservation:', err);
                        toast.error('Erro ao atualizar reserva.');
                      }
                    }}
                    onAddReservation={async (r) => {
                      const tempId = crypto.randomUUID();
                      const optimisticItem = {
                        ...r,
                        id: tempId,
                        clientName: clients.find(c => c.id === r.client_id)?.name || '...',
                        vehicleModel: vehicles.find(v => v.id === r.vehicle_id)?.model || '...',
                        vehiclePlate: vehicles.find(v => v.id === r.vehicle_id)?.plate || '...',
                        dateStr: new Date().toLocaleDateString('pt-BR')
                      } as Reservation;
                      setReservations(prev => [optimisticItem, ...prev]);

                      try {
                        const { data, error } = await supabase.from('reservations').insert([r]).select().single();
                        if (error) throw error;
                        if (data) {
                          await fetchReservations();
                          toast.success('Reserva criada com sucesso!');
                        }
                      } catch (err) {
                        setReservations(prev => prev.filter(item => item.id !== tempId));
                        console.error('Error adding reservation:', err);
                        toast.error('Erro ao criar reserva.');
                      }
                    }}
                    onDeleteReservation={async (id) => {
                      const original = [...reservations];
                      setReservations(prev => prev.filter(item => item.id !== id));

                      try {
                        const { error } = await supabase.from('reservations').delete().eq('id', id);
                        if (error) throw error;
                        toast.success('Reserva excluída com sucesso!');
                      } catch (err: any) {
                        setReservations(original);
                        console.error('Error deleting reservation:', err);
                        toast.error(`Erro ao excluir reserva: ${err.message || 'Erro desconhecido'}`);
                      }
                    }}
                  />
                } />

                <Route
                  path="/users"
                  element={userRole === 'admin' ? <UsersView /> : <Navigate to="/dashboard" replace />}
                />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </ErrorBoundary>

            {selectedVoucherRes && (
              <VoucherModal
                reservation={selectedVoucherRes}
                client={clients.find(c => c.id === selectedVoucherRes.client_id)}
                vehicle={vehicles.find(v => v.id === selectedVoucherRes.vehicle_id)}
                onClose={() => setSelectedVoucherRes(null)}
              />
            )}

            {isReservationModalOpen && (
              <ReservationModal
                clients={clients}
                vehicles={vehicles}
                onClose={() => setIsReservationModalOpen(false)}
                onSave={async (newRes) => {
                  try {
                    const { error } = await supabase.from('reservations').insert([newRes]);
                    if (error) throw error;
                    await fetchReservations();
                    toast.success('Reserva confirmada!');
                  } catch (error) {
                    console.error('Error saving reservation:', error);
                    toast.error('Erro ao confirmar reserva.');
                  }
                }}
              />
            )}

            {isProfileModalOpen && (
              <ProfileModal
                userProfile={profile}
                onClose={() => setIsProfileModalOpen(false)}
              />
            )}
          </Layout>
        </React.Suspense>
      </Router>
    </>
  );
};

export default App;
