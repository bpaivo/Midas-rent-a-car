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

  // Fetch Data when session exists
  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setClients(data || []);
      return data;
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes: ' + error.message);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase.from('vehicles').select('*').order('model', { ascending: true });
      if (error) throw error;
      setVehicles(data || []);
      return data;
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erro ao carregar veículos: ' + error.message);
    }
  };

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, clients(name), vehicles(model, plate)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (data) {
        const transformed: Reservation[] = data.map((r: any) => ({
          ...r,
          clientName: r.clients?.name || 'N/A',
          vehicleModel: r.vehicles?.model || 'N/A',
          vehiclePlate: r.vehicles?.plate || 'N/A',
          dateStr: new Date(r.created_at).toLocaleDateString('pt-BR')
        }));
        setReservations(transformed);
        return transformed;
      }
    } catch (error: any) {
      console.error('Error fetching reservations:', error);
      toast.error('Erro ao carregar reservas: ' + error.message);
    }
  };

  const fetchData = async (isManualRefresh = false) => {
    if (hasInitialLoaded && !isManualRefresh) {
      Promise.all([fetchClients(), fetchVehicles(), fetchReservations()]);
      return;
    }

    setIsLoading(true);
    try {
      // Usando retryAsync para garantir que a conexão seja estabelecida
      await retryAsync(async () => {
        await Promise.all([fetchClients(), fetchVehicles(), fetchReservations()]);
      }, 3, 1000);
      
      setHasInitialLoaded(true);
    } catch (error) {
      console.error('Erro crítico na carga inicial:', error);
      toast.error('Falha na conexão com o banco de dados. Tente recarregar a página.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="animate-spin material-symbols-outlined text-5xl text-primary">progress_activity</span>
          <p className="text-primary/60 font-bold animate-pulse">Iniciando Midas...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <React.Suspense fallback={null}>
        <Login onLogin={() => { }} />
      </React.Suspense>
    );
  }

  const userRole = profile?.role || 'user';

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <React.Suspense fallback={
          <div className="h-full w-full flex items-center justify-center">
            <span className="animate-spin material-symbols-outlined text-3xl text-primary/20">progress_activity</span>
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
                      const { data, error } = await supabase.from('clients').insert([c]).select();
                      if (error) throw error;
                      if (data && data[0]) setClients(prev => [data[0], ...prev]);
                    }}
                    onUpdateClient={async (id, c) => {
                      const { data, error } = await supabase.from('clients').update(c).eq('id', id).select();
                      if (error) throw error;
                      if (data && data[0]) setClients(prev => prev.map(item => item.id === id ? data[0] : item));
                    }}
                    onDeleteClient={async (id) => {
                      const { error } = await supabase.from('clients').delete().eq('id', id);
                      if (error) throw error;
                      setClients(prev => prev.filter(item => item.id !== id));
                    }}
                  />
                } />
                <Route path="/vehicles" element={
                  <VehiclesView
                    vehicles={vehicles}
                    isLoading={isLoading}
                    onAddVehicle={async (v) => {
                      const { data, error } = await supabase.from('vehicles').insert([v]).select();
                      if (error) throw error;
                      if (data && data[0]) setVehicles(prev => [data[0], ...prev]);
                    }}
                    onUpdateVehicle={async (id, v) => {
                      const { data, error } = await supabase.from('vehicles').update(v).eq('id', id).select();
                      if (error) throw error;
                      if (data && data[0]) setVehicles(prev => prev.map(item => item.id === id ? data[0] : item));
                    }}
                    onDeleteVehicle={async (id) => {
                      const { error } = await supabase.from('vehicles').delete().eq('id', id);
                      if (error) throw error;
                      setVehicles(prev => prev.filter(item => item.id !== id));
                    }}
                  />
                } />
                <Route path="/reservations" element={
                  <ReservationsView
                    reservations={reservations}
                    isLoading={isLoading}
                    onEmitVoucher={setSelectedVoucherRes}
                    onUpdateReservation={async (id, updates) => {
                      const { data, error } = await supabase
                        .from('reservations')
                        .update(updates)
                        .eq('id', id)
                        .select('*, clients(name), vehicles(model, plate)');
                      if (error) throw error;
                      if (data && data[0]) {
                        const transformed = {
                          ...data[0],
                          clientName: data[0].clients?.name || 'N/A',
                          vehicleModel: data[0].vehicles?.model || 'N/A',
                          vehiclePlate: data[0].vehicles?.plate || 'N/A',
                          dateStr: new Date(data[0].created_at).toLocaleDateString('pt-BR')
                        };
                        setReservations(prev => prev.map(item => item.id === id ? transformed : item));
                      }
                    }}
                    onAddReservation={async (r) => {
                      const { data, error } = await supabase
                        .from('reservations')
                        .insert([r])
                        .select('*, clients(name), vehicles(model, plate)');
                      if (error) throw error;
                      if (data && data[0]) {
                        const transformed = {
                          ...data[0],
                          clientName: data[0].clients?.name || 'N/A',
                          vehicleModel: data[0].vehicles?.model || 'N/A',
                          vehiclePlate: data[0].vehicles?.plate || 'N/A',
                          dateStr: new Date(data[0].created_at).toLocaleDateString('pt-BR')
                        };
                        setReservations(prev => [transformed, ...prev]);
                      }
                    }}
                    onDeleteReservation={async (id) => {
                      const { error } = await supabase.from('reservations').delete().eq('id', id);
                      if (error) throw error;
                      setReservations(prev => prev.filter(item => item.id !== id));
                    }}
                  />
                } />
                <Route path="/users" element={userRole === 'admin' ? <UsersView /> : <Navigate to="/dashboard" replace />} />
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
                onSave={async (r) => {
                  const { data, error } = await supabase
                    .from('reservations')
                    .insert([r])
                    .select('*, clients(name), vehicles(model, plate)');
                  if (error) throw error;
                  if (data && data[0]) {
                    const transformed = {
                      ...data[0],
                      clientName: data[0].clients?.name || 'N/A',
                      vehicleModel: data[0].vehicles?.model || 'N/A',
                      vehiclePlate: data[0].vehicles?.plate || 'N/A',
                      dateStr: new Date(data[0].created_at).toLocaleDateString('pt-BR')
                    };
                    setReservations(prev => [transformed, ...prev]);
                    toast.success('Reserva confirmada!');
                    setIsReservationModalOpen(false);
                  }
                }}
              />
            )}

            {isProfileModalOpen && (
              <ProfileModal userProfile={profile} onClose={() => setIsProfileModalOpen(false)} />
            )}
          </Layout>
        </React.Suspense>
      </Router>
    </>
  );
};

export default App;