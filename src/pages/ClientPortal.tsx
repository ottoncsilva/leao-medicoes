import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Clock, ChevronRight, CheckCircle2, ArrowLeft, LogOut, FileText, LayoutDashboard, Plus, Loader2, Building2, User, Phone } from 'lucide-react';
import { format, parse, startOfWeek, getDay, addMinutes, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { requestService, MeasurementRequest, Environment } from '../services/requestService';
import { blockedTimeService, BlockedTime } from '../services/blockedTimeService';
import { billingService, BillingStatus } from '../services/billingService';
import { settingsService, GlobalSettings, FIXED_HOLIDAYS } from '../services/settingsService';
import { Client } from '../services/clientService';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { pdf } from '@react-pdf/renderer';
import { Toaster, toast } from 'sonner';
import { ClientBillingPDF } from '../components/admin/ClientBillingModal';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const PT_BR_MESSAGES = {
  next: 'Próximo', previous: 'Anterior', today: 'Hoje', month: 'Mês', week: 'Semana',
  day: 'Dia', agenda: 'Agenda', date: 'Data', time: 'Hora', event: 'Evento',
  noEventsInRange: 'Não há agendamentos neste período.',
  showMore: (total: number) => `+ ${total} mais`,
};

interface AddressForm {
  zipCode: string; street: string; number: string; complement: string;
  neighborhood: string; city: string; state: string;
  condominiumName: string; contactName: string; contactPhone: string;
}

export default function ClientPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('new_request');
  const [step, setStep] = useState(1);
  const [environmentsList, setEnvironmentsList] = useState<Environment[]>([]);
  const [envInput, setEnvInput] = useState('');
  const [projectName, setProjectName] = useState('');
  const [address, setAddress] = useState<AddressForm>({
    zipCode: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '', condominiumName: '',
    contactName: '', contactPhone: ''
  });
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const [clientData, setClientData] = useState<Client | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [requests, setRequests] = useState<MeasurementRequest[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ defaultKmPrice: 2.5 });
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);
  const [calendarView, setCalendarView] = useState<View>(Views.WEEK);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [editingRequest, setEditingRequest] = useState<MeasurementRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingMonth, setBillingMonth] = useState(format(new Date(), 'yyyy-MM'));

  const minutesPerEnv = settings.minutesPerEnvironment ?? 30;
  const estimatedTime = Math.max(1, environmentsList.length) * minutesPerEnv;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'clients'), where('contact', '==', user.email));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            setClientData({ id: doc.id, ...doc.data() } as Client);
          } else {
            await signOut(auth); navigate('/login');
          }
        } catch (error) { console.error('Erro ao buscar dados do cliente:', error); }
      } else { navigate('/login'); }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => { if (clientData) fetchData(); }, [clientData]);

  const fetchData = async () => {
    try {
      const [allRequests, allBlocked, fetchedSettings, fetchedBilling] = await Promise.all([
        requestService.getRequests(), blockedTimeService.getBlockedTimes(),
        settingsService.getSettings(), billingService.getAllBillingStatus(),
      ]);
      setRequests(allRequests.filter(r => r.status !== 'rejected'));
      setBlockedTimes(allBlocked);
      setSettings(fetchedSettings);
      setBillingStatuses(fetchedBilling);
    } catch (error) { console.error('Erro ao buscar dados:', error); }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    setAddress(prev => ({ ...prev, zipCode: e.target.value }));
    if (cep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setAddress(prev => ({ ...prev, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }));
        } else { toast.error('CEP não encontrado.'); }
      } catch { toast.error('Erro ao buscar CEP.'); } finally { setIsLoadingCep(false); }
    }
  };

  const checkIsHoliday = (date: Date) => {
    const currentYear = date.getFullYear();
    const allHolidays = [...FIXED_HOLIDAYS.map(h => ({ ...h, type: 'fixed' as const })), ...(settings.customHolidays || [])];
    return allHolidays.find(holiday => {
      let dateStr = holiday.date;
      if (holiday.type === 'fixed') dateStr = `${currentYear}-${holiday.date}`;
      const hDate = new Date(`${dateStr}T12:00:00`);
      return hDate.getDate() === date.getDate() && hDate.getMonth() === date.getMonth() && hDate.getFullYear() === date.getFullYear();
    });
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    if (slotInfo.start < new Date()) { toast.error('Não é possível agendar no passado.'); return; }
    const dayOfWeek = slotInfo.start.getDay();
    if (dayOfWeek === 0 && !settings.workOnSundays) { toast.error('Não atendemos aos domingos.'); return; }
    if (dayOfWeek === 6 && !settings.workOnSaturdays) { toast.error('Não atendemos aos sábados.'); return; }
    const holiday = checkIsHoliday(slotInfo.start);
    if (holiday) { toast.error(`Feriado: ${holiday.name}. Escolha outro dia.`); return; }

    const end = addMinutes(slotInfo.start, estimatedTime);
    const hasConflict = [...requests, ...blockedTimes].some(event => {
      let eventStart: Date, eventEnd: Date;
      if ('requestedDate' in event) { eventStart = new Date(`${event.requestedDate}T${event.requestedTime}:00`); eventEnd = addMinutes(eventStart, event.estimatedMinutes); }
      else { eventStart = new Date(event.start); eventEnd = new Date(event.end); }
      return slotInfo.start < eventEnd && end > eventStart;
    });
    if (hasConflict) { toast.error('Conflito de horário! Já existe um agendamento neste período.'); return; }
    setSelectedSlot({ start: slotInfo.start, end });
  };

  const handleSchedule = async () => {
    if (!selectedSlot || !clientData?.id) return;
    if (!address.number) { toast.error('Informe ao menos o número do endereço.'); return; }
    setIsSubmitting(true);
    try {
      const fullAddress = `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}, ${address.neighborhood}, ${address.city} - ${address.state}, CEP: ${address.zipCode}`;
      const sharedData = {
        projectName, address: fullAddress,
        zipCode: address.zipCode, street: address.street, number: address.number,
        complement: address.complement, neighborhood: address.neighborhood,
        city: address.city, state: address.state,
        condominiumName: address.condominiumName,
        contactName: address.contactName, contactPhone: address.contactPhone,
        environmentsCount: environmentsList.length, environments: environmentsList, estimatedMinutes: estimatedTime,
        requestedDate: format(selectedSlot.start, 'yyyy-MM-dd'),
        requestedTime: format(selectedSlot.start, 'HH:mm'),
      };

      if (editingRequest?.id) {
        // Modo edição: atualiza mantendo status 'pending'
        await requestService.updateRequestStatus(editingRequest.id, 'pending', sharedData);
        toast.success('Solicitação atualizada com sucesso!');
        setEditingRequest(null);
      } else {
        // Modo criação
        await requestService.createRequest({ clientId: clientData.id, clientName: clientData.name, ...sharedData });
        if (settings.notifyManagerNewRequest && settings.managerPhone) {
          import('../services/whatsappService').then(({ whatsappService }) => {
            whatsappService.sendMessage(settings.managerPhone!, `🔔 *Nova Solicitação de Medição!*\n\nLoja: ${clientData.name}\nProjeto: ${projectName}\nData: ${format(selectedSlot.start, 'dd/MM/yyyy')} às ${format(selectedSlot.start, 'HH:mm')}\nAmbientes: ${environmentsList.length}\nEndereço: ${fullAddress}\n\nAcesse o painel para aprovar.`, settings);
          });
        }
        setStep(3);
      }
      fetchData();
    } catch { toast.error('Erro ao enviar solicitação. Tente novamente.'); }
    finally { setIsSubmitting(false); }
  };


  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  if (isAuthLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div></div>;

  // Calendar events
  const currentYear = calendarDate.getFullYear();
  const calendarEvents: any[] = [
    ...requests.map(req => {
      const start = new Date(`${req.requestedDate}T${req.requestedTime}:00`);
      const end = addMinutes(start, req.estimatedMinutes);
      const isMine = req.clientId === clientData?.id;
      return { id: req.id, title: isMine ? `Sua Medição (${req.status === 'confirmed' ? 'Agendada' : req.status === 'pending' ? 'Aguardando' : req.status === 'completed' ? 'Realizada' : 'Alt. Solicitada'})` : 'Ocupado', start, end, isMine, type: 'measurement' };
    }),
    ...blockedTimes.map(bt => ({ id: bt.id, title: 'Ocupado', start: new Date(bt.start), end: new Date(bt.end), isMine: false, type: 'blocked' })),
    ...[...FIXED_HOLIDAYS.map(h => ({ ...h, type: 'fixed' as const })), ...(settings.customHolidays || [])].map(holiday => {
      let dateStr = holiday.date;
      if (holiday.type === 'fixed') dateStr = `${currentYear}-${holiday.date}`;
      return { id: `holiday-${holiday.name}-${dateStr}`, title: `🏖️ Feriado: ${holiday.name}`, start: new Date(`${dateStr}T00:00:00`), end: new Date(`${dateStr}T23:59:59`), isMine: false, type: 'holiday' };
    }),
  ];
  if (selectedSlot && activeTab === 'new_request') {
    calendarEvents.push({ id: 'preview', title: '✅ NOVO AGENDAMENTO AQUI', start: selectedSlot.start, end: selectedSlot.end, isMine: true, type: 'preview' });
  }

  const eventStyleGetter = (event: any) => {
    if (event.id === 'preview') return { style: { backgroundColor: '#059669', borderRadius: '6px', opacity: 1, border: '2px dashed white' } };
    if (event.type === 'holiday') return { style: { backgroundColor: '#ef4444', borderRadius: '6px', opacity: 0.9, color: 'white' } };
    if (event.isMine) return { className: 'shadow-sm', style: { backgroundColor: '#1e3a8a', borderRadius: '6px', opacity: 0.9 } }; // blue-900
    return { style: { backgroundColor: '#94a3b8', borderRadius: '6px', opacity: 0.7, color: '#f8fafc' } }; // slate-400
  };

  const myRequests = requests.filter(r => r.clientId === clientData?.id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const [yearStr, monthStr] = billingMonth.split('-');
  const selectedMonthStart = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const selectedMonthEnd = endOfMonth(selectedMonthStart);
  const myCompletedRequests = myRequests.filter(req => req.status === 'completed' && isWithinInterval(new Date(`${req.requestedDate}T12:00:00`), { start: selectedMonthStart, end: selectedMonthEnd }));
  const totalEnvs = myCompletedRequests.reduce((a, r) => a + r.environmentsCount, 0);
  const totalKm = myCompletedRequests.reduce((a, r) => a + (r.kmDriven || 0), 0);
  let totalValue = 0;
  if (clientData) {
    const kmPrice = clientData.kmValue > 0 ? clientData.kmValue : settings.defaultKmPrice;
    if (clientData.model === 'por_ambiente') totalValue = totalEnvs * clientData.baseValue + totalKm * kmPrice;
    else if (clientData.model === 'pacote') { const extra = Math.max(0, totalEnvs - (clientData.limitEnvs || 0)); totalValue = clientData.baseValue + extra * (clientData.baseValue / (clientData.limitEnvs || 1)) + totalKm * kmPrice; }
    else if (clientData.model === 'avulso') totalValue = myCompletedRequests.length * clientData.baseValue + totalKm * kmPrice;
  }
  const isPaid = billingStatuses.find(b => b.id === `${clientData?.id}_${billingMonth}`)?.status === 'paid';
  // Clique em evento no calendário do portal
  const handleSelectEvent = (event: any) => {
    if (!event.isMine || event.id === 'preview') return;
    const req = requests.find(r => r.id === event.id);
    if (!req) return;
    if (req.status === 'pending') {
      // Abre edição pré-preenchida
      setEditingRequest(req);
      setProjectName(req.projectName || '');
      setEnvironmentsList(req.environments || Array.from({ length: req.environmentsCount || 1 }).map((_, i) => ({ id: `legacy-${i}`, name: `Ambiente ${i + 1}`, isMeasured: true })));
      setAddress({
        zipCode: req.zipCode || '', street: req.street || '', number: req.number || '',
        complement: req.complement || '', neighborhood: req.neighborhood || '',
        city: req.city || '', state: req.state || '',
        condominiumName: req.condominiumName || '',
        contactName: req.contactName || '', contactPhone: req.contactPhone || '',
      });
      setStep(2); // Vai direto para os detalhes, visto que o slot já está definido logicamente
      setSelectedSlot({ start: new Date(`${req.requestedDate}T${req.requestedTime}:00`), end: addMinutes(new Date(`${req.requestedDate}T${req.requestedTime}:00`), req.estimatedMinutes) });
      setActiveTab('new_request');
    } else {
      toast.info('Este agendamento já foi confirmado e não pode ser editado pelo portal. Entre em contato pelo WhatsApp se precisar de alteração.');
    }
  };

  // Visual de indisponibilidade no portal
  const [workStartHour, workStartMin] = (settings.workStartTime || '08:00').split(':').map(Number);
  const [workEndHour, workEndMin] = (settings.workEndTime || '18:00').split(':').map(Number);
  const portalSlotPropGetter = (slotDate: Date) => {
    const totalMin = slotDate.getHours() * 60 + slotDate.getMinutes();
    const isOffHours = totalMin < workStartHour * 60 || totalMin >= workEndHour * 60;
    const dow = slotDate.getDay();
    const isNonWorkingDay = (dow === 6 && !settings.workOnSaturdays) || (dow === 0 && !settings.workOnSundays);
    if (isNonWorkingDay) return { className: 'hatched-bg', style: { backgroundColor: '#f1f5f9' } };
    if (isOffHours) return { className: 'hatched-bg opacity-50', style: { backgroundColor: '#f8fafc' } };
    return {};
  };
  const portalDayPropGetter = (dayDate: Date) => {
    const dow = dayDate.getDay();
    if ((dow === 6 && !settings.workOnSaturdays) || (dow === 0 && !settings.workOnSundays)) return { className: 'hatched-bg', style: { backgroundColor: '#f1f5f9' } };
    return {};
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 mb-2";

  const downloadFaturaMensal = async () => {
    if (!clientData) return;
    try {
      const blob = await pdf(<ClientBillingPDF client={clientData} requests={myCompletedRequests} month={format(selectedMonthStart, 'MMMM/yyyy', { locale: ptBR })} totalValue={totalValue} totalKm={totalKm} totalEnvs={totalEnvs} settings={settings} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LeaoMedicoes_Fatura_${clientData.name.replace(/\s+/g, '_')}_${billingMonth}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erro ao gerar a fatura. Tentar novamente mais tarde.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      <Toaster position="top-right" richColors />
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col shrink-0">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">Leão Medições</h1>
          <p className="text-xs text-slate-500 mt-1">Portal do Cliente</p>
          <div className="mt-4 inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-full">{clientData?.name}</div>
        </div>
        <nav className="flex-1 p-4 space-y-2 flex flex-col">
          <button onClick={() => { setActiveTab('new_request'); setStep(1); }} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 w-full ${activeTab === 'new_request' ? 'bg-blue-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Plus className="w-5 h-5" /><span className="font-medium">Nova Medição</span></button>
          <button onClick={() => setActiveTab('history')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 w-full ${activeTab === 'history' ? 'bg-blue-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><LayoutDashboard className="w-5 h-5" /><span className="font-medium">Minhas Medições</span></button>
          <button onClick={() => setActiveTab('billing')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 w-full ${activeTab === 'billing' ? 'bg-blue-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><FileText className="w-5 h-5" /><span className="font-medium">Meu Faturamento</span></button>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"><LogOut className="w-5 h-5" /><span className="font-medium">Sair</span></button>
        </div>
      </aside>

      {/* Bottom Navigation Mobile */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 z-50 flex items-center justify-around py-2 px-2 safe-area-pb">
        <button onClick={() => { setActiveTab('new_request'); setStep(1); }} className={`flex flex-col items-center justify-center w-full py-2 ${activeTab === 'new_request' ? 'text-blue-950' : 'text-slate-500 hover:text-slate-900'}`}>
          <Plus className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Nova</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center justify-center w-full py-2 ${activeTab === 'history' ? 'text-blue-950' : 'text-slate-500 hover:text-slate-900'}`}>
          <LayoutDashboard className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Medições</span>
        </button>
        <button onClick={() => setActiveTab('billing')} className={`flex flex-col items-center justify-center w-full py-2 ${activeTab === 'billing' ? 'text-blue-950' : 'text-slate-500 hover:text-slate-900'}`}>
          <FileText className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Faturas</span>
        </button>
        <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full py-2 text-red-500 hover:text-red-700">
          <LogOut className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">Sair</span>
        </button>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-auto pb-24 md:pb-8">
        {/* NOVA MEDIÇÃO */}
        {activeTab === 'new_request' && (
          <div className="max-w-4xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingRequest ? '✏️ Editar Solicitação' : 'Agendar Nova Medição'}
                </h2>
                <p className="text-slate-500 mt-1">
                  {editingRequest ? 'Altere os dados e/ou o horário da sua solicitação pendente.' : 'Preencha os dados e escolha um horário na agenda.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {editingRequest && (
                  <button onClick={() => { setEditingRequest(null); setProjectName(''); setEnvironmentsList([]); setAddress({ zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', condominiumName: '', contactName: '', contactPhone: '' }); }} className="flex items-center text-sm text-slate-500 hover:text-slate-900 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors">
                    Cancelar Edição
                  </button>
                )}
                <div className="hidden md:flex items-center space-x-2 text-sm text-slate-500">
                  <span className={step >= 1 ? 'text-slate-900 font-medium' : ''}>Agenda</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className={step >= 2 ? 'text-slate-900 font-medium' : ''}>Detalhes</span>
                </div>
              </div>
            </header>

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                  <h2 className="text-xl font-semibold text-slate-900">Detalhes do Serviço</h2>

                  {/* Projeto e Ambientes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Nome do Projeto</label>
                      <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className={inputClass} placeholder="Ex: Apto 302 Torre A" />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Ambientes a Medir *</label>
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="text"
                          value={envInput}
                          onChange={e => setEnvInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (envInput.trim()) {
                                setEnvironmentsList([...environmentsList, { id: crypto.randomUUID(), name: envInput.trim(), isMeasured: true }]);
                                setEnvInput('');
                              }
                            }
                          }}
                          className={inputClass}
                          placeholder="Ex: Cozinha, Suíte Master, etc."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (envInput.trim()) {
                              setEnvironmentsList([...environmentsList, { id: crypto.randomUUID(), name: envInput.trim(), isMeasured: true }]);
                              setEnvInput('');
                            }
                          }}
                          className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Adicionar
                        </button>
                      </div>

                      {environmentsList.length > 0 ? (
                        <ul className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-48 overflow-y-auto">
                          {environmentsList.map((env) => (
                            <li key={env.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-700">
                              <span>{env.name}</span>
                              <button
                                type="button"
                                onClick={() => setEnvironmentsList(environmentsList.filter(e => e.id !== env.id))}
                                className="text-red-500 hover:text-red-700 font-medium text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                              >
                                Remover
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                          Adicione os ambientes (pelo menos 1) para calcularmos o tempo estimado.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Endereço */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4"><MapPin className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Endereço da Obra</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <label className={labelClass}>CEP *</label>
                        <input type="text" value={address.zipCode} onChange={handleCepChange} className={inputClass} placeholder="00000-000" maxLength={9} />
                        {isLoadingCep && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-9 text-slate-400" />}
                      </div>
                      <div className="md:col-span-2"><label className={labelClass}>Rua / Logradouro</label><input type="text" value={address.street} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))} className={inputClass} placeholder="Auto-preenchido pelo CEP" /></div>
                      <div><label className={labelClass}>Número *</label><input required type="text" value={address.number} onChange={e => setAddress(p => ({ ...p, number: e.target.value }))} className={inputClass} placeholder="123" /></div>
                      <div><label className={labelClass}>Complemento</label><input type="text" value={address.complement} onChange={e => setAddress(p => ({ ...p, complement: e.target.value }))} className={inputClass} placeholder="Apto, Bloco..." /></div>
                      <div><label className={labelClass}>Bairro</label><input type="text" value={address.neighborhood} onChange={e => setAddress(p => ({ ...p, neighborhood: e.target.value }))} className={inputClass} /></div>
                      <div><label className={labelClass}>Cidade</label><input type="text" value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} className={inputClass} /></div>
                      <div><label className={labelClass}>UF</label><input type="text" maxLength={2} value={address.state} onChange={e => setAddress(p => ({ ...p, state: e.target.value.toUpperCase() }))} className={inputClass} placeholder="SP" /></div>
                      <div><label className={labelClass}><Building2 className="w-3 h-3 inline mr-1" />Condomínio</label><input type="text" value={address.condominiumName} onChange={e => setAddress(p => ({ ...p, condominiumName: e.target.value }))} className={inputClass} placeholder="Nome do condomínio" /></div>
                    </div>
                  </div>

                  {/* Contato */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4"><User className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Contato no Local</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className={labelClass}><User className="w-3 h-3 inline mr-1" />Nome do Contato</label><input type="text" value={address.contactName} onChange={e => setAddress(p => ({ ...p, contactName: e.target.value }))} className={inputClass} placeholder="Nome da pessoa no local" /></div>
                      <div><label className={labelClass}><Phone className="w-3 h-3 inline mr-1" />Telefone do Contato</label><input type="text" value={address.contactPhone} onChange={e => setAddress(p => ({ ...p, contactPhone: e.target.value }))} className={inputClass} placeholder="(11) 99999-9999" /></div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
                  <button onClick={() => setStep(1)} className="w-full sm:w-auto px-8 py-4 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar à Agenda
                  </button>
                  <button onClick={handleSchedule} disabled={isSubmitting || !selectedSlot} className="w-full sm:w-auto px-8 py-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-950 hover:bg-blue-900 flex justify-center items-center disabled:opacity-50 transition-colors">
                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando...</> : 'Confirmar e Enviar Solicitação'}
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">1. Escolha o Horário</h2>
                      <p className="text-sm text-slate-500 mt-1">Clique em um espaço vazio para iniciar o agendamento ({estimatedTime} min).</p>
                    </div>
                  </div>
                  <div className="h-[600px] mb-6 overflow-x-auto">
                    <div className="h-full min-w-[700px]">
                      <Calendar
                        localizer={localizer}
                        culture="pt-BR"
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        view={calendarView}
                        onView={setCalendarView}
                        date={calendarDate}
                        onNavigate={setCalendarDate}
                        eventPropGetter={eventStyleGetter}
                        slotPropGetter={portalSlotPropGetter}
                        dayPropGetter={portalDayPropGetter}
                        selectable={true}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        step={30}
                        timeslots={1}
                        min={new Date(0, 0, 0, workStartHour, workStartMin || 0, 0)}
                        max={new Date(0, 0, 0, workEndHour, workEndMin || 0, 0)}
                        messages={PT_BR_MESSAGES}
                      />
                    </div>
                  </div>
                  {selectedSlot && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
                      <div>
                        <p className="text-sm font-medium text-emerald-900">Horário Selecionado:</p>
                        <p className="text-lg font-bold text-emerald-700">{format(selectedSlot.start, "dd 'de' MMMM", { locale: ptBR })} das {format(selectedSlot.start, 'HH:mm')} às {format(selectedSlot.end, 'HH:mm')}</p>
                      </div>
                      <button onClick={() => setStep(2)} className="w-full sm:w-auto flex items-center justify-center py-3 px-6 border border-transparent rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                        Prosseguir aos Detalhes <ChevronRight className="w-4 h-4 ml-2" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-600" /></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Solicitação Enviada!</h2>
                <p className="text-slate-600 mb-6">Sua solicitação para <strong>{format(selectedSlot!.start, 'dd/MM/yyyy')}</strong> às <strong>{format(selectedSlot!.start, 'HH:mm')}</strong> foi enviada para aprovação.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button onClick={() => { setStep(1); setProjectName(''); setEnvironmentsList([]); setSelectedSlot(null); setAddress({ zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', condominiumName: '', contactName: '', contactPhone: '' }); }} className="w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium">Fazer Outro Agendamento</button>
                  <button onClick={() => { setActiveTab('history'); setStep(1); }} className="w-full sm:w-auto px-6 py-3 bg-blue-950 text-white rounded-xl hover:bg-blue-900 transition-colors font-medium">Ver Minhas Medições</button>
                </div>
              </div>
            )}
          </div>
        )
        }

        {/* HISTÓRICO */}
        {
          activeTab === 'history' && (
            <div className="max-w-5xl mx-auto">
              <header className="mb-8"><h2 className="text-2xl font-bold text-slate-900">Minhas Medições</h2><p className="text-slate-500 mt-1">Acompanhe o status de todas as suas solicitações.</p></header>
              <div className="space-y-4">
                {myRequests.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 text-slate-500">Você ainda não fez nenhuma solicitação de medição.</div>
                ) : myRequests.map(req => (
                  <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">{req.projectName || 'Projeto sem nome'}</h3>
                        {req.status === 'pending' && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Aguardando</span>}
                        {req.status === 'confirmed' && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">Agendada</span>}
                        {req.status === 'completed' && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Realizada</span>}
                        {req.status === 'reschedule_requested' && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Alteração Solicitada</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-slate-600 font-medium text-sm">
                        <div className="flex items-center"><CalendarIcon className="w-4 h-4 mr-1.5 shrink-0 text-slate-400" /> {format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM/yyyy')} às {req.requestedTime}</div>
                        <div className="flex items-center truncate max-w-[200px] lg:max-w-md"><MapPin className="w-4 h-4 mr-1.5 shrink-0 text-slate-400" /> <span className="truncate">{req.address}</span></div>
                      </div>
                    </div>
                    {req.contactName && <p className="text-sm text-slate-500 mt-1">Contato: {req.contactName} {req.contactPhone && `— ${req.contactPhone}`}</p>}
                    <div className="flex flex-wrap items-center gap-4 mt-4 bg-slate-50 p-3 rounded-lg text-sm text-slate-700 border border-slate-100">
                      <span className="font-semibold">{req.environmentsCount} ambientes</span>
                      <span className="text-slate-300">|</span>
                      <span className="font-semibold">{req.estimatedMinutes} min. est.</span>
                    </div>
                    {req.rescheduleReason && <div className="mt-3 p-3 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100"><strong>Mensagem da Leão Medições:</strong> {req.rescheduleReason}</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        }

        {/* FATURAMENTO */}
        {
          activeTab === 'billing' && (
            <div className="max-w-5xl mx-auto">
              <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-slate-900">Meu Faturamento</h2><p className="text-slate-500 mt-1">Consulte os valores das medições realizadas.</p></div>
                <div className="flex flex-wrap gap-3 items-center">
                  <input type="month" value={billingMonth} onChange={e => setBillingMonth(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 text-sm font-medium w-full sm:w-auto" />
                  <button
                    onClick={downloadFaturaMensal}
                    className="px-4 py-2 bg-blue-950 text-white rounded-xl hover:bg-blue-900 transition-colors text-sm font-medium w-full sm:w-auto flex items-center justify-center shrink-0"
                  >
                    <FileText className="w-4 h-4 mr-2" /> Salvar Fatura Mensal (PDF)
                  </button>
                </div>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-500 mb-1">Total do Mês</p><h3 className="text-3xl font-bold text-slate-900">{formatCurrency(totalValue)}</h3></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-500 mb-1">Status de Pagamento</p>{isPaid ? <h3 className="text-2xl font-bold text-emerald-600 flex items-center"><CheckCircle2 className="w-6 h-6 mr-2" />Pago</h3> : <h3 className="text-2xl font-bold text-amber-600">Em Aberto</h3>}</div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-500 mb-1">Medições Realizadas</p><h3 className="text-3xl font-bold text-slate-900">{myCompletedRequests.length}</h3></div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Projeto</th>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4 text-center">Ambientes</th>
                        <th className="px-6 py-4 text-center">Valor Medição</th>
                        <th className="px-6 py-4 text-center">KM Extra</th>
                        <th className="px-6 py-4 text-center">Valor KM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {myCompletedRequests.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhuma medição realizada neste mês.</td></tr> : myCompletedRequests.map(req => {
                        const itemKmValue = (req.kmDriven || 0) * (clientData?.kmValue || 0 > 0 ? clientData!.kmValue : settings.defaultKmPrice);
                        const itemBaseValue = clientData?.model === 'por_ambiente' ? req.environmentsCount * (clientData?.baseValue || 0) : (clientData?.baseValue || 0);

                        return (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900 max-w-[200px] truncate" title={req.projectName || req.contactName || 'N/A'}>{req.projectName || req.contactName || 'N/A'}</td>
                            <td className="px-6 py-4 text-slate-600">{format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                            <td className="px-6 py-4 text-center text-slate-600 font-medium bg-slate-50 rounded-lg">{req.environmentsCount}</td>
                            <td className="px-6 py-4 text-center text-slate-600">{formatCurrency(itemBaseValue)}</td>
                            <td className="px-6 py-4 text-center text-slate-600 font-medium bg-slate-50 rounded-lg">{req.kmDriven || 0} km</td>
                            <td className="px-6 py-4 text-center text-slate-600">{formatCurrency(itemKmValue)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        }
      </main >

      {/* Floating Action Button for Mobile */}
      {
        activeTab !== 'new_request' && (
          <button
            onClick={() => { setActiveTab('new_request'); setStep(1); }}
            className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition-all z-50"
            title="Nova Medição"
          >
            <Plus className="w-7 h-7" />
          </button>
        )
      }
    </div >
  );
}
