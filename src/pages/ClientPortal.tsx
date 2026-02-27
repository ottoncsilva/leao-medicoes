import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, MapPin, Ruler, Clock, ChevronRight, CheckCircle2, ArrowLeft, LogOut, FileText, LayoutDashboard, MessageSquare, Plus } from 'lucide-react';
import { format, parse, startOfWeek, getDay, addMinutes, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { requestService, MeasurementRequest } from '../services/requestService';
import { blockedTimeService, BlockedTime } from '../services/blockedTimeService';
import { billingService, BillingStatus } from '../services/billingService';
import { settingsService, GlobalSettings, FIXED_HOLIDAYS } from '../services/settingsService';
import { Client } from '../services/clientService';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function ClientPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('new_request');
  const [step, setStep] = useState(1);
  const [environments, setEnvironments] = useState(1);
  const [address, setAddress] = useState('');
  
  // Auth states
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Agenda states
  const [requests, setRequests] = useState<MeasurementRequest[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ defaultKmPrice: 2.5 });
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);
  const [calendarView, setCalendarView] = useState<View>(Views.WEEK);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date, end: Date } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado do Faturamento (Mês selecionado)
  const [billingMonth, setBillingMonth] = useState(format(new Date(), 'yyyy-MM'));

  const estimatedTime = environments * 30; // 30 minutos por ambiente

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.email) {
        try {
          const q = query(collection(db, 'clients'), where('contact', '==', user.email));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            setClientData({ id: doc.id, ...doc.data() } as Client);
          } else {
            await signOut(auth);
            navigate('/login');
          }
        } catch (error) {
          console.error("Erro ao buscar dados do cliente:", error);
        }
      } else {
        navigate('/login');
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (clientData) {
      fetchData();
    }
  }, [clientData]);

  const fetchData = async () => {
    try {
      const [allRequests, allBlocked, fetchedSettings, fetchedBilling] = await Promise.all([
        requestService.getRequests(),
        blockedTimeService.getBlockedTimes(),
        settingsService.getSettings(),
        billingService.getAllBillingStatus()
      ]);
      setRequests(allRequests.filter(r => r.status !== 'rejected'));
      setBlockedTimes(allBlocked);
      setSettings(fetchedSettings);
      setBillingStatuses(fetchedBilling);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date, end: Date }) => {
    if (slotInfo.start < new Date()) {
      alert("Não é possível agendar no passado.");
      return;
    }

    // Verificar se é fim de semana e se está configurado para não atender
    const dayOfWeek = slotInfo.start.getDay();
    if (dayOfWeek === 0 && !settings.workOnSundays) {
      alert("Não atendemos aos domingos. Por favor, escolha outro dia.");
      return;
    }
    if (dayOfWeek === 6 && !settings.workOnSaturdays) {
      alert("Não atendemos aos sábados. Por favor, escolha outro dia.");
      return;
    }

    // Verificar se é feriado
    const isHoliday = checkIsHoliday(slotInfo.start);
    if (isHoliday) {
      alert(`Não é possível agendar neste dia. Feriado: ${isHoliday.name}`);
      return;
    }

    const end = addMinutes(slotInfo.start, estimatedTime);
    
    const hasConflict = [...requests, ...blockedTimes].some(event => {
      let eventStart, eventEnd;
      
      if ('requestedDate' in event) {
        eventStart = new Date(`${event.requestedDate}T${event.requestedTime}:00`);
        eventEnd = addMinutes(eventStart, event.estimatedMinutes);
      } else {
        eventStart = new Date(event.start);
        eventEnd = new Date(event.end);
      }

      return (slotInfo.start < eventEnd && end > eventStart);
    });

    if (hasConflict) {
      alert("Este horário conflita com outro agendamento ou bloqueio do gestor. Por favor, escolha outro horário.");
      return;
    }

    setSelectedSlot({ start: slotInfo.start, end });
  };

  const handleSchedule = async () => {
    if (!selectedSlot || !clientData || !clientData.id) return;
    
    setIsSubmitting(true);
    try {
      await requestService.createRequest({
        clientId: clientData.id,
        clientName: clientData.name,
        address,
        environmentsCount: environments,
        estimatedMinutes: estimatedTime,
        requestedDate: format(selectedSlot.start, 'yyyy-MM-dd'),
        requestedTime: format(selectedSlot.start, 'HH:mm')
      });
      
      // Enviar WhatsApp para o Gestor
      if (settings.notifyManagerNewRequest && settings.managerPhone) {
        import('../services/whatsappService').then(({ whatsappService }) => {
          whatsappService.sendMessage(
            settings.managerPhone!,
            `🔔 *Nova Solicitação de Medição!*\n\nLoja: ${clientData.name}\nData: ${format(selectedSlot.start, 'dd/MM/yyyy')} às ${format(selectedSlot.start, 'HH:mm')}\nAmbientes: ${environments}\nEndereço: ${address}\n\nAcesse o painel para aprovar.`,
            settings
          );
        });
      }

      setStep(3);
      fetchData(); // Atualiza a lista após criar
    } catch (error) {
      alert("Erro ao enviar solicitação.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  // Função auxiliar para checar feriados
  const checkIsHoliday = (date: Date) => {
    const currentYear = date.getFullYear();
    const allHolidays = [
      ...FIXED_HOLIDAYS.map(h => ({ ...h, type: 'fixed' as const })),
      ...(settings.customHolidays || [])
    ];

    return allHolidays.find(holiday => {
      let dateStr = holiday.date;
      if (holiday.type === 'fixed') {
        dateStr = `${currentYear}-${holiday.date}`;
      }
      const holidayDate = new Date(`${dateStr}T12:00:00`);
      return holidayDate.getDate() === date.getDate() && holidayDate.getMonth() === date.getMonth() && holidayDate.getFullYear() === date.getFullYear();
    });
  };

  // Preparar eventos para o calendário do cliente
  const calendarEvents = [
    ...requests.map(req => {
      const start = new Date(`${req.requestedDate}T${req.requestedTime}:00`);
      const end = addMinutes(start, req.estimatedMinutes);
      const isMine = req.clientId === clientData?.id;

      return {
        id: req.id,
        title: isMine ? `Sua Medição (${req.status})` : 'Ocupado',
        start,
        end,
        isMine,
        type: 'measurement'
      };
    }),
    ...blockedTimes.map(bt => ({
      id: bt.id,
      title: 'Ocupado',
      start: new Date(bt.start),
      end: new Date(bt.end),
      isMine: false,
      type: 'blocked'
    }))
  ];

  // Adicionar feriados ao calendário
  const currentYear = calendarDate.getFullYear();
  const allHolidays = [
    ...FIXED_HOLIDAYS.map(h => ({ ...h, type: 'fixed' as const })),
    ...(settings.customHolidays || [])
  ];

  allHolidays.forEach(holiday => {
    let dateStr = holiday.date;
    if (holiday.type === 'fixed') {
      dateStr = `${currentYear}-${holiday.date}`;
    }
    
    calendarEvents.push({
      id: `holiday-${holiday.name}-${dateStr}`,
      title: `🏖️ Feriado: ${holiday.name}`,
      start: new Date(`${dateStr}T00:00:00`),
      end: new Date(`${dateStr}T23:59:59`),
      isMine: false,
      type: 'holiday'
    } as any);
  });

  if (selectedSlot && activeTab === 'new_request') {
    calendarEvents.push({
      id: 'preview',
      title: 'NOVO AGENDAMENTO AQUI',
      start: selectedSlot.start,
      end: selectedSlot.end,
      isMine: true,
      type: 'preview'
    });
  }

  const eventStyleGetter = (event: any) => {
    if (event.id === 'preview') {
      return { style: { backgroundColor: '#059669', borderRadius: '6px', opacity: 1, border: '2px dashed white' } };
    }
    if (event.type === 'holiday') {
      return { style: { backgroundColor: '#ef4444', borderRadius: '6px', opacity: 0.9, color: 'white' } };
    }
    if (event.isMine) {
      return { style: { backgroundColor: '#1c1917', borderRadius: '6px', opacity: 0.9 } };
    }
    return { style: { backgroundColor: '#d6d3d1', borderRadius: '6px', opacity: 0.7, color: '#44403c' } };
  };

  const myRequests = requests.filter(r => r.clientId === clientData?.id).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Lógica de Faturamento do Cliente
  const [yearStr, monthStr] = billingMonth.split('-');
  const selectedMonthStart = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const selectedMonthEnd = endOfMonth(selectedMonthStart);
  
  const myCompletedRequests = myRequests.filter(req => 
    req.status === 'completed' &&
    isWithinInterval(new Date(`${req.requestedDate}T12:00:00`), { start: selectedMonthStart, end: selectedMonthEnd })
  );

  const totalEnvs = myCompletedRequests.reduce((acc, req) => acc + req.environmentsCount, 0);
  const totalKm = myCompletedRequests.reduce((acc, req) => acc + (req.kmDriven || 0), 0);
  
  let totalValue = 0;
  if (clientData) {
    const kmPrice = clientData.kmValue > 0 ? clientData.kmValue : settings.defaultKmPrice;
    if (clientData.model === 'por_ambiente') {
      totalValue = (totalEnvs * clientData.baseValue) + (totalKm * kmPrice);
    } else if (clientData.model === 'pacote') {
      const extraEnvs = Math.max(0, totalEnvs - (clientData.limitEnvs || 0));
      const extraValue = extraEnvs * (clientData.baseValue / (clientData.limitEnvs || 1));
      totalValue = clientData.baseValue + extraValue + (totalKm * kmPrice);
    } else if (clientData.model === 'avulso') {
      totalValue = (myCompletedRequests.length * clientData.baseValue) + (totalKm * kmPrice);
    }
  }

  const statusRecord = billingStatuses.find(b => b.id === `${clientData?.id}_${billingMonth}`);
  const isPaid = statusRecord?.status === 'paid';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-stone-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-stone-200">
          <h1 className="text-xl font-bold text-stone-900">Leão Medições</h1>
          <p className="text-xs text-stone-500 mt-1">Portal do Cliente</p>
          <div className="mt-4 inline-block px-3 py-1 bg-stone-100 text-stone-800 text-xs font-medium rounded-full">
            {clientData?.name}
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 flex md:flex-col overflow-x-auto md:overflow-visible">
          <button onClick={() => { setActiveTab('new_request'); setStep(1); }} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === 'new_request' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
            <Plus className="w-5 h-5" /> <span className="font-medium">Nova Medição</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === 'history' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
            <LayoutDashboard className="w-5 h-5" /> <span className="font-medium">Minhas Medições</span>
          </button>
          <button onClick={() => setActiveTab('billing')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === 'billing' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
            <FileText className="w-5 h-5" /> <span className="font-medium">Meu Faturamento</span>
          </button>
        </nav>

        <div className="p-4 border-t border-stone-200">
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors">
            <LogOut className="w-5 h-5" /> <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        
        {/* ABA: NOVA MEDIÇÃO */}
        {activeTab === 'new_request' && (
          <div className="max-w-4xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Agendar Nova Medição</h2>
                <p className="text-stone-500 mt-1">Preencha os dados e escolha um horário na agenda.</p>
              </div>
              <div className="hidden md:flex items-center space-x-2 text-sm text-stone-500">
                <span className={step >= 1 ? 'text-stone-900 font-medium' : ''}>Detalhes</span>
                <ChevronRight className="w-4 h-4" />
                <span className={step >= 2 ? 'text-stone-900 font-medium' : ''}>Agenda</span>
              </div>
            </header>

            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <h2 className="text-xl font-semibold text-stone-900 mb-6">Detalhes do Serviço</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Endereço Completo da Medição</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-stone-400" />
                        </div>
                        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="block w-full pl-10 pr-3 py-3 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" placeholder="Rua, Número, Bairro, Cidade" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Quantidade de Ambientes</label>
                      <div className="flex items-center space-x-4">
                        <button onClick={() => setEnvironments(Math.max(1, environments - 1))} className="w-12 h-12 rounded-xl border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-50">-</button>
                        <div className="flex-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Ruler className="h-5 w-5 text-stone-400" /></div>
                          <input type="number" value={environments} onChange={(e) => setEnvironments(parseInt(e.target.value) || 1)} className="block w-full pl-10 pr-3 py-3 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm text-center font-medium" min="1" />
                        </div>
                        <button onClick={() => setEnvironments(environments + 1)} className="w-12 h-12 rounded-xl border border-stone-300 flex items-center justify-center text-stone-600 hover:bg-stone-50">+</button>
                      </div>
                    </div>

                    <div className="bg-stone-50 rounded-xl p-4 flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-stone-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-stone-900">Tempo Estimado</p>
                        <p className="text-sm text-stone-500">Aproximadamente {estimatedTime >= 60 ? `${Math.floor(estimatedTime / 60)}h ${estimatedTime % 60}min` : `${estimatedTime} minutos`}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => setStep(2)} disabled={!address || environments < 1} className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Ver Agenda e Escolher Horário
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-stone-900">Escolha o Horário</h2>
                      <p className="text-sm text-stone-500 mt-1">Clique em um espaço vazio no calendário para agendar seus {estimatedTime} minutos.</p>
                    </div>
                    <button onClick={() => setStep(1)} className="flex items-center text-sm text-stone-500 hover:text-stone-900 font-medium">
                      <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                    </button>
                  </div>
                  
                  <div className="h-[600px] mb-6">
                    <Calendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: '100%' }}
                      view={calendarView}
                      onView={setCalendarView}
                      date={calendarDate}
                      onNavigate={setCalendarDate}
                      eventPropGetter={eventStyleGetter}
                      selectable={true}
                      onSelectSlot={handleSelectSlot}
                      step={30}
                      timeslots={1}
                      min={new Date(0, 0, 0, 8, 0, 0)}
                      max={new Date(0, 0, 0, 19, 0, 0)}
                      messages={{ next: "Próximo", previous: "Anterior", today: "Hoje", month: "Mês", week: "Semana", day: "Dia", agenda: "Agenda", noEventsInRange: "Não há medições neste período." }}
                    />
                  </div>

                  {selectedSlot && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between animate-in fade-in">
                      <div>
                        <p className="text-sm font-medium text-emerald-900">Horário Selecionado:</p>
                        <p className="text-lg font-bold text-emerald-700">
                          {format(selectedSlot.start, "dd 'de' MMMM", { locale: ptBR })} das {format(selectedSlot.start, "HH:mm")} às {format(selectedSlot.end, "HH:mm")}
                        </p>
                      </div>
                      <button onClick={handleSchedule} disabled={isSubmitting} className="flex justify-center py-3 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 disabled:opacity-50 transition-colors">
                        {isSubmitting ? 'Enviando...' : 'Confirmar Reserva'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-stone-200 text-center animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-900 mb-2">Solicitação Enviada!</h2>
                <p className="text-stone-600 mb-6">
                  Sua solicitação de medição para o dia <strong className="text-stone-900">{selectedSlot ? format(selectedSlot.start, 'dd/MM/yyyy') : ''}</strong> às <strong className="text-stone-900">{selectedSlot ? format(selectedSlot.start, 'HH:mm') : ''}</strong> foi enviada para aprovação do gestor.
                </p>
                <div className="flex justify-center space-x-4">
                  <button onClick={() => { setStep(1); setAddress(''); setEnvironments(1); setSelectedSlot(null); }} className="px-6 py-2 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors font-medium">
                    Nova Solicitação
                  </button>
                  <button onClick={() => { setActiveTab('history'); setStep(1); setAddress(''); setEnvironments(1); setSelectedSlot(null); }} className="px-6 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors font-medium">
                    Ver Minhas Medições
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: HISTÓRICO */}
        {activeTab === 'history' && (
          <div className="max-w-5xl mx-auto">
            <header className="mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Minhas Medições</h2>
              <p className="text-stone-500 mt-1">Acompanhe o status de todas as suas solicitações.</p>
            </header>

            <div className="space-y-4">
              {myRequests.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center border border-stone-200 text-stone-500">
                  Você ainda não fez nenhuma solicitação de medição.
                </div>
              ) : (
                myRequests.map((req) => (
                  <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-stone-900">
                          {format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM/yyyy')} às {req.requestedTime}
                        </h3>
                        {req.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Aguardando</span>}
                        {req.status === 'confirmed' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">Agendada</span>}
                        {req.status === 'completed' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Realizada</span>}
                        {req.status === 'reschedule_requested' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Alteração Solicitada</span>}
                      </div>
                      <p className="text-sm text-stone-600 flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1.5 text-stone-400 shrink-0" /> {req.address}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-stone-500">
                        <span className="flex items-center"><Ruler className="w-4 h-4 mr-1.5" /> {req.environmentsCount} ambientes</span>
                        <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5" /> {req.estimatedMinutes} min</span>
                      </div>
                      {req.rescheduleReason && (
                        <div className="mt-3 p-3 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100 flex items-start">
                          <MessageSquare className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                          <p><strong>Mensagem da Leão Medições:</strong> {req.rescheduleReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ABA: FATURAMENTO */}
        {activeTab === 'billing' && (
          <div className="max-w-5xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Meu Faturamento</h2>
                <p className="text-stone-500 mt-1">Consulte os valores das medições realizadas.</p>
              </div>
              <input 
                type="month" 
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="px-4 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm"
              />
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <p className="text-sm font-medium text-stone-500 mb-1">Total do Mês</p>
                <h3 className="text-3xl font-bold text-stone-900">{formatCurrency(totalValue)}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <p className="text-sm font-medium text-stone-500 mb-1">Status de Pagamento</p>
                {isPaid ? (
                  <h3 className="text-2xl font-bold text-emerald-600 flex items-center"><CheckCircle2 className="w-6 h-6 mr-2" /> Pago</h3>
                ) : (
                  <h3 className="text-2xl font-bold text-amber-600">Em Aberto</h3>
                )}
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <p className="text-sm font-medium text-stone-500 mb-1">Medições Realizadas</p>
                <h3 className="text-3xl font-bold text-stone-900">{myCompletedRequests.length}</h3>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-stone-900 mb-4">Detalhamento das Medições ({format(selectedMonthStart, 'MMMM/yyyy', { locale: ptBR })})</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-stone-50 text-stone-600 font-medium border-b border-stone-200">
                    <tr>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Endereço</th>
                      <th className="px-6 py-4 text-center">Ambientes</th>
                      <th className="px-6 py-4 text-center">KM Rodados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {myCompletedRequests.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-stone-500">Nenhuma medição realizada neste mês.</td></tr>
                    ) : (
                      myCompletedRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-stone-900">{format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                          <td className="px-6 py-4 text-stone-600 truncate max-w-xs">{req.address}</td>
                          <td className="px-6 py-4 text-center text-stone-600">{req.environmentsCount}</td>
                          <td className="px-6 py-4 text-center text-stone-600">{req.kmDriven || 0} km</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
