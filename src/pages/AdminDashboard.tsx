import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Users, FileText, Settings, LogOut, CheckCircle2, Clock, XCircle, MapPin, Ruler, Plus, Building2, CalendarDays, Filter, MessageSquare, ShieldAlert, LayoutDashboard, Edit2, Check, ChevronDown } from 'lucide-react';
import { clientService, Client } from '../services/clientService';
import { requestService, MeasurementRequest, RequestStatus } from '../services/requestService';
import { settingsService, GlobalSettings, Holiday, FIXED_HOLIDAYS } from '../services/settingsService';
import { blockedTimeService, BlockedTime } from '../services/blockedTimeService';
import { billingService, BillingStatus } from '../services/billingService';
import { whatsappService } from '../services/whatsappService';
import { format, parse, startOfWeek, getDay, addMinutes, startOfMonth, endOfMonth, isWithinInterval, subMonths, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop(Calendar);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestFilter, setRequestFilter] = useState<RequestStatus | 'all'>('all');
  const [calendarView, setCalendarView] = useState<View>(Views.WEEK);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Dados reais do Firebase
  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<MeasurementRequest[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({ defaultKmPrice: 2.5 });
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [billingStatuses, setBillingStatuses] = useState<BillingStatus[]>([]);

  // Estados dos Modais
  const [completeModalOpen, setCompleteModalOpen] = useState<string | null>(null);
  const [kmInput, setKmInput] = useState('');
  
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState<string | null>(null);
  const [rescheduleMessage, setRescheduleMessage] = useState('');

  const [blockTimeModalOpen, setBlockTimeModalOpen] = useState<{start: Date, end: Date} | null>(null);
  const [blockTimeTitle, setBlockTimeTitle] = useState('');

  // Novos estados para Agenda e Configurações
  const [activeSettingsTab, setActiveSettingsTab] = useState('financeiro');
  const [showAgendaDropdown, setShowAgendaDropdown] = useState(false);
  const [manualBlockModalOpen, setManualBlockModalOpen] = useState(false);
  const [managerScheduleModalOpen, setManagerScheduleModalOpen] = useState(false);

  const [manualBlockForm, setManualBlockForm] = useState({
    title: '', startDate: '', startTime: '', endDate: '', endTime: ''
  });

  const [managerScheduleForm, setManagerScheduleForm] = useState({
    clientId: '',
    projectName: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    condominiumName: '',
    contactName: '',
    contactPhone: '',
    environmentsCount: 1,
    estimatedMinutes: 60,
    date: '',
    time: ''
  });

  // Estado do formulário de cliente
  const [newClient, setNewClient] = useState({
    name: '', contact: '', phone: '', cnpj: '', address: '', stateRegistration: '', corporateName: '', responsibleContact: '', model: 'por_ambiente' as Client['model'], baseValue: '', kmValue: '', limitEnvs: ''
  });

  // Estado do formulário de configurações
  const [settingsForm, setSettingsForm] = useState({ 
    defaultKmPrice: '',
    evolutionApiUrl: '',
    evolutionInstance: '',
    evolutionApiKey: '',
    managerPhone: '',
    notifyManagerNewRequest: true,
    notifyClientApproved: true,
    notifyClientRejected: true,
    notifyClientReschedule: true,
    customHolidays: [] as Holiday[],
    workOnSaturdays: false,
    workOnSundays: false,
    workStartTime: '08:00',
    workEndTime: '18:00'
  });

  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'fixed' as 'fixed' | 'specific' });

  // Estado do Faturamento (Mês selecionado)
  const [billingMonth, setBillingMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedClients, fetchedRequests, fetchedSettings, fetchedBlocked, fetchedBilling] = await Promise.all([
        clientService.getClients(),
        requestService.getRequests(),
        settingsService.getSettings(),
        blockedTimeService.getBlockedTimes(),
        billingService.getAllBillingStatus()
      ]);
      setClients(fetchedClients);
      setRequests(fetchedRequests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setSettings(fetchedSettings);
      setSettingsForm({ 
        defaultKmPrice: fetchedSettings.defaultKmPrice.toString(),
        evolutionApiUrl: fetchedSettings.evolutionApiUrl || '',
        evolutionInstance: fetchedSettings.evolutionInstance || '',
        evolutionApiKey: fetchedSettings.evolutionApiKey || '',
        managerPhone: fetchedSettings.managerPhone || '',
        notifyManagerNewRequest: fetchedSettings.notifyManagerNewRequest ?? true,
        notifyClientApproved: fetchedSettings.notifyClientApproved ?? true,
        notifyClientRejected: fetchedSettings.notifyClientRejected ?? true,
        notifyClientReschedule: fetchedSettings.notifyClientReschedule ?? true,
        customHolidays: fetchedSettings.customHolidays || [],
        workOnSaturdays: fetchedSettings.workOnSaturdays ?? false,
        workOnSundays: fetchedSettings.workOnSundays ?? false,
        workStartTime: fetchedSettings.workStartTime || '08:00',
        workEndTime: fetchedSettings.workEndTime || '18:00'
      });
      setBlockedTimes(fetchedBlocked);
      setBillingStatuses(fetchedBilling);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = async () => {
    console.log("handleCreateClient called", newClient);
    try {
      await clientService.createClient({
        name: newClient.name, 
        contact: newClient.contact.toLowerCase().trim(), 
        phone: newClient.phone,
        cnpj: newClient.cnpj,
        address: newClient.address,
        stateRegistration: newClient.stateRegistration,
        corporateName: newClient.corporateName,
        responsibleContact: newClient.responsibleContact,
        model: newClient.model,
        baseValue: Number(newClient.baseValue) || 0,
        kmValue: Number(newClient.kmValue) || 0,
        limitEnvs: newClient.model === 'pacote' ? Number(newClient.limitEnvs) : undefined
      });
      console.log("Client created successfully");
      setShowNewClientForm(false);
      setNewClient({ name: '', contact: '', phone: '', cnpj: '', address: '', stateRegistration: '', corporateName: '', responsibleContact: '', model: 'por_ambiente', baseValue: '', kmValue: '', limitEnvs: '' });
      fetchData();
    } catch (error) {
      console.error("Error creating client:", error);
      alert("Erro ao criar cliente.");
    }
  };

  const handleUpdateClient = async () => {
    console.log("handleUpdateClient called", editingClient);
    if (!editingClient || !editingClient.id) return;
    try {
      await clientService.updateClient(editingClient.id, {
        name: editingClient.name,
        contact: editingClient.contact.toLowerCase().trim(),
        phone: editingClient.phone,
        cnpj: editingClient.cnpj,
        address: editingClient.address,
        stateRegistration: editingClient.stateRegistration,
        corporateName: editingClient.corporateName,
        responsibleContact: editingClient.responsibleContact,
        model: editingClient.model,
        baseValue: Number(editingClient.baseValue) || 0,
        kmValue: Number(editingClient.kmValue) || 0,
        limitEnvs: editingClient.model === 'pacote' ? Number(editingClient.limitEnvs) : undefined
      });
      console.log("Client updated successfully");
      setEditingClient(null);
      fetchData();
    } catch (error) {
      console.error("Error updating client:", error);
      alert("Erro ao atualizar cliente.");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsService.saveSettings({ 
        defaultKmPrice: Number(settingsForm.defaultKmPrice) || 0,
        evolutionApiUrl: settingsForm.evolutionApiUrl,
        evolutionInstance: settingsForm.evolutionInstance,
        evolutionApiKey: settingsForm.evolutionApiKey,
        managerPhone: settingsForm.managerPhone,
        notifyManagerNewRequest: settingsForm.notifyManagerNewRequest,
        notifyClientApproved: settingsForm.notifyClientApproved,
        notifyClientRejected: settingsForm.notifyClientRejected,
        notifyClientReschedule: settingsForm.notifyClientReschedule,
        customHolidays: settingsForm.customHolidays,
        workOnSaturdays: settingsForm.workOnSaturdays,
        workOnSundays: settingsForm.workOnSundays,
        workStartTime: settingsForm.workStartTime,
        workEndTime: settingsForm.workEndTime
      });
      alert("Configurações salvas com sucesso!");
      fetchData();
    } catch (error) {
      alert("Erro ao salvar configurações.");
    }
  };

  const handleAddHoliday = () => {
    if (!newHoliday.date || !newHoliday.name) return;
    
    // Se for fixo, garantir que está no formato MM-DD
    let formattedDate = newHoliday.date;
    if (newHoliday.type === 'fixed' && formattedDate.length > 5) {
      // Se a pessoa digitou YYYY-MM-DD, extrai apenas MM-DD
      formattedDate = formattedDate.substring(5);
    }

    const holiday: Holiday = {
      id: Date.now().toString(),
      date: formattedDate,
      name: newHoliday.name,
      type: newHoliday.type
    };

    setSettingsForm(prev => ({
      ...prev,
      customHolidays: [...prev.customHolidays, holiday]
    }));
    setNewHoliday({ date: '', name: '', type: 'fixed' });
  };

  const handleRemoveHoliday = (id: string) => {
    setSettingsForm(prev => ({
      ...prev,
      customHolidays: prev.customHolidays.filter(h => h.id !== id)
    }));
  };

  const handleUpdateStatus = async (id: string, status: RequestStatus) => {
    try {
      await requestService.updateRequestStatus(id, status);
      
      const req = requests.find(r => r.id === id);
      if (req) {
        const client = clients.find(c => c.id === req.clientId);
        if (client && client.phone) {
          if (status === 'confirmed' && settings.notifyClientApproved) {
            whatsappService.sendMessage(
              client.phone, 
              `✅ Olá ${client.name}!\n\nSua medição do dia *${format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM')} às ${req.requestedTime}* foi *APROVADA* pela Leão Medições.\n\nEndereço: ${req.address}`,
              settings
            );
          } else if (status === 'rejected' && settings.notifyClientRejected) {
            whatsappService.sendMessage(
              client.phone, 
              `❌ Olá ${client.name}.\n\nInfelizmente sua solicitação de medição do dia *${format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM')} às ${req.requestedTime}* foi *RECUSADA* ou cancelada.\n\nPor favor, acesse o portal para agendar um novo horário.`,
              settings
            );
          }
        }
      }
      
      fetchData();
    } catch (error) {
      alert("Erro ao atualizar status.");
    }
  };

  const handleCompleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalOpen) return;
    try {
      await requestService.updateRequestStatus(completeModalOpen, 'completed', { kmDriven: Number(kmInput) || 0 });
      setCompleteModalOpen(null);
      setKmInput('');
      fetchData();
    } catch (error) {
      alert("Erro ao finalizar medição.");
    }
  };

  const handleRescheduleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModalOpen) return;
    try {
      await requestService.updateRequestStatus(rescheduleModalOpen, 'reschedule_requested', { rescheduleReason: rescheduleMessage });
      
      const req = requests.find(r => r.id === rescheduleModalOpen);
      if (req) {
        const client = clients.find(c => c.id === req.clientId);
        if (client && client.phone && settings.notifyClientReschedule) {
          whatsappService.sendMessage(
            client.phone, 
            `⚠️ Olá ${client.name}!\n\nSobre a sua solicitação de medição do dia *${format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM')} às ${req.requestedTime}*, a Leão Medições enviou a seguinte mensagem:\n\n_"${rescheduleMessage}"_\n\nPor favor, acesse o portal para responder ou reagendar.`,
            settings
          );
        }
      }

      setRescheduleModalOpen(null);
      setRescheduleMessage('');
      fetchData();
    } catch (error) {
      alert("Erro ao solicitar alteração.");
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date, end: Date }) => {
    setManagerScheduleForm({
      ...managerScheduleForm,
      date: format(slotInfo.start, 'yyyy-MM-dd'),
      time: format(slotInfo.start, 'HH:mm'),
      estimatedMinutes: Math.round((slotInfo.end.getTime() - slotInfo.start.getTime()) / 60000)
    });
    setManagerScheduleModalOpen(true);
  };

  const onEventDrop = async ({ event, start, end }: any) => {
    if (event.type === 'blocked') {
      try {
        await blockedTimeService.updateBlockedTime(event.id, {
          start: start.toISOString(),
          end: end.toISOString()
        });
        fetchData();
      } catch (error) {
        alert("Erro ao mover bloqueio.");
      }
    } else if (event.type === 'request') {
      try {
        const estimatedMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
        await requestService.updateRequestStatus(event.id, event.status, {
          requestedDate: format(start, 'yyyy-MM-dd'),
          requestedTime: format(start, 'HH:mm'),
          estimatedMinutes
        });
        fetchData();
      } catch (error) {
        alert("Erro ao mover medição.");
      }
    }
  };

  const onEventResize = async ({ event, start, end }: any) => {
    if (event.type === 'blocked') {
      try {
        await blockedTimeService.updateBlockedTime(event.id, {
          start: start.toISOString(),
          end: end.toISOString()
        });
        fetchData();
      } catch (error) {
        alert("Erro ao redimensionar bloqueio.");
      }
    } else if (event.type === 'request') {
      try {
        const estimatedMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
        await requestService.updateRequestStatus(event.id, event.status, {
          requestedDate: format(start, 'yyyy-MM-dd'),
          requestedTime: format(start, 'HH:mm'),
          estimatedMinutes
        });
        fetchData();
      } catch (error) {
        alert("Erro ao redimensionar medição.");
      }
    }
  };

  const handleCreateBlockedTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTimeModalOpen || !blockTimeTitle) return;
    try {
      await blockedTimeService.addBlockedTime({
        title: blockTimeTitle,
        start: blockTimeModalOpen.start.toISOString(),
        end: blockTimeModalOpen.end.toISOString()
      });
      setBlockTimeModalOpen(null);
      setBlockTimeTitle('');
      fetchData();
    } catch (error) {
      alert("Erro ao bloquear horário.");
    }
  };

  const handleManualBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBlockForm.title || !manualBlockForm.startDate || !manualBlockForm.startTime || !manualBlockForm.endDate || !manualBlockForm.endTime) return;
    try {
      const start = new Date(`${manualBlockForm.startDate}T${manualBlockForm.startTime}:00`);
      const end = new Date(`${manualBlockForm.endDate}T${manualBlockForm.endTime}:00`);
      await blockedTimeService.addBlockedTime({
        title: manualBlockForm.title,
        start: start.toISOString(),
        end: end.toISOString()
      });
      setManualBlockModalOpen(false);
      setManualBlockForm({ title: '', startDate: '', startTime: '', endDate: '', endTime: '' });
      fetchData();
    } catch (error) {
      alert("Erro ao bloquear horário.");
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    setManagerScheduleForm({ ...managerScheduleForm, zipCode: e.target.value });
    
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setManagerScheduleForm(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  const handleManagerScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === managerScheduleForm.clientId);
    if (!client || !client.id) return;

    // Check for double booking
    const start = new Date(`${managerScheduleForm.date}T${managerScheduleForm.time}:00`);
    const end = addMinutes(start, managerScheduleForm.estimatedMinutes);
    
    const hasConflict = [...requests, ...blockedTimes].some(event => {
      let eventStart, eventEnd;
      
      if ('requestedDate' in event) {
        if (event.status === 'rejected') return false;
        eventStart = new Date(`${event.requestedDate}T${event.requestedTime}:00`);
        eventEnd = addMinutes(eventStart, event.estimatedMinutes);
      } else {
        eventStart = new Date(event.start);
        eventEnd = new Date(event.end);
      }

      return (start < eventEnd && end > eventStart);
    });

    if (hasConflict) {
      alert("Já existe uma medição ou bloqueio neste horário. Por favor, escolha outro horário.");
      return;
    }

    try {
      const fullAddress = `${managerScheduleForm.street}, ${managerScheduleForm.number}${managerScheduleForm.complement ? ` - ${managerScheduleForm.complement}` : ''}, ${managerScheduleForm.neighborhood}, ${managerScheduleForm.city} - ${managerScheduleForm.state}, CEP: ${managerScheduleForm.zipCode}`;
      
      await requestService.createRequest({
        clientId: client.id,
        clientName: client.name,
        projectName: managerScheduleForm.projectName,
        address: fullAddress,
        zipCode: managerScheduleForm.zipCode,
        street: managerScheduleForm.street,
        number: managerScheduleForm.number,
        complement: managerScheduleForm.complement,
        neighborhood: managerScheduleForm.neighborhood,
        city: managerScheduleForm.city,
        state: managerScheduleForm.state,
        condominiumName: managerScheduleForm.condominiumName,
        contactName: managerScheduleForm.contactName,
        contactPhone: managerScheduleForm.contactPhone,
        environmentsCount: managerScheduleForm.environmentsCount,
        estimatedMinutes: managerScheduleForm.estimatedMinutes,
        requestedDate: managerScheduleForm.date,
        requestedTime: managerScheduleForm.time,
        status: 'confirmed'
      });
      setManagerScheduleModalOpen(false);
      setManagerScheduleForm({
        clientId: '', projectName: '', zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', condominiumName: '', contactName: '', contactPhone: '', environmentsCount: 1, estimatedMinutes: 60, date: '', time: ''
      });
      fetchData();
    } catch (error) {
      alert("Erro ao agendar medição.");
    }
  };

  const handleMarkAsPaid = async (clientId: string) => {
    try {
      await billingService.markAsPaid(clientId, billingMonth);
      fetchData();
    } catch (error) {
      alert("Erro ao marcar como pago.");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getModelLabel = (model: string) => {
    switch(model) {
      case 'por_ambiente': return 'Por Ambiente';
      case 'pacote': return 'Pacote Mensal';
      case 'avulso': return 'Avulso';
      default: return model;
    }
  };

  // Preparar eventos para o calendário
  const calendarEvents = [
    ...requests.map(req => {
      const start = new Date(`${req.requestedDate}T${req.requestedTime}:00`);
      const end = addMinutes(start, req.estimatedMinutes);
      return {
        id: req.id,
        title: `${req.clientName} (${req.environmentsCount} amb)`,
        start, end, status: req.status, type: 'measurement'
      };
    }),
    ...blockedTimes.map(bt => ({
      id: bt.id,
      title: `🔒 ${bt.title}`,
      start: new Date(bt.start),
      end: new Date(bt.end),
      status: 'blocked',
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
      status: 'holiday',
      type: 'holiday'
    } as any);
  });

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#1c1917'; // stone-900 (Confirmado)
    if (event.status === 'pending') backgroundColor = '#d97706'; // amber-600
    if (event.status === 'completed') backgroundColor = '#059669'; // emerald-600
    if (event.status === 'rejected') backgroundColor = '#dc2626'; // red-600
    if (event.status === 'reschedule_requested') backgroundColor = '#2563eb'; // blue-600
    if (event.type === 'blocked') backgroundColor = '#78716c'; // stone-500 (Bloqueio Pessoal)
    if (event.type === 'holiday') backgroundColor = '#ef4444'; // red-500 (Feriado)

    return { style: { backgroundColor, borderRadius: '6px', opacity: 0.9, color: 'white', border: '0px', display: 'block' } };
  };

  const filteredRequests = requests.filter(req => requestFilter === 'all' || req.status === requestFilter);

  // Lógica de Faturamento (Baseado no mês selecionado)
  const [yearStr, monthStr] = billingMonth.split('-');
  const selectedMonthStart = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const selectedMonthEnd = endOfMonth(selectedMonthStart);
  
  const billingData = clients.map(client => {
    const clientCompletedRequests = requests.filter(req => 
      req.clientId === client.id && 
      req.status === 'completed' &&
      isWithinInterval(new Date(`${req.requestedDate}T12:00:00`), { start: selectedMonthStart, end: selectedMonthEnd })
    );

    const totalEnvs = clientCompletedRequests.reduce((acc, req) => acc + req.environmentsCount, 0);
    const totalKm = clientCompletedRequests.reduce((acc, req) => acc + (req.kmDriven || 0), 0);
    
    const kmPrice = client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice;

    let totalValue = 0;
    if (client.model === 'por_ambiente') {
      totalValue = (totalEnvs * client.baseValue) + (totalKm * kmPrice);
    } else if (client.model === 'pacote') {
      const extraEnvs = Math.max(0, totalEnvs - (client.limitEnvs || 0));
      const extraValue = extraEnvs * (client.baseValue / (client.limitEnvs || 1));
      totalValue = client.baseValue + extraValue + (totalKm * kmPrice);
    } else if (client.model === 'avulso') {
      totalValue = (clientCompletedRequests.length * client.baseValue) + (totalKm * kmPrice);
    }

    // Verificar se já foi pago
    const statusRecord = billingStatuses.find(b => b.id === `${client.id}_${billingMonth}`);
    const isPaid = statusRecord?.status === 'paid';

    return {
      clientId: client.id, clientName: client.name, totalEnvs, totalKm, totalValue, requestsCount: clientCompletedRequests.length, isPaid
    };
  }).filter(b => b.requestsCount > 0);

  const totalBilling = billingData.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalEnvsMonth = billingData.reduce((acc, curr) => acc + curr.totalEnvs, 0);
  const totalKmMonth = billingData.reduce((acc, curr) => acc + curr.totalKm, 0);

  // Dados para o Gráfico (Últimos 6 meses)
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const mStart = startOfMonth(date);
    const mEnd = endOfMonth(date);
    
    let monthTotal = 0;
    
    // Calcula o faturamento daquele mês para todos os clientes
    clients.forEach(client => {
      const reqs = requests.filter(req => 
        req.clientId === client.id && 
        req.status === 'completed' &&
        isWithinInterval(new Date(`${req.requestedDate}T12:00:00`), { start: mStart, end: mEnd })
      );
      
      const envs = reqs.reduce((acc, req) => acc + req.environmentsCount, 0);
      const kms = reqs.reduce((acc, req) => acc + (req.kmDriven || 0), 0);
      const kPrice = client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice;
      
      if (client.model === 'por_ambiente') {
        monthTotal += (envs * client.baseValue) + (kms * kPrice);
      } else if (client.model === 'pacote') {
        const extraEnvs = Math.max(0, envs - (client.limitEnvs || 0));
        const extraValue = extraEnvs * (client.baseValue / (client.limitEnvs || 1));
        monthTotal += client.baseValue + extraValue + (kms * kPrice);
      } else if (client.model === 'avulso') {
        monthTotal += (reqs.length * client.baseValue) + (kms * kPrice);
      }
    });

    chartData.push({
      name: format(date, 'MMM', { locale: ptBR }).toUpperCase(),
      Faturamento: monthTotal
    });
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row relative">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-stone-900 text-stone-300 flex flex-col shrink-0">
        <div className="p-6 flex items-center justify-between md:block">
          <div>
            <h1 className="text-xl font-bold text-white">Leão Medições</h1>
            <p className="text-xs text-stone-500 mt-1">Painel do Gestor</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 flex md:flex-col overflow-x-auto md:overflow-visible pb-4 md:pb-0">
          <button onClick={() => setActiveTab('dashboard')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === 'dashboard' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5" /> <span className="font-medium">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('agenda')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === 'agenda' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800 hover:text-white'}`}>
            <CalendarDays className="w-5 h-5" /> <span className="font-medium">Agenda Geral</span>
          </button>
          <button onClick={() => setActiveTab('requests')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === 'requests' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800 hover:text-white'}`}>
            <CalendarIcon className="w-5 h-5" /> <span className="font-medium">Solicitações</span>
          </button>
          <button onClick={() => setActiveTab('clients')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === 'clients' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Users className="w-5 h-5" /> <span className="font-medium">Clientes (Lojas)</span>
          </button>
          <button onClick={() => setActiveTab('billing')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === 'billing' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800 hover:text-white'}`}>
            <FileText className="w-5 h-5" /> <span className="font-medium">Faturamento</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors shrink-0 md:w-full ${activeTab === 'settings' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800 hover:text-white'}`}>
            <Settings className="w-5 h-5" /> <span className="font-medium">Configurações</span>
          </button>
        </nav>

        <div className="p-4 border-t border-stone-800 hidden md:block">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-stone-800 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" /> <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900">
            {activeTab === 'dashboard' && 'Visão Geral'}
            {activeTab === 'agenda' && 'Agenda Geral'}
            {activeTab === 'requests' && 'Solicitações de Medição'}
            {activeTab === 'clients' && 'Gestão de Clientes'}
            {activeTab === 'billing' && 'Faturamento Mensal'}
            {activeTab === 'settings' && 'Configurações do Sistema'}
          </h2>
          <p className="text-stone-500 mt-1">
            {activeTab === 'dashboard' && 'Acompanhe o desempenho e faturamento dos últimos 6 meses.'}
            {activeTab === 'agenda' && 'Visualize compromissos e clique/arraste para bloquear horários pessoais.'}
            {activeTab === 'requests' && 'Aprove, peça alteração ou marque medições como realizadas.'}
            {activeTab === 'clients' && 'Cadastre e edite lojas e defina regras de cobrança.'}
            {activeTab === 'billing' && 'Consulte o faturamento por mês e marque como pago.'}
            {activeTab === 'settings' && 'Defina valores globais e regras gerais do sistema.'}
          </p>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
          </div>
        ) : (
          <>
            {/* ABA: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <p className="text-sm font-medium text-stone-500 mb-1">Faturamento (Mês Atual)</p>
                    <h3 className="text-3xl font-bold text-stone-900">{formatCurrency(chartData[5].Faturamento)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <p className="text-sm font-medium text-stone-500 mb-1">Medições Realizadas (Mês Atual)</p>
                    <h3 className="text-3xl font-bold text-stone-900">
                      {requests.filter(r => r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: startOfMonth(new Date()), end: endOfMonth(new Date()) })).length}
                    </h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <p className="text-sm font-medium text-stone-500 mb-1">Aguardando Aprovação</p>
                    <h3 className="text-3xl font-bold text-amber-600">
                      {requests.filter(r => r.status === 'pending').length}
                    </h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <h3 className="text-lg font-semibold text-stone-900 mb-6">Faturamento - Últimos 6 Meses</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#78716c' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c' }} tickFormatter={(value) => `R$ ${value}`} />
                        <Tooltip 
                          cursor={{ fill: '#f5f5f4' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                        />
                        <Bar dataKey="Faturamento" fill="#1c1917" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: AGENDA */}
            {activeTab === 'agenda' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 h-[700px]">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-600 mr-2"></div> Pendente</div>
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-stone-900 mr-2"></div> Confirmado</div>
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div> Alteração Solicitada</div>
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-600 mr-2"></div> Realizado</div>
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-stone-500 mr-2"></div> Bloqueio Pessoal</div>
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div> Feriado</div>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowAgendaDropdown(!showAgendaDropdown)} 
                      className="flex items-center px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Novo <ChevronDown className="w-4 h-4 ml-2" />
                    </button>
                    
                    {showAgendaDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-200 z-10 overflow-hidden">
                        <button 
                          onClick={() => { setManualBlockModalOpen(true); setShowAgendaDropdown(false); }} 
                          className="block w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 border-b border-stone-100"
                        >
                          Bloquear Horário
                        </button>
                        <button 
                          onClick={() => { setManagerScheduleModalOpen(true); setShowAgendaDropdown(false); }} 
                          className="block w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-50"
                        >
                          Agendar Medição
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <DnDCalendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 'calc(100% - 40px)' }}
                  view={calendarView}
                  onView={setCalendarView}
                  date={calendarDate}
                  onNavigate={setCalendarDate}
                  eventPropGetter={eventStyleGetter}
                  selectable={true}
                  onSelectSlot={handleSelectSlot}
                  onEventDrop={onEventDrop}
                  onEventResize={onEventResize}
                  resizable={true}
                  messages={{
                    next: "Próximo", previous: "Anterior", today: "Hoje", month: "Mês", week: "Semana", day: "Dia", agenda: "Agenda", noEventsInRange: "Não há eventos neste período."
                  }}
                />
              </div>
            )}

            {/* ABA: SOLICITAÇÕES */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-6 bg-white p-2 rounded-xl border border-stone-200 inline-flex">
                  <Filter className="w-4 h-4 text-stone-400 ml-2" />
                  <select 
                    value={requestFilter} 
                    onChange={(e) => setRequestFilter(e.target.value as any)}
                    className="bg-transparent border-none text-sm font-medium text-stone-700 focus:ring-0 cursor-pointer"
                  >
                    <option value="all">Todas as Solicitações</option>
                    <option value="pending">Aguardando Aprovação</option>
                    <option value="confirmed">Aprovadas (Agendadas)</option>
                    <option value="reschedule_requested">Alteração Solicitada</option>
                    <option value="completed">Realizadas (Faturadas)</option>
                  </select>
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl text-center border border-stone-200 text-stone-500">
                    Nenhuma solicitação encontrada para este filtro.
                  </div>
                ) : (
                  filteredRequests.map((req) => (
                    <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-stone-900">{req.clientName}</h3>
                          {req.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Aguardando Aprovação</span>}
                          {req.status === 'confirmed' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">Aprovada (Agendada)</span>}
                          {req.status === 'completed' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Realizada</span>}
                          {req.status === 'rejected' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Recusada</span>}
                          {req.status === 'reschedule_requested' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Alteração Solicitada</span>}
                        </div>
                        <p className="text-sm text-stone-600 flex items-center mt-1">
                          <MapPin className="w-4 h-4 mr-1.5 text-stone-400 shrink-0" /> {req.address}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-stone-500">
                          <span className="flex items-center"><Ruler className="w-4 h-4 mr-1.5" /> {req.environmentsCount} ambientes</span>
                          <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5" /> {req.estimatedMinutes} min</span>
                          <span className="flex items-center"><CalendarIcon className="w-4 h-4 mr-1.5" /> 
                            {format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM/yyyy')} às {req.requestedTime}
                          </span>
                          {req.kmDriven !== undefined && (
                            <span className="flex items-center font-medium text-emerald-700">
                              🚗 {req.kmDriven} km rodados
                            </span>
                          )}
                        </div>
                        {req.rescheduleReason && (
                          <div className="mt-3 p-3 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100 flex items-start">
                            <MessageSquare className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                            <p><strong>Mensagem enviada ao cliente:</strong> {req.rescheduleReason}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {req.status === 'pending' && (
                          <>
                            <button onClick={() => handleUpdateStatus(req.id!, 'confirmed')} className="flex items-center px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-medium">
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar
                            </button>
                            <button onClick={() => setRescheduleModalOpen(req.id!)} className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium">
                              <MessageSquare className="w-4 h-4 mr-2" /> Pedir Alteração
                            </button>
                            <button onClick={() => handleUpdateStatus(req.id!, 'rejected')} className="flex items-center px-4 py-2 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-colors text-sm font-medium">
                              <XCircle className="w-4 h-4 mr-2" /> Recusar
                            </button>
                          </>
                        )}
                        {req.status === 'confirmed' && (
                          <button onClick={() => setCompleteModalOpen(req.id!)} className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Realizada
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABA: CLIENTES */}
            {activeTab === 'clients' && (
              <div className="space-y-6">
                {!showNewClientForm && !editingClient ? (
                  <>
                    <div className="flex justify-end">
                      <button onClick={() => setShowNewClientForm(true)} className="flex items-center px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-medium">
                        <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                      </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {clients.map(client => (
                        <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-stone-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-stone-900">{client.name}</h3>
                                <p className="text-xs text-stone-500">{client.contact}</p>
                                {client.phone && <p className="text-xs text-stone-500">WA: {client.phone}</p>}
                                {client.cnpj && <p className="text-xs text-stone-500 mt-1">CNPJ: {client.cnpj}</p>}
                                {client.corporateName && <p className="text-xs text-stone-500">Razão Social: {client.corporateName}</p>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                                {getModelLabel(client.model)}
                              </span>
                              <button 
                                onClick={() => setEditingClient(client)}
                                className="text-xs text-stone-500 hover:text-stone-900 flex items-center"
                              >
                                <Edit2 className="w-3 h-3 mr-1" /> Editar
                              </button>
                            </div>
                          </div>
                          <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-stone-500">Valor Base:</span>
                              <span className="font-medium text-stone-900">
                                {client.model === 'avulso' ? 'A combinar' : formatCurrency(client.baseValue)}
                                {client.model === 'por_ambiente' && ' / ambiente'}
                                {client.model === 'pacote' && ' / mês'}
                              </span>
                            </div>
                            {client.model === 'pacote' && client.limitEnvs && (
                              <div className="flex justify-between text-sm">
                                <span className="text-stone-500">Limite do Pacote:</span>
                                <span className="font-medium text-stone-900">{client.limitEnvs} ambientes</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-stone-500">Taxa de KM:</span>
                              <span className="font-medium text-stone-900">
                                {client.kmValue > 0 ? formatCurrency(client.kmValue) : `${formatCurrency(settings.defaultKmPrice)} (Global)`} / km
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 max-w-4xl">
                    <h3 className="text-lg font-semibold text-stone-900 mb-6">
                      {editingClient ? 'Editar Loja' : 'Cadastrar Nova Loja'}
                    </h3>
                    <form onSubmit={(e) => { e.preventDefault(); editingClient ? handleUpdateClient() : handleCreateClient(); }} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 border-b border-stone-200 pb-4 mb-2">
                          <h4 className="text-sm font-semibold text-stone-900">Dados Principais</h4>
                        </div>
                        
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-stone-700 mb-2">Nome Fantasia da Loja</label>
                          <input 
                            type="text" 
                            required
                            value={editingClient ? editingClient.name : newClient.name} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, name: e.target.value}) : setNewClient({...newClient, name: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-stone-700 mb-2">Razão Social</label>
                          <input 
                            type="text" 
                            value={editingClient ? (editingClient.corporateName || '') : newClient.corporateName} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, corporateName: e.target.value}) : setNewClient({...newClient, corporateName: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                          />
                        </div>
                        
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-stone-700 mb-2">CNPJ</label>
                          <input 
                            type="text" 
                            value={editingClient ? (editingClient.cnpj || '') : newClient.cnpj} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, cnpj: e.target.value}) : setNewClient({...newClient, cnpj: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            placeholder="00.000.000/0000-00"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-stone-700 mb-2">Inscrição Estadual</label>
                          <input 
                            type="text" 
                            value={editingClient ? (editingClient.stateRegistration || '') : newClient.stateRegistration} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, stateRegistration: e.target.value}) : setNewClient({...newClient, stateRegistration: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-stone-700 mb-2">Endereço Completo</label>
                          <input 
                            type="text" 
                            value={editingClient ? (editingClient.address || '') : newClient.address} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, address: e.target.value}) : setNewClient({...newClient, address: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            placeholder="Rua, Número, Bairro, Cidade - UF"
                          />
                        </div>

                        <div className="md:col-span-2 border-b border-stone-200 pb-4 mb-2 mt-4">
                          <h4 className="text-sm font-semibold text-stone-900">Contato e Acesso</h4>
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-stone-700 mb-2">Contato Responsável</label>
                          <input 
                            type="text" 
                            value={editingClient ? (editingClient.responsibleContact || '') : newClient.responsibleContact} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, responsibleContact: e.target.value}) : setNewClient({...newClient, responsibleContact: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            placeholder="Nome da pessoa responsável"
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-sm font-medium text-stone-700 mb-2">Telefone WhatsApp</label>
                          <input 
                            type="text" 
                            value={editingClient ? (editingClient.phone || '') : newClient.phone} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, phone: e.target.value}) : setNewClient({...newClient, phone: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            placeholder="Ex: 5511999999999"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-stone-700 mb-2">E-mail de Contato (Login da Loja)</label>
                          <input 
                            type="email" 
                            required
                            value={editingClient ? editingClient.contact : newClient.contact} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, contact: e.target.value}) : setNewClient({...newClient, contact: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            disabled={!!editingClient} // Não deixa mudar o email na edição para não quebrar o login
                          />
                          {editingClient && <p className="text-xs text-stone-500 mt-1">O e-mail de login não pode ser alterado.</p>}
                        </div>

                        <div className="md:col-span-2 border-b border-stone-200 pb-4 mb-2 mt-4">
                          <h4 className="text-sm font-semibold text-stone-900">Regras de Cobrança</h4>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-stone-700 mb-2">Modelo de Contrato</label>
                          <select 
                            value={editingClient ? editingClient.model : newClient.model} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, model: e.target.value as Client['model']}) : setNewClient({...newClient, model: e.target.value as Client['model']})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm"
                          >
                            <option value="por_ambiente">Valor Fixo por Ambiente</option>
                            <option value="pacote">Pacote Mensal Fechado</option>
                            <option value="avulso">Avulso (Combinado no ato)</option>
                          </select>
                        </div>
                        {(editingClient ? editingClient.model : newClient.model) === 'pacote' && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-stone-700 mb-2">Limite de Ambientes do Pacote</label>
                            <input 
                              type="number" 
                              value={editingClient ? editingClient.limitEnvs : newClient.limitEnvs} 
                              onChange={e => editingClient ? setEditingClient({...editingClient, limitEnvs: Number(e.target.value)}) : setNewClient({...newClient, limitEnvs: e.target.value})} 
                              className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-2">Valor Base (R$)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editingClient ? editingClient.baseValue : newClient.baseValue} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, baseValue: Number(e.target.value)}) : setNewClient({...newClient, baseValue: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-2">Valor do KM Rodado (R$)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editingClient ? editingClient.kmValue : newClient.kmValue} 
                            onChange={e => editingClient ? setEditingClient({...editingClient, kmValue: Number(e.target.value)}) : setNewClient({...newClient, kmValue: e.target.value})} 
                            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            placeholder="Deixe 0 para usar o valor global" 
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 pt-6 border-t border-stone-200">
                        <button 
                          type="button" 
                          onClick={() => { setShowNewClientForm(false); setEditingClient(null); }} 
                          className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          disabled={editingClient ? (!editingClient.name || !editingClient.contact) : (!newClient.name || !newClient.contact)} 
                          className="px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {editingClient ? 'Salvar Alterações' : 'Salvar Cliente'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* ABA: FATURAMENTO */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-stone-900">Resumo do Mês</h3>
                  <input 
                    type="month" 
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    className="px-4 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <p className="text-sm font-medium text-stone-500 mb-1">Total a Receber</p>
                    <h3 className="text-2xl font-bold text-stone-900">{formatCurrency(totalBilling)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <p className="text-sm font-medium text-stone-500 mb-1">Ambientes Medidos</p>
                    <h3 className="text-2xl font-bold text-stone-900">{totalEnvsMonth}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <p className="text-sm font-medium text-stone-500 mb-1">KM Rodados</p>
                    <h3 className="text-2xl font-bold text-stone-900">{totalKmMonth} km</h3>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-stone-50 text-stone-600 font-medium border-b border-stone-200">
                        <tr>
                          <th className="px-6 py-4">Cliente / Loja</th>
                          <th className="px-6 py-4 text-center">Medições</th>
                          <th className="px-6 py-4 text-center">Ambientes</th>
                          <th className="px-6 py-4 text-center">KM Rodados</th>
                          <th className="px-6 py-4 text-right">Valor Total</th>
                          <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {billingData.length === 0 ? (
                          <tr><td colSpan={6} className="px-6 py-8 text-center text-stone-500">Nenhuma medição REALIZADA neste mês para gerar faturamento.</td></tr>
                        ) : (
                          billingData.map((bill) => (
                            <tr key={bill.clientId} className="hover:bg-stone-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-stone-900">{bill.clientName}</td>
                              <td className="px-6 py-4 text-center text-stone-600">{bill.requestsCount}</td>
                              <td className="px-6 py-4 text-center text-stone-600">{bill.totalEnvs}</td>
                              <td className="px-6 py-4 text-center text-stone-600">{bill.totalKm}</td>
                              <td className="px-6 py-4 text-right font-medium text-stone-900">{formatCurrency(bill.totalValue)}</td>
                              <td className="px-6 py-4 text-center">
                                {bill.isPaid ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    <Check className="w-3 h-3 mr-1" /> Pago
                                  </span>
                                ) : (
                                  <button 
                                    onClick={() => handleMarkAsPaid(bill.clientId)}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                                  >
                                    Marcar como Pago
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: CONFIGURAÇÕES */}
            {activeTab === 'settings' && (
              <div className="max-w-4xl bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-stone-200">
                  <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center">
                    <Settings className="w-6 h-6 text-stone-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">Configurações do Sistema</h3>
                    <p className="text-sm text-stone-500">Defina valores globais, integração com WhatsApp e notificações.</p>
                  </div>
                </div>

                {/* Submenus */}
                <div className="flex space-x-4 border-b border-stone-200 mb-6 overflow-x-auto">
                  <button onClick={() => setActiveSettingsTab('financeiro')} className={`pb-3 text-sm font-medium whitespace-nowrap ${activeSettingsTab === 'financeiro' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>Financeiro</button>
                  <button onClick={() => setActiveSettingsTab('comunicacao')} className={`pb-3 text-sm font-medium whitespace-nowrap ${activeSettingsTab === 'comunicacao' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>Comunicação (WhatsApp)</button>
                  <button onClick={() => setActiveSettingsTab('feriados')} className={`pb-3 text-sm font-medium whitespace-nowrap ${activeSettingsTab === 'feriados' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>Feriados</button>
                  <button onClick={() => setActiveSettingsTab('outros')} className={`pb-3 text-sm font-medium whitespace-nowrap ${activeSettingsTab === 'outros' ? 'border-b-2 border-stone-900 text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>Outros</button>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-8">
                  {/* Seção: Financeiro */}
                  {activeSettingsTab === 'financeiro' && (
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wider">Financeiro</h4>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Valor Padrão do KM Rodado (R$)</label>
                        <p className="text-xs text-stone-500 mb-3">Este valor será cobrado de lojas que não possuem uma taxa de KM específica cadastrada.</p>
                        <input 
                          type="number" 
                          step="0.01"
                          value={settingsForm.defaultKmPrice}
                          onChange={e => setSettingsForm({ ...settingsForm, defaultKmPrice: e.target.value })}
                          className="w-full md:w-1/2 px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                        />
                      </div>
                    </div>
                  )}

                  {/* Seção: Evolution API */}
                  {activeSettingsTab === 'comunicacao' && (
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wider">Integração WhatsApp (Evolution API)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-stone-700 mb-2">URL da API</label>
                            <input 
                              type="text" 
                              value={settingsForm.evolutionApiUrl}
                              onChange={e => setSettingsForm({ ...settingsForm, evolutionApiUrl: e.target.value })}
                              placeholder="Ex: https://api.suaevolution.com"
                              className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">Nome da Instância</label>
                            <input 
                              type="text" 
                              value={settingsForm.evolutionInstance}
                              onChange={e => setSettingsForm({ ...settingsForm, evolutionInstance: e.target.value })}
                              placeholder="Ex: leao-medicoes"
                              className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">API Key (Token)</label>
                            <input 
                              type="password" 
                              value={settingsForm.evolutionApiKey}
                              onChange={e => setSettingsForm({ ...settingsForm, evolutionApiKey: e.target.value })}
                              placeholder="Seu token da Evolution API"
                              className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            />
                          </div>
                          <div className="md:col-span-2 mt-2">
                            <label className="block text-sm font-medium text-stone-700 mb-2">Seu Telefone (Gestor)</label>
                            <p className="text-xs text-stone-500 mb-2">Número que receberá os avisos de novas solicitações.</p>
                            <input 
                              type="text" 
                              value={settingsForm.managerPhone}
                              onChange={e => setSettingsForm({ ...settingsForm, managerPhone: e.target.value })}
                              placeholder="Ex: 5511999999999"
                              className="w-full md:w-1/2 px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seção: Notificações */}
                      <div className="pt-6 border-t border-stone-200">
                        <h4 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wider">Gatilhos de Notificação</h4>
                        <div className="space-y-4">
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={settingsForm.notifyManagerNewRequest}
                              onChange={e => setSettingsForm({ ...settingsForm, notifyManagerNewRequest: e.target.checked })}
                              className="w-5 h-5 text-stone-900 border-stone-300 rounded focus:ring-stone-900"
                            />
                            <div>
                              <p className="text-sm font-medium text-stone-900">Avisar Gestor (Você)</p>
                              <p className="text-xs text-stone-500">Quando uma loja criar uma nova solicitação de medição.</p>
                            </div>
                          </label>
                          
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={settingsForm.notifyClientApproved}
                              onChange={e => setSettingsForm({ ...settingsForm, notifyClientApproved: e.target.checked })}
                              className="w-5 h-5 text-stone-900 border-stone-300 rounded focus:ring-stone-900"
                            />
                            <div>
                              <p className="text-sm font-medium text-stone-900">Avisar Loja: Aprovação</p>
                              <p className="text-xs text-stone-500">Quando você aprovar uma medição.</p>
                            </div>
                          </label>

                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={settingsForm.notifyClientReschedule}
                              onChange={e => setSettingsForm({ ...settingsForm, notifyClientReschedule: e.target.checked })}
                              className="w-5 h-5 text-stone-900 border-stone-300 rounded focus:ring-stone-900"
                            />
                            <div>
                              <p className="text-sm font-medium text-stone-900">Avisar Loja: Pedido de Alteração</p>
                              <p className="text-xs text-stone-500">Quando você enviar uma mensagem pedindo para alterar o horário.</p>
                            </div>
                          </label>

                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={settingsForm.notifyClientRejected}
                              onChange={e => setSettingsForm({ ...settingsForm, notifyClientRejected: e.target.checked })}
                              className="w-5 h-5 text-stone-900 border-stone-300 rounded focus:ring-stone-900"
                            />
                            <div>
                              <p className="text-sm font-medium text-stone-900">Avisar Loja: Recusa</p>
                              <p className="text-xs text-stone-500">Quando você recusar/cancelar uma solicitação.</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Seção: Feriados */}
                  {activeSettingsTab === 'feriados' && (
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wider">Horário de Funcionamento e Dias Úteis</h4>
                      
                      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h5 className="text-sm font-semibold text-stone-900 mb-3">Dias de Atendimento</h5>
                            <div className="space-y-3">
                              <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={settingsForm.workOnSaturdays}
                                  onChange={e => setSettingsForm({ ...settingsForm, workOnSaturdays: e.target.checked })}
                                  className="w-4 h-4 text-stone-900 border-stone-300 rounded focus:ring-stone-900"
                                />
                                <span className="text-sm text-stone-700">Atender aos Sábados</span>
                              </label>
                              <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={settingsForm.workOnSundays}
                                  onChange={e => setSettingsForm({ ...settingsForm, workOnSundays: e.target.checked })}
                                  className="w-4 h-4 text-stone-900 border-stone-300 rounded focus:ring-stone-900"
                                />
                                <span className="text-sm text-stone-700">Atender aos Domingos</span>
                              </label>
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-semibold text-stone-900 mb-3">Horário da Agenda</h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Abertura</label>
                                <input 
                                  type="time" 
                                  value={settingsForm.workStartTime}
                                  onChange={e => setSettingsForm({ ...settingsForm, workStartTime: e.target.value })}
                                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-stone-900 focus:border-stone-900 sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Fechamento</label>
                                <input 
                                  type="time" 
                                  value={settingsForm.workEndTime}
                                  onChange={e => setSettingsForm({ ...settingsForm, workEndTime: e.target.value })}
                                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-stone-900 focus:border-stone-900 sm:text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-stone-900 mb-4 uppercase tracking-wider mt-8">Feriados e Dias Indisponíveis</h4>
                      
                      <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 mb-6">
                        <h5 className="text-sm font-semibold text-stone-900 mb-3">Feriados Fixos (Obrigatórios)</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-stone-500 border-b border-stone-200">
                              <tr>
                                <th className="pb-2 font-medium">Data (MM-DD)</th>
                                <th className="pb-2 font-medium">Nome</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                              {FIXED_HOLIDAYS.map(h => (
                                <tr key={h.date}>
                                  <td className="py-2 text-stone-600 font-mono text-xs">{h.date}</td>
                                  <td className="py-2 text-stone-900">{h.name}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-stone-200 p-4">
                        <h5 className="text-sm font-semibold text-stone-900 mb-4">Feriados Customizados</h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-stone-500 mb-1 uppercase">Data</label>
                            <input 
                              type={newHoliday.type === 'fixed' ? 'text' : 'date'}
                              placeholder={newHoliday.type === 'fixed' ? 'MM-DD' : ''}
                              value={newHoliday.date}
                              onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-stone-500 mb-1 uppercase">Nome</label>
                            <input 
                              type="text" 
                              placeholder="Ex: Carnaval"
                              value={newHoliday.name}
                              onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-stone-900 focus:border-stone-900 sm:text-sm" 
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-stone-500 mb-1 uppercase">Tipo</label>
                            <select 
                              value={newHoliday.type}
                              onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value as 'fixed' | 'specific' })}
                              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-stone-900 focus:border-stone-900 sm:text-sm"
                            >
                              <option value="fixed">Fixo (Todo ano)</option>
                              <option value="specific">Específico (Apenas este ano)</option>
                            </select>
                          </div>
                          <div className="md:col-span-1 flex items-end">
                            <button 
                              type="button"
                              onClick={handleAddHoliday}
                              disabled={!newHoliday.date || !newHoliday.name}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>

                        {settingsForm.customHolidays.length === 0 ? (
                          <p className="text-center text-sm text-stone-500 py-4">Nenhum feriado customizado cadastrado</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-stone-500 border-b border-stone-200">
                                <tr>
                                  <th className="pb-2 font-medium">Data</th>
                                  <th className="pb-2 font-medium">Nome</th>
                                  <th className="pb-2 font-medium">Tipo</th>
                                  <th className="pb-2 font-medium text-right">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200">
                                {settingsForm.customHolidays.map(h => (
                                  <tr key={h.id}>
                                    <td className="py-2 text-stone-600 font-mono text-xs">{h.date}</td>
                                    <td className="py-2 text-stone-900">{h.name}</td>
                                    <td className="py-2 text-stone-500">{h.type === 'fixed' ? 'Fixo (Anual)' : 'Específico'}</td>
                                    <td className="py-2 text-right">
                                      <button 
                                        type="button"
                                        onClick={() => handleRemoveHoliday(h.id)}
                                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                                      >
                                        Remover
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Seção: Outros */}
                  {activeSettingsTab === 'outros' && (
                    <div className="py-8 text-center">
                      <p className="text-stone-500">Configurações adicionais em breve.</p>
                    </div>
                  )}

                  {activeSettingsTab !== 'feriados' && (
                    <div className="pt-6 border-t border-stone-200">
                      <button type="submit" className="px-6 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-medium w-full md:w-auto">
                        Salvar Configurações
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODALS AQUI (Mantidos iguais) */}
      {completeModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-stone-900 mb-2">Finalizar Medição</h3>
            <p className="text-sm text-stone-500 mb-6">Para gerar o faturamento correto, informe quantos quilômetros foram rodados nesta visita.</p>
            <form onSubmit={handleCompleteRequest}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">KM Rodados (Ida e Volta)</label>
                <input type="number" required min="0" value={kmInput} onChange={e => setKmInput(e.target.value)} className="w-full px-3 py-3 border border-stone-300 rounded-xl focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm" placeholder="Ex: 15" />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setCompleteModalOpen(null)} className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium">Confirmar e Finalizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rescheduleModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4 text-blue-600">
              <MessageSquare className="w-6 h-6" />
              <h3 className="text-lg font-bold text-stone-900">Pedir Alteração de Horário</h3>
            </div>
            <p className="text-sm text-stone-500 mb-6">Envie uma mensagem para a loja sugerindo um novo horário. A loja será notificada (futuramente via WhatsApp).</p>
            <form onSubmit={handleRescheduleRequest}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">Mensagem para a Loja</label>
                <textarea required rows={4} value={rescheduleMessage} onChange={e => setRescheduleMessage(e.target.value)} className="w-full px-3 py-3 border border-stone-300 rounded-xl focus:ring-blue-600 focus:border-blue-600 sm:text-sm" placeholder="Ex: Olá! Infelizmente neste horário estou em outra obra. Podemos alterar para as 15h?" />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setRescheduleModalOpen(null)} className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">Enviar Solicitação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {blockTimeModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4 text-stone-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-stone-900">Bloquear Horário Pessoal</h3>
            </div>
            <p className="text-sm text-stone-500 mb-6">
              Este horário ficará indisponível para os clientes agendarem medições.<br/><br/>
              <strong>Início:</strong> {format(blockTimeModalOpen.start, "dd/MM 'às' HH:mm")}<br/>
              <strong>Fim:</strong> {format(blockTimeModalOpen.end, "dd/MM 'às' HH:mm")}
            </p>
            <form onSubmit={handleCreateBlockedTime}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">Motivo / Título (Apenas você vê)</label>
                <input type="text" required value={blockTimeTitle} onChange={e => setBlockTimeTitle(e.target.value)} className="w-full px-3 py-3 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" placeholder="Ex: Consulta Médica, Almoço, etc." />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setBlockTimeModalOpen(null)} className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-medium">Bloquear Horário</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {manualBlockModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4 text-stone-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-stone-900">Bloquear Horário Manualmente</h3>
            </div>
            <form onSubmit={handleManualBlockSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">Motivo / Título</label>
                <input type="text" required value={manualBlockForm.title} onChange={e => setManualBlockForm({...manualBlockForm, title: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" placeholder="Ex: Consulta Médica" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Data Início</label>
                  <input type="date" required value={manualBlockForm.startDate} onChange={e => setManualBlockForm({...manualBlockForm, startDate: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Hora Início</label>
                  <input type="time" required value={manualBlockForm.startTime} onChange={e => setManualBlockForm({...manualBlockForm, startTime: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Data Fim</label>
                  <input type="date" required value={manualBlockForm.endDate} onChange={e => setManualBlockForm({...manualBlockForm, endDate: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Hora Fim</label>
                  <input type="time" required value={manualBlockForm.endTime} onChange={e => setManualBlockForm({...manualBlockForm, endTime: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-stone-900 focus:border-stone-900 sm:text-sm" />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setManualBlockModalOpen(false)} className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-sm font-medium">Bloquear Horário</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {managerScheduleModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4 text-emerald-600">
              <CalendarIcon className="w-6 h-6" />
              <h3 className="text-lg font-bold text-stone-900">Agendar Nova Medição</h3>
            </div>
            <form onSubmit={handleManagerScheduleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">Cliente (Loja)</label>
                <select required value={managerScheduleForm.clientId} onChange={e => setManagerScheduleForm({...managerScheduleForm, clientId: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm">
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">Endereço da Obra</label>
                <input type="text" required value={managerScheduleForm.address} onChange={e => setManagerScheduleForm({...managerScheduleForm, address: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm" placeholder="Rua, Número, Bairro, Cidade" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">Qtd. de Ambientes</label>
                <input type="number" required min="1" value={managerScheduleForm.environmentsCount} onChange={e => setManagerScheduleForm({...managerScheduleForm, environmentsCount: Number(e.target.value)})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Data</label>
                  <input type="date" required value={managerScheduleForm.date} onChange={e => setManagerScheduleForm({...managerScheduleForm, date: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Hora</label>
                  <input type="time" required value={managerScheduleForm.time} onChange={e => setManagerScheduleForm({...managerScheduleForm, time: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm" />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setManagerScheduleModalOpen(false)} className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium">Agendar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
