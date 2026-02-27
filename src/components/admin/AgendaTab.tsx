import { useState } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { format, parse, startOfWeek, getDay, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Lock } from 'lucide-react';
import { MeasurementRequest } from '../../services/requestService';
import { BlockedTime, blockedTimeService } from '../../services/blockedTimeService';
import { GlobalSettings, FIXED_HOLIDAYS } from '../../services/settingsService';
import { Client } from '../../services/clientService';
import AppointmentModal from './AppointmentModal';
import BlockTimeModal from './BlockTimeModal';
import { toast } from 'sonner';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop(Calendar);

const PT_BR_MESSAGES = {
     next: 'Próximo',
     previous: 'Anterior',
     today: 'Hoje',
     month: 'Mês',
     week: 'Semana',
     day: 'Dia',
     agenda: 'Agenda',
     date: 'Data',
     time: 'Hora',
     event: 'Evento',
     noEventsInRange: 'Não há eventos neste período.',
     showMore: (total: number) => `+ ${total} mais`,
};

interface Props {
     requests: MeasurementRequest[];
     blockedTimes: BlockedTime[];
     settings: GlobalSettings;
     clients: Client[];
     onRefresh: () => void;
}

export default function AgendaTab({ requests, blockedTimes, settings, clients, onRefresh }: Props) {
     const [view, setView] = useState<View>(Views.WEEK);
     const [date, setDate] = useState(new Date());
     const [appointmentModal, setAppointmentModal] = useState<{ date: string; time: string } | null>(null);
     const [blockModal, setBlockModal] = useState<{ start: Date; end: Date } | null>(null);
     const [manualBlockOpen, setManualBlockOpen] = useState(false);

     // Eventos do calendário
     const currentYear = date.getFullYear();
     const allHolidays = [
          ...FIXED_HOLIDAYS.map(h => ({ ...h, type: 'fixed' as const })),
          ...(settings.customHolidays || []),
     ];

     const calendarEvents: any[] = [
          ...requests.map(req => {
               const start = new Date(`${req.requestedDate}T${req.requestedTime}:00`);
               const end = addMinutes(start, req.estimatedMinutes);
               return { id: req.id, title: `${req.clientName} (${req.environmentsCount} amb)`, start, end, status: req.status, type: 'request' };
          }),
          ...blockedTimes.map(bt => ({
               id: bt.id,
               title: `🔒 ${bt.title}`,
               start: new Date(bt.start),
               end: new Date(bt.end),
               status: 'blocked',
               type: 'blocked',
          })),
          ...allHolidays.map(holiday => {
               let dateStr = holiday.date;
               if (holiday.type === 'fixed') dateStr = `${currentYear}-${holiday.date}`;
               return {
                    id: `holiday-${holiday.name}-${dateStr}`,
                    title: `🏖️ Feriado: ${holiday.name}`,
                    start: new Date(`${dateStr}T00:00:00`),
                    end: new Date(`${dateStr}T23:59:59`),
                    status: 'holiday',
                    type: 'holiday',
               };
          }),
     ];

     const eventStyleGetter = (event: any) => {
          let bg = '#1c1917';
          if (event.status === 'pending') bg = '#d97706';
          if (event.status === 'completed') bg = '#059669';
          if (event.status === 'rejected') bg = '#dc2626';
          if (event.status === 'reschedule_requested') bg = '#2563eb';
          if (event.type === 'blocked') bg = '#78716c';
          if (event.type === 'holiday') bg = '#ef4444';
          return { style: { backgroundColor: bg, borderRadius: '6px', opacity: 0.9, color: 'white', border: '0', display: 'block' } };
     };

     const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
          // Clique em slot vazio → abre modal de agendamento diretamente
          setAppointmentModal({
               date: format(start, 'yyyy-MM-dd'),
               time: format(start, 'HH:mm'),
          });
     };

     const onEventDrop = async ({ event, start, end }: any) => {
          try {
               if (event.type === 'blocked') {
                    await blockedTimeService.updateBlockedTime(event.id, { start: (start as Date).toISOString(), end: (end as Date).toISOString() });
               } else if (event.type === 'request') {
                    const { requestService } = await import('../../services/requestService');
                    await requestService.updateRequestStatus(event.id, event.status, {
                         requestedDate: format(start as Date, 'yyyy-MM-dd'),
                         requestedTime: format(start as Date, 'HH:mm'),
                         estimatedMinutes: Math.round(((end as Date).getTime() - (start as Date).getTime()) / 60000),
                    });
               }
               toast.success('Evento atualizado!');
               onRefresh();
          } catch {
               toast.error('Erro ao mover evento.');
          }
     };

     const onEventResize = async ({ event, start, end }: any) => {
          try {
               if (event.type === 'blocked') {
                    await blockedTimeService.updateBlockedTime(event.id, { start: (start as Date).toISOString(), end: (end as Date).toISOString() });
               } else if (event.type === 'request') {
                    const { requestService } = await import('../../services/requestService');
                    await requestService.updateRequestStatus(event.id, event.status, {
                         requestedDate: format(start as Date, 'yyyy-MM-dd'),
                         requestedTime: format(start as Date, 'HH:mm'),
                         estimatedMinutes: Math.round(((end as Date).getTime() - (start as Date).getTime()) / 60000),
                    });
               }
               toast.success('Evento redimensionado!');
               onRefresh();
          } catch {
               toast.error('Erro ao redimensionar evento.');
          }
     };

     return (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 h-[780px] flex flex-col">
               {/* Toolbar */}
               <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                         <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />Pendente</span>
                         <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-stone-900 inline-block" />Confirmado</span>
                         <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />Alt. Solicitada</span>
                         <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />Realizado</span>
                         <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-stone-500 inline-block" />Bloqueio</span>
                         <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Feriado</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <button
                              onClick={() => setManualBlockOpen(true)}
                              className="flex items-center px-3 py-2 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-colors text-sm font-medium"
                         >
                              <Lock className="w-4 h-4 mr-1.5" /> Bloquear
                         </button>
                         <button
                              onClick={() => setAppointmentModal({ date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm') })}
                              className="flex items-center px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
                         >
                              <Plus className="w-4 h-4 mr-1.5" /> Agendar
                         </button>
                    </div>
               </div>

               {/* Calendar */}
               <div className="flex-1 min-h-0">
                    <DnDCalendar
                         localizer={localizer}
                         culture="pt-BR"
                         events={calendarEvents}
                         startAccessor={(event: any) => event.start}
                         endAccessor={(event: any) => event.end}
                         style={{ height: '100%' }}
                         view={view}
                         onView={setView}
                         date={date}
                         onNavigate={setDate}
                         eventPropGetter={eventStyleGetter}
                         selectable={true}
                         onSelectSlot={handleSelectSlot}
                         onEventDrop={onEventDrop}
                         onEventResize={onEventResize}
                         resizable={true}
                         step={30}
                         timeslots={1}
                         messages={PT_BR_MESSAGES}
                    />
               </div>

               {/* Modals */}
               {appointmentModal && (
                    <AppointmentModal
                         initialDate={appointmentModal.date}
                         initialTime={appointmentModal.time}
                         clients={clients}
                         requests={requests}
                         blockedTimes={blockedTimes}
                         settings={settings}
                         onClose={() => setAppointmentModal(null)}
                         onSuccess={() => { setAppointmentModal(null); onRefresh(); }}
                    />
               )}
               {(blockModal || manualBlockOpen) && (
                    <BlockTimeModal
                         slot={blockModal}
                         onClose={() => { setBlockModal(null); setManualBlockOpen(false); }}
                         onSuccess={() => { setBlockModal(null); setManualBlockOpen(false); onRefresh(); }}
                    />
               )}
          </div>
     );
}
