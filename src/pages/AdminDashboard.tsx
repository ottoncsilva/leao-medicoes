<<<<<<< HEAD
import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, CalendarDays, ClipboardList, LayoutDashboard, LogOut, DollarSign, Users, CheckSquare, Clock, Menu, MapPin } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { db, auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { clientService, Client } from '../services/clientService';
import { requestService, MeasurementRequest, RequestStatus } from '../services/requestService';
import { settingsService, GlobalSettings } from '../services/settingsService';
import { blockedTimeService, BlockedTime } from '../services/blockedTimeService';
import { billingService, BillingStatus } from '../services/billingService';
import { whatsappService } from '../services/whatsappService';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Componentes modulares
import AgendaTab from '../components/admin/AgendaTab';
import RequestsTab from '../components/admin/RequestsTab';
import ClientsTab from '../components/admin/ClientsTab';
import BillingTab from '../components/admin/BillingTab';
import CompleteMeasurementsTab from '../components/admin/CompleteMeasurementsTab';
import FutureMeasurementsTab from '../components/admin/FutureMeasurementsTab';
import SettingsTab from '../components/admin/SettingsTab';
import CompleteRequestModal from '../components/admin/CompleteRequestModal';
import RescheduleModal from '../components/admin/RescheduleModal';

type Tab = 'dashboard' | 'agenda' | 'requests' | 'clients' | 'billing' | 'future' | 'settings';

const NAV_ITEMS: { key: Tab; label: string; Icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'agenda', label: 'Agenda Geral', Icon: CalendarDays },
  { key: 'requests', label: 'Solicitações', Icon: ClipboardList },
  { key: 'clients', label: 'Clientes (Lojas)', Icon: Users },
  { key: 'billing', label: 'Faturamento', Icon: DollarSign },
  { key: 'future', label: 'Medidas Futuras', Icon: Clock },
  { key: 'settings', label: 'Configurações', Icon: SettingsIcon },
];

const TAB_TITLES: Record<Tab, { title: string; sub: string }> = {
  dashboard: { title: 'Visão Geral', sub: 'Acompanhe o desempenho e as próximas medições a realizar.' },
  agenda: { title: 'Agenda Geral', sub: 'Clique em um horário para agendar uma medição. Arraste para reorganizar.' },
  requests: { title: 'Solicitações de Medição', sub: 'Aprove, peça alteração ou marque medições como realizadas.' },
  clients: { title: 'Gestão de Clientes', sub: 'Cadastre e edite lojas e defina regras de cobrança.' },
  billing: { title: 'Faturamento Mensal', sub: 'Consulte o faturamento por mês e marque como pago.' },
  future: { title: 'Medidas Futuras (Remarketing)', sub: 'Histórico de ambientes não medidos para prospecção.' },
  settings: { title: 'Configurações do Sistema', sub: 'Defina valores globais e regras gerais do sistema.' },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [requestFilter, setRequestFilter] = useState<RequestStatus | 'all'>('all');
  const [billingMonth, setBillingMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      toast.error('Erro ao sair do sistema');
    }
  };

  // Dados do Firebase
  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<MeasurementRequest[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ defaultKmPrice: 2.5 });
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);

  // Modais globais
  const [completeModalId, setCompleteModalId] = useState<string | null>(null);
  const [rescheduleModalReq, setRescheduleModalReq] = useState<MeasurementRequest | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [c, r, s, b, bs] = await Promise.all([
        clientService.getClients(),
        requestService.getRequests(),
        settingsService.getSettings(),
        blockedTimeService.getBlockedTimes(),
        billingService.getAllBillingStatus(),
      ]);
      setClients(c);
      setRequests(r.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setSettings(s);
      setBlockedTimes(b);
      setBillingStatuses(bs);

      if (s.notifyClientDayBefore) {
        const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
        for (const req of r) {
          if (req.status === 'confirmed' && req.requestedDate === tomorrowStr && !req.clientNotifiedDayBefore) {
            const client = c.find(cl => cl.id === req.clientId);
            if (client?.phone) {
              whatsappService.sendMessage(
                client.phone,
                `⏳ Olá ${client.name}!\n\nLembramos que sua medição na Leão Medições está agendada para *AMANHÃ (${format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM')})* às ${req.requestedTime}.\n\nEndereço: ${req.address}`,
                s
              );
              await requestService.updateRequestStatus(req.id!, 'confirmed', { clientNotifiedDayBefore: true });
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Dashboard data
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const mStart = startOfMonth(d), mEnd = endOfMonth(d);
    let monthTotal = 0;
    clients.forEach(client => {
      const reqs = requests.filter(r => r.clientId === client.id && r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: mStart, end: mEnd }));
      const envs = reqs.reduce((a, r) => a + r.environmentsCount, 0);
      const kms = reqs.reduce((a, r) => a + (r.kmDriven || 0), 0);
      const kP = client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice;
      if (client.model === 'por_ambiente') monthTotal += envs * client.baseValue + kms * kP;
      else if (client.model === 'pacote') { const extra = Math.max(0, envs - (client.limitEnvs || 0)); monthTotal += client.baseValue + extra * (client.baseValue / (client.limitEnvs || 1)) + kms * kP; }
      else if (client.model === 'avulso') monthTotal += reqs.length * client.baseValue + kms * kP;
    });
    return { name: format(d, 'MMM', { locale: ptBR }).toUpperCase(), Faturamento: monthTotal };
  });

  const nextAppointments = requests
    .filter(r => r.status === 'confirmed' && new Date(`${r.requestedDate}T${r.requestedTime}`) > new Date())
    .sort((a, b) => new Date(`${a.requestedDate}T${a.requestedTime}`).getTime() - new Date(`${b.requestedDate}T${b.requestedTime}`).getTime())
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row relative">
      <Toaster position="top-right" richColors />

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-blue-950 text-stone-300 flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">Leão Medições</h1>
          <p className="text-xs text-slate-500 mt-1">Painel do Gestor</p>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-2 flex md:flex-col overflow-x-auto md:overflow-visible pb-4 md:pb-0">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === key ? 'bg-blue-900 text-white' : 'hover:bg-blue-900 hover:text-white'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-900 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-blue-900 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto pb-28 md:pb-8">
        <header className="mb-6 md:mb-8">
          <h2 className="text-2xl font-bold text-slate-900">{TAB_TITLES[activeTab].title}</h2>
          <p className="text-slate-500 mt-1">{TAB_TITLES[activeTab].sub}</p>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Faturamento (Mês Atual)</p>
                    <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(chartData[5].Faturamento)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Medições Realizadas (Mês Atual)</p>
                    <h3 className="text-3xl font-bold text-slate-900">
                      {requests.filter(r => r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: startOfMonth(new Date()), end: endOfMonth(new Date()) })).length}
                    </h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Aguardando Aprovação</p>
                    <h3 className="text-3xl font-bold text-amber-600">{requests.filter(r => r.status === 'pending').length}</h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6 shrink-0">Faturamento — Últimos 6 Meses</h3>
                    <div className="h-80 w-full shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c' }} tickFormatter={v => `R$ ${v}`} />
                          <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => [formatCurrency(v), 'Faturamento']} />
                          <Bar dataKey="Faturamento" fill="#1c1917" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 shrink-0">Próximas 6 Medições</h3>
                    <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                      {nextAppointments.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-4 bg-slate-50 rounded-xl border border-slate-100">Nenhuma medição futura agendada.</p>
                      ) : (
                        nextAppointments.map(req => (
                          <div key={req.id} onClick={() => setCompleteModalId(req.id!)} className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all group flex flex-col">
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <h4 className="font-semibold text-slate-900 group-hover:text-emerald-800 line-clamp-1">{req.clientName}</h4>
                              <span className="text-xs font-medium bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
                                {format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM')} às {req.requestedTime}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1.5 text-sm text-slate-600">
                              <span className="flex items-start"><MapPin className="w-4 h-4 mr-1.5 shrink-0 mt-0.5" /><span className="line-clamp-2">{req.address}</span></span>
                              <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 shrink-0" />{req.estimatedMinutes} min • {req.environmentsCount} ambientes</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Agenda */}
            {activeTab === 'agenda' && (
              <AgendaTab
                requests={requests}
                blockedTimes={blockedTimes}
                settings={settings}
                clients={clients}
                onRefresh={fetchData}
              />
            )}

            {/* Solicitações */}
            {activeTab === 'requests' && (
              <RequestsTab
                requests={requests}
                filter={requestFilter}
                onFilterChange={setRequestFilter}
                clients={clients}
                settings={settings}
                blockedTimes={blockedTimes}
                onCompleteOpen={setCompleteModalId}
                onRescheduleOpen={setRescheduleModalReq}
                onRefresh={fetchData}
              />
            )}

            {/* Clientes */}
            {activeTab === 'clients' && (
              <ClientsTab clients={clients} settings={settings} onRefresh={fetchData} />
            )}

            {/* Faturamento */}
            {activeTab === 'billing' && (
              <BillingTab
                clients={clients}
                requests={requests}
                billingStatuses={billingStatuses}
                settings={settings}
                billingMonth={billingMonth}
                onMonthChange={setBillingMonth}
                onRefresh={fetchData}
              />
            )}

            {/* Medidas Futuras */}
            {activeTab === 'future' && <FutureMeasurementsTab requests={requests} />}

            {/* Configurações */}
            {activeTab === 'settings' && (
              <SettingsTab settings={settings} onRefresh={fetchData} />
            )}
          </>
        )
        }
      </main >

      {/* Modais Globais */}
      {
        completeModalId && (
          <CompleteRequestModal
            request={requests.find(r => r.id === completeModalId)!}
            settings={settings}
            clients={clients}
            onClose={() => setCompleteModalId(null)}
            onSuccess={fetchData}
          />
        )
      }
      {
        rescheduleModalReq && (
          <RescheduleModal
            request={rescheduleModalReq}
            settings={settings}
            clients={clients}
            onClose={() => setRescheduleModalReq(null)}
            onSuccess={fetchData}
          />
        )
      }
      {/* Bottom Navigation (Mobile) - Limitado aos 4 principais + Menu */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around px-1 py-2 z-40 pb-safe">
        {[
          { key: 'dashboard', label: 'Início', Icon: LayoutDashboard },
          { key: 'agenda', label: 'Agenda', Icon: CalendarDays },
          { key: 'requests', label: 'Pedidos', Icon: ClipboardList },
          { key: 'complete', label: 'Visitas', Icon: CheckSquare },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key as Tab); setIsMobileMenuOpen(false); }}
            className={`flex flex-col items-center justify-center py-1 flex-1 ${activeTab === key ? 'text-blue-950' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Icon className={`w-6 h-6 mb-1 ${activeTab === key ? 'fill-blue-50/50' : ''}`} />
            <span className="text-[10px] font-semibold leading-none truncate">{label}</span>
          </button>
        ))}
        {/* Botão Menu */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 flex-1 text-slate-500 hover:text-slate-900`}
        >
          <Menu className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-semibold leading-none truncate">Menu</span>
        </button>
      </nav>

      {/* Mobile Menu Drawer Modal */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay Escuro */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Menu Lateral Deslizante */}
          <div className="relative flex w-4/5 max-w-xs flex-col bg-white h-full shadow-2xl animate-in slide-in-from-right-full duration-300 ml-auto">
            <div className="p-6 bg-blue-950 text-white pb-8">
              <h2 className="text-xl font-bold">Leão Medições</h2>
              <p className="text-xs text-blue-200 mt-1">Gestão Completa</p>
            </div>

            <div className="flex-1 overflow-y-auto w-full pt-4">
              <div className="px-4 pb-4 font-semibold text-xs text-slate-400 uppercase tracking-wider">Acesso Rápido</div>
              <ul className="space-y-1">
                {NAV_ITEMS.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <button
                      onClick={() => { setActiveTab(key); setIsMobileMenuOpen(false); }}
                      className={`w-[90%] mx-auto flex items-center px-4 py-3.5 rounded-xl transition-colors font-medium text-left ${activeTab === key ? 'bg-blue-50 text-blue-950 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Icon className={`w-5 h-5 mr-3 shrink-0 ${activeTab === key ? 'text-blue-950' : 'text-slate-400'}`} />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div >
  );
}
=======
import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, CalendarDays, ClipboardList, LayoutDashboard, LogOut, DollarSign, Users, CheckSquare, Clock } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { db, auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { clientService, Client } from '../services/clientService';
import { requestService, MeasurementRequest, RequestStatus } from '../services/requestService';
import { settingsService, GlobalSettings } from '../services/settingsService';
import { blockedTimeService, BlockedTime } from '../services/blockedTimeService';
import { billingService, BillingStatus } from '../services/billingService';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Componentes modulares
import AgendaTab from '../components/admin/AgendaTab';
import RequestsTab from '../components/admin/RequestsTab';
import ClientsTab from '../components/admin/ClientsTab';
import BillingTab from '../components/admin/BillingTab';
import CompleteMeasurementsTab from '../components/admin/CompleteMeasurementsTab';
import FutureMeasurementsTab from '../components/admin/FutureMeasurementsTab';
import SettingsTab from '../components/admin/SettingsTab';
import CompleteRequestModal from '../components/admin/CompleteRequestModal';
import RescheduleModal from '../components/admin/RescheduleModal';

type Tab = 'dashboard' | 'agenda' | 'requests' | 'complete' | 'clients' | 'billing' | 'future' | 'settings';

const NAV_ITEMS: { key: Tab; label: string; Icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'agenda', label: 'Agenda Geral', Icon: CalendarDays },
  { key: 'requests', label: 'Solicitações', Icon: ClipboardList },
  { key: 'complete', label: 'Completar Visita', Icon: CheckSquare },
  { key: 'clients', label: 'Clientes (Lojas)', Icon: Users },
  { key: 'billing', label: 'Faturamento', Icon: DollarSign },
  { key: 'future', label: 'Medidas Futuras', Icon: Clock },
  { key: 'settings', label: 'Configurações', Icon: SettingsIcon },
];

const TAB_TITLES: Record<Tab, { title: string; sub: string }> = {
  dashboard: { title: 'Visão Geral', sub: 'Acompanhe o desempenho e faturamento dos últimos 6 meses.' },
  agenda: { title: 'Agenda Geral', sub: 'Clique em um horário para agendar uma medição. Arraste para reorganizar.' },
  requests: { title: 'Solicitações de Medição', sub: 'Aprove, peça alteração ou marque medições como realizadas.' },
  complete: { title: 'Completar Medições', sub: 'Confirme os ambientes medidos presencialmente na visita.' },
  clients: { title: 'Gestão de Clientes', sub: 'Cadastre e edite lojas e defina regras de cobrança.' },
  billing: { title: 'Faturamento Mensal', sub: 'Consulte o faturamento por mês e marque como pago.' },
  future: { title: 'Medidas Futuras (Remarketing)', sub: 'Histórico de ambientes não medidos para prospecção.' },
  settings: { title: 'Configurações do Sistema', sub: 'Defina valores globais e regras gerais do sistema.' },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [requestFilter, setRequestFilter] = useState<RequestStatus | 'all'>('all');
  const [billingMonth, setBillingMonth] = useState(format(new Date(), 'yyyy-MM'));
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      toast.error('Erro ao sair do sistema');
    }
  };

  // Dados do Firebase
  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<MeasurementRequest[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ defaultKmPrice: 2.5 });
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);

  // Modais globais
  const [completeModalId, setCompleteModalId] = useState<string | null>(null);
  const [rescheduleModalReq, setRescheduleModalReq] = useState<MeasurementRequest | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [c, r, s, b, bs] = await Promise.all([
        clientService.getClients(),
        requestService.getRequests(),
        settingsService.getSettings(),
        blockedTimeService.getBlockedTimes(),
        billingService.getAllBillingStatus(),
      ]);
      setClients(c);
      setRequests(r.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setSettings(s);
      setBlockedTimes(b);
      setBillingStatuses(bs);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Dashboard data
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const mStart = startOfMonth(d), mEnd = endOfMonth(d);
    let monthTotal = 0;
    clients.forEach(client => {
      const reqs = requests.filter(r => r.clientId === client.id && r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: mStart, end: mEnd }));
      const envs = reqs.reduce((a, r) => a + r.environmentsCount, 0);
      const kms = reqs.reduce((a, r) => a + (r.kmDriven || 0), 0);
      const kP = client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice;
      if (client.model === 'por_ambiente') monthTotal += envs * client.baseValue + kms * kP;
      else if (client.model === 'pacote') { const extra = Math.max(0, envs - (client.limitEnvs || 0)); monthTotal += client.baseValue + extra * (client.baseValue / (client.limitEnvs || 1)) + kms * kP; }
      else if (client.model === 'avulso') monthTotal += reqs.length * client.baseValue + kms * kP;
    });
    return { name: format(d, 'MMM', { locale: ptBR }).toUpperCase(), Faturamento: monthTotal };
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row relative">
      <Toaster position="top-right" richColors />

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-blue-950 text-stone-300 flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">Leão Medições</h1>
          <p className="text-xs text-slate-500 mt-1">Painel do Gestor</p>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-2 flex md:flex-col overflow-x-auto md:overflow-visible pb-4 md:pb-0">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === key ? 'bg-blue-900 text-white' : 'hover:bg-blue-900 hover:text-white'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-900 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-blue-900 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto pb-24 md:pb-8">
        <header className="mb-6 md:mb-8">
          <h2 className="text-2xl font-bold text-slate-900">{TAB_TITLES[activeTab].title}</h2>
          <p className="text-slate-500 mt-1">{TAB_TITLES[activeTab].sub}</p>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Faturamento (Mês Atual)</p>
                    <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(chartData[5].Faturamento)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Medições Realizadas (Mês Atual)</p>
                    <h3 className="text-3xl font-bold text-slate-900">
                      {requests.filter(r => r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: startOfMonth(new Date()), end: endOfMonth(new Date()) })).length}
                    </h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-500 mb-1">Aguardando Aprovação</p>
                    <h3 className="text-3xl font-bold text-amber-600">{requests.filter(r => r.status === 'pending').length}</h3>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-6">Faturamento — Últimos 6 Meses</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c' }} tickFormatter={v => `R$ ${v}`} />
                        <Tooltip cursor={{ fill: '#f5f5f4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => [formatCurrency(v), 'Faturamento']} />
                        <Bar dataKey="Faturamento" fill="#1c1917" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Agenda */}
            {activeTab === 'agenda' && (
              <AgendaTab
                requests={requests}
                blockedTimes={blockedTimes}
                settings={settings}
                clients={clients}
                onRefresh={fetchData}
              />
            )}

            {/* Solicitações */}
            {activeTab === 'requests' && (
              <RequestsTab
                requests={requests}
                filter={requestFilter}
                onFilterChange={setRequestFilter}
                clients={clients}
                settings={settings}
                onCompleteOpen={setCompleteModalId}
                onRescheduleOpen={setRescheduleModalReq}
                onRefresh={fetchData}
              />
            )}

            {/* Completar Visitas */}
            {activeTab === 'complete' && <CompleteMeasurementsTab requests={requests} clients={clients} onUpdate={fetchData} />}

            {/* Clientes */}
            {activeTab === 'clients' && (
              <ClientsTab clients={clients} settings={settings} onRefresh={fetchData} />
            )}

            {/* Faturamento */}
            {activeTab === 'billing' && (
              <BillingTab
                clients={clients}
                requests={requests}
                billingStatuses={billingStatuses}
                settings={settings}
                billingMonth={billingMonth}
                onMonthChange={setBillingMonth}
                onRefresh={fetchData}
              />
            )}

            {/* Medidas Futuras */}
            {activeTab === 'future' && <FutureMeasurementsTab requests={requests} />}

            {/* Configurações */}
            {activeTab === 'settings' && (
              <SettingsTab settings={settings} onRefresh={fetchData} />
            )}
          </>
        )
        }
      </main >

      {/* Modais Globais */}
      {
        completeModalId && (
          <CompleteRequestModal
            requestId={completeModalId}
            onClose={() => setCompleteModalId(null)}
            onSuccess={fetchData}
          />
        )
      }
      {
        rescheduleModalReq && (
          <RescheduleModal
            request={rescheduleModalReq}
            settings={settings}
            clients={clients}
            onClose={() => setRescheduleModalReq(null)}
            onSuccess={fetchData}
          />
        )
      }
      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between px-2 py-2 z-50">
        {NAV_ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-col items-center justify-center w-full py-1 ${activeTab === key ? 'text-blue-950' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Icon className={`w-5 h-5 mb-1 ${activeTab === key ? 'text-blue-950' : ''}`} />
            <span className="text-[10px] font-medium leading-none truncate max-w-[60px]">{label}</span>
          </button>
        ))}
      </nav>

    </div >
  );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
