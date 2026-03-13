"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Client, Vehicle, Reservation } from './types';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useApp } from './hooks/useApp';
import ErrorBoundary from './components/ErrorBoundary';

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

const MainContent: React.FC = () => {
  const { session, profile, isDarkMode, toggleDarkMode, logout, repairSession } = useApp();
  const [selectedVoucherRes, setSelectedVoucherRes] = useState<Reservation | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Data States
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  
  const isFetching = useRef(false);
  const fetchCount = useRef(0);

  const fetchData = useCallback(async (options: { isManual?: boolean, silent?: boolean, forceRepair?: boolean } = {}) => {
    const { isManual = false, silent = false, forceRepair = false } = options;
    
    // Se não houver usuário ou já estiver buscando, ignora
    if (!session?.user?.id || isFetching.current) return;
    
    isFetching.current = true;
    fetchCount.current += 1;
    
    if (!silent) setIsLoading(true);
    const toastId = isManual ? toast.loading(forceRepair ? 'Reparando sistema...' : 'Sincronizando...') : null;

    // Timeout de segurança para o carregamento (12 segundos)
    const fetchTimeout = setTimeout(() => {
      if (isFetching.current) {
        console.warn('[App] Fetch timeout atingido. Resetando estado.');
        setIsLoading(false);
        isFetching.current = false;
        if (isManual) toast.error('A conexão está lenta. Tente novamente.', { id: toastId || undefined });
      }
    }, 12000);

    try {
      // 1. Validação de Integridade (Verifica se o Supabase responde)
      const { error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('[App] Sessão inválida detectada:', authError);
        await repairSession();
      }

      // 2. Busca de dados em paralelo
      const [clientsRes, vehiclesRes, reservationsRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('vehicles').select('*').order('model'),
        supabase.from('reservations').select('*').order('created_at', { ascending: false })
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;
      if (reservationsRes.error) throw reservationsRes.error;

      const currentClients = clientsRes.data || [];
      const currentVehicles = vehiclesRes.data || [];
      const currentReservations = reservationsRes.data || [];

      setClients(currentClients);
      setVehicles(currentVehicles);

      // 3. Transformação de dados
      const transformed: Reservation[] = currentReservations.map((r: any) => {
        const client = currentClients.find(c => c.id === r.client_id);
        const vehicle = currentVehicles.find(v => v.id === r.vehicle_id);
        return {
          ...r,
          clientName: client?.name || 'N/A',
          vehicleModel: vehicle?.model || 'N/A',
          vehiclePlate: vehicle?.plate || '---',
          dateStr: new Date(r.created_at).toLocaleDateString('pt-BR')
        };
      });
      
      setReservations(transformed);
      
      if (isManual) toast.success('Dados sincronizados!', { id: toastId });

    } catch (error: any) {
      console.error('[App] Erro crítico no carregamento:', error);
      
      // Se falhar 3 vezes seguidas, sugere logout
      if (fetchCount.current >= 3 && !silent) {
        toast.error('Múltiplas falhas de conexão. Tente sair e entrar novamente.');
      } else {
        toast.error('Erro ao carregar dados. Verifique sua conexão.', { id: toastId || undefined });
      }
    } finally {
      clearTimeout(fetchTimeout);
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [session?.user?.id, repairSession]);

  // Efeito de carregamento inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const userRole = profile?.role || 'user';

  return (
    <Layout
      onLogout={logout}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      userProfile={profile}
      onAddReservation={() => setIsReservationModalOpen(true)}
      onViewProfile={() => setIsProfileModalOpen(true)}
    >
      <button 
        onClick={() => fetchData({ isManual: true })}
        onDoubleClick={() => fetchData({ isManual: true, forceRepair: true })}
        className="fixed bottom-6 right-6 z-50 size-12 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        title="Sincronizar (Clique duplo para reparar)"
      >
        <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">sync</span>
      </button>

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
                const { data, error } = await supabase.from('reservations').update(updates).eq('id', id).select('*');
                if (error) throw error;
                if (data && data[0]) {
                  const client = clients.find(c => c.id === data[0].client_id);
                  const vehicle = vehicles.find(v => v.id === data[0].vehicle_id);
                  const transformed = {
                    ...data[0],
                    clientName: client?.name || 'N/A',
                    vehicleModel: vehicle?.model || 'N/A',
                    vehiclePlate: vehicle?.plate || '---',
                    dateStr: new Date(data[0].created_at).toLocaleDateString('pt-BR')
                  };
                  setReservations(prev => prev.map(item => item.id === id ? transformed : item));
                }
              }}
              onAddReservation={async (r) => {
                const { data, error } = await supabase.from('reservations').insert([r]).select('*');
                if (error) throw error;
                if (data && data[0]) {
                  const client = clients.find(c => c.id === data[0].client_id);
                  const vehicle = vehicles.find(v => v.id === data[0].vehicle_id);
                  const transformed = {
                    ...data[0],
                    clientName: client?.name || 'N/A',
                    vehicleModel: vehicle?.model || 'N/A',
                    vehiclePlate: vehicle?.plate || 'N/A',
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
            const { data, error } = await supabase.from('reservations').insert([r]).select('*');
            if (error) throw error;
            if (data && data[0]) {
              const client = clients.find(c => c.id === data[0].client_id);
              const vehicle = vehicles.find(v => v.id === data[0].vehicle_id);
              const transformed = {
                ...data[0],
                clientName: client?.name || 'N/A',
                vehicleModel: vehicle?.model || 'N/A',
                vehiclePlate: vehicle?.plate || 'N/A',
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
  );
};

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, loading: authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="animate-spin material-symbols-outlined text-5xl text-primary">progress_activity</span>
          <p className="text-primary/60 font-bold animate-pulse">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useApp();

  useEffect(() => {
    if (session && window.location.pathname === '/login') {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  return (
    <>
      <Toaster position="top-right" />
      <React.Suspense fallback={
        <div className="h-full w-full flex items-center justify-center min-h-screen">
          <span className="animate-spin material-symbols-outlined text-3xl text-primary/20">progress_activity</span>
        </div>
      }>
        <Routes>
          <Route path="/login" element={
            <Login onLogin={() => navigate('/dashboard', { replace: true })} />
          } />
          <Route path="/*" element={
            <AuthGuard>
              <MainContent />
            </AuthGuard>
          } />
        </Routes>
      </React.Suspense>
    </>
  );
};

export default App;