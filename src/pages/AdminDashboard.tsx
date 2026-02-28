import { useState, useEffect } from 'react';
import { CalendarDays, Users, FileText, Settings, LogOut, LayoutDashboard, CalendarIcon } from 'lucide-react';
import { clientService, Client } from '../services/clientService';
import { requestService, MeasurementRequest, RequestStatus } from '../services/requestService';
import { settingsService, GlobalSettings } from '../services/settingsService';
import { blockedTimeService, BlockedTime } from '../services/blockedTimeService';
import { billingService, BillingStatus } from '../services/billingService';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Toaster } from 'sonner';

// Componentes modulares
import AgendaTab from '../components/admin/AgendaTab';
import RequestsTab from '../components/admin/RequestsTab';
import ClientsTab from '../components/admin/ClientsTab';
import BillingTab from '../components/admin/BillingTab';
import SettingsTab from '../components/admin/SettingsTab';
import CompleteRequestModal from '../components/admin/CompleteRequestModal';
import RescheduleModal from '../components/admin/RescheduleModal';

type Tab = 'dashboard' | 'agenda' | 'requests' | 'clients' | 'billing' | 'settings';

const NAV_ITEMS: { key: Tab; label: string; Icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'agenda', label: 'Agenda Geral', Icon: CalendarDays },
  { key: 'requests', label: 'Solicitações', Icon: CalendarIcon },
  { key: 'clients', label: 'Clientes (Lojas)', Icon: Users },
  { key: 'billing', label: 'Faturamento', Icon: FileText },
  { key: 'settings', label: 'Configurações', Icon: Settings },
];

const TAB_TITLES: Record<Tab, { title: string; sub: string }> = {
  dashboard: { title: 'Visão Geral', sub: 'Acompanhe o desempenho e faturamento dos últimos 6 meses.' },
  agenda: { title: 'Agenda Geral', sub: 'Clique em um horário para agendar uma medição. Arraste para reorganizar.' },
  requests: { title: 'Solicitações de Medição', sub: 'Aprove, peça alteração ou marque medições como realizadas.' },
  clients: { title: 'Gestão de Clientes', sub: 'Cadastre e edite lojas e defina regras de cobrança.' },
  billing: { title: 'Faturamento Mensal', sub: 'Consulte o faturamento por mês e marque como pago.' },
  settings: { title: 'Configurações do Sistema', sub: 'Defina valores globais e regras gerais do sistema.' },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [requestFilter, setRequestFilter] = useState<RequestStatus | 'all'>('all');
  const [billingMonth, setBillingMonth] = useState(format(new Date(), 'yyyy-MM'));

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
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-blue-900 hover:text-white transition-colors">
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
