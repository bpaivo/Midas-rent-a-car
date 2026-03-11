"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

const App: React.FC = () => {
  const { session, profile, isDarkMode, toggleDarkMode, logout, loading: authLoading } = useApp();
  const [selectedVoucherRes, setSelectedVoucherRes] = useState<Reservation | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Data States
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const fetchData = useCallback(async (isManual = false) => {
    if (!session?.user?.id) return;
    
    if (isManual) toast.loading('Sincronizando dados...', { id: 'sync' });
    setIsLoading(true);

    console.log('[App] Iniciando sincronização definitiva...');

    try {
      // 1. Buscar Clientes
      const { data: clientsData, error: clientsErr } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      
      if (clientsErr) console.error('[App] Erro Clientes:', clientsErr);
      const currentClients = clientsData || [];
      setClients(currentClients);

      // 2. Buscar Veículos
      const { data: vehiclesData, error: vehiclesErr } = await supabase
        .from('vehicles')
        .select('*')
        .order('model', { ascending: true });
      
      if (vehiclesErr) console.error('[App] Erro Veículos:', vehiclesErr);
      const currentVehicles = vehiclesData || [];
      setVehicles(currentVehicles);

      // 3. Buscar Reservas (Sem joins complexos para evitar erros de schema)
      const { data: resData, error: resErr } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (resErr) console.error('[App] Erro Reservas:', resErr);
      
      if (resData) {
        // Cruzamento de dados em memória (mais seguro)
        const transformed: Reservation[] = resData.map((r: any) => {
          const client = currentClients.find(c => c.id === r.client_id);
          const vehicle = currentVehicles.find(v => v.id === r.vehicle_id);
          return {
            ...r,
            clientName: client?.name || 'Cliente não encontrado',
            vehicleModel: vehicle?.model || 'Veículo não encontrado',
            vehiclePlate: vehicle?.plate || '---',
            dateStr: new Date(r.created_at).toLocaleDateString('pt-BR')
          };
        });
        setReservations(transformed);
      }

      if (isManual) toast.success('Dados carregados!', { id: 'sync' });
    } catch (error) {
      console.error('[App] Erro fatal no carregamento:', error);
      if (isManual) toast.error('Erro ao conectar com o banco.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id, fetchData]);

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
            {/* Botão de Sincronização Manual */}
            <button 
              onClick={() => fetchData(true)}
              className="fixed bottom-6 right-6 z-50 size-12 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
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
                      const { data, error } = await supabase
                        .from('reservations')
                        .update(updates)
                        .eq('id', id)
                        .select('*');
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
                        setReservations(prev => prev.map(item => item.id === id ? transformed : item));
                      }
                    }}
                    onAddReservation={async (r) => {
                      const { data, error } = await supabase
                        .from('reservations')
                        .insert([r])
                        .select('*');
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
                  const { data, error } = await supabase
                    .from('reservations')
                    .insert([r])
                    .select('*');
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
        </React.Suspense>
      </Router>
    </>
  );
};

export default App;