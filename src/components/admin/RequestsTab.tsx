<<<<<<< HEAD
import { CheckCircle2, XCircle, MessageSquare, MapPin, Ruler, Clock, CalendarIcon, Filter, Trash2 } from 'lucide-react';
import { MeasurementRequest, RequestStatus } from '../../services/requestService';
import { GlobalSettings } from '../../services/settingsService';
import { Client } from '../../services/clientService';
import { requestService } from '../../services/requestService';
import { whatsappService } from '../../services/whatsappService';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';
import { BlockedTime } from '../../services/blockedTimeService';
import AppointmentModal from './AppointmentModal';

interface Props {
     requests: MeasurementRequest[];
     filter: RequestStatus | 'all';
     onFilterChange: (f: RequestStatus | 'all') => void;
     clients: Client[];
     settings: GlobalSettings;
     blockedTimes: BlockedTime[];
     onCompleteOpen: (id: string) => void;
     onRescheduleOpen: (req: MeasurementRequest) => void;
     onRefresh: () => void;
}

export default function RequestsTab({ requests, filter, onFilterChange, clients, settings, blockedTimes, onCompleteOpen, onRescheduleOpen, onRefresh }: Props) {
     const [clientFilter, setClientFilter] = useState<string>('all');
     const [editRequest, setEditRequest] = useState<MeasurementRequest | null>(null);

     const filtered = requests.filter(r => {
          const matchStatus = filter === 'all' || r.status === filter;
          const matchClient = clientFilter === 'all' || r.clientId === clientFilter;
          return matchStatus && matchClient;
     });

     const handleUpdateStatus = async (id: string, status: RequestStatus) => {
          try {
               await requestService.updateRequestStatus(id, status);
               const req = requests.find(r => r.id === id);
               if (req) {
                    const client = clients.find(c => c.id === req.clientId);
                    if (client?.phone) {
                         if (status === 'confirmed' && settings.notifyClientApproved) {
                              whatsappService.sendMessage(client.phone, `✅ Olá ${client.name}!\n\nSua medição do dia *${format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM')} às ${req.requestedTime}* foi *APROVADA* pela Leão Medições.\n\nEndereço: ${req.address}`, settings);
                         } else if (status === 'rejected' && settings.notifyClientRejected) {
                              whatsappService.sendMessage(client.phone, `❌ Olá ${client.name}.\n\nInfelizmente sua solicitação de medição do dia *${format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM')} às ${req.requestedTime}* foi *RECUSADA*.\n\nPor favor, acesse o portal para agendar um novo horário.`, settings);
                         }
                    }
               }
               toast.success(status === 'confirmed' ? 'Medição aprovada!' : 'Medição recusada.');
               onRefresh();
          } catch {
               toast.error('Erro ao atualizar status.');
          }
     };

     const handleDelete = async (id: string, clientName: string) => {
          if (window.confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE a solicitação de ${clientName}?\nIsso removerá a medição da agenda e de todos os relatórios de faturamento. Esta ação não pode ser desfeita.`)) {
               try {
                    await requestService.deleteRequest(id);
                    toast.success('Solicitação excluída com sucesso!');
                    onRefresh();
               } catch {
                    toast.error('Erro ao excluir solicitação.');
               }
          }
     };

     const STATUS_LABELS: Record<string, string> = {
          pending: 'Aguardando Aprovação',
          confirmed: 'Aprovada (Agendada)',
          completed: 'Realizada',
          rejected: 'Recusada',
          reschedule_requested: 'Alteração Solicitada',
     };
     const STATUS_COLORS: Record<string, string> = {
          pending: 'bg-amber-100 text-amber-800',
          confirmed: 'bg-slate-100 text-slate-800',
          completed: 'bg-emerald-100 text-emerald-800',
          rejected: 'bg-red-100 text-red-800',
          reschedule_requested: 'bg-blue-100 text-blue-800',
     };

     return (
          <div className="space-y-4">
               <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-6 bg-white p-2 rounded-xl border border-slate-200">
                    <div className="flex items-center space-x-2 px-2">
                         <Filter className="w-5 h-5 sm:w-4 sm:h-4 text-slate-400" />
                         <span className="text-sm font-semibold text-slate-600 sm:hidden">Filtros</span>
                    </div>
                    <select value={filter} onChange={e => onFilterChange(e.target.value as any)} className="bg-slate-50 sm:bg-transparent border border-slate-200 sm:border-none rounded-lg sm:rounded-none px-3 py-2 text-sm font-medium text-slate-700 focus:ring-blue-500 cursor-pointer w-full sm:w-auto flex-1 md:flex-none">
                         <option value="all">Status: Todas</option>
                         <option value="pending">Status: Aguardando Aprovação</option>
                         <option value="confirmed">Status: Aprovadas (Agendadas)</option>
                         <option value="reschedule_requested">Status: Alteração Solicitada</option>
                         <option value="completed">Status: Realizadas (Faturadas)</option>
                    </select>
                    <div className="hidden sm:block w-px h-6 bg-slate-200 mx-2"></div>
                    <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="bg-slate-50 sm:bg-transparent border border-slate-200 sm:border-none rounded-lg sm:rounded-none px-3 py-2 text-sm font-medium text-slate-700 focus:ring-blue-500 cursor-pointer w-full sm:w-auto flex-1 md:flex-none">
                         <option value="all">Loja: Todas</option>
                         {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
               </div>

               {filtered.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 text-slate-500">Nenhuma solicitação encontrada para este filtro.</div>
               ) : (
                    filtered.map(req => (
                         <div key={req.id} onClick={() => setEditRequest(req)} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-start justify-between gap-4 cursor-pointer hover:border-blue-300 transition-colors relative">
                              <div className="flex-1">
                                   <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold text-slate-900">{req.clientName}</h3>
                                        {req.projectName && <span className="text-sm text-slate-500">— {req.projectName}</span>}
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || ''}`}>
                                             {STATUS_LABELS[req.status] || req.status}
                                        </span>
                                        <button
                                             onClick={(e) => { e.stopPropagation(); handleDelete(req.id!, req.clientName); }}
                                             className="ml-auto p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors sm:hidden"
                                             title="Excluir Definitivamente"
                                        >
                                             <Trash2 className="w-5 h-5" />
                                        </button>
                                   </div>
                                   <p className="text-sm text-slate-600 flex items-center mt-1"><MapPin className="w-4 h-4 mr-1.5 text-slate-400 shrink-0" />{req.address}</p>
                                   {req.contactName && <p className="text-sm text-slate-500 mt-1">Contato: {req.contactName} {req.contactPhone && `— ${req.contactPhone}`}</p>}
                                   <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                                        <span className="flex items-center"><Ruler className="w-4 h-4 mr-1.5" />{req.environmentsCount} ambientes</span>
                                        <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5" />{req.estimatedMinutes} min</span>
                                        <span className="flex items-center"><CalendarIcon className="w-4 h-4 mr-1.5" />{format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM/yyyy')} às {req.requestedTime}</span>
                                        {req.kmDriven !== undefined && <span className="flex items-center font-medium text-emerald-700">🚗 {req.kmDriven} km rodados</span>}
                                   </div>
                                   {req.rescheduleReason && (
                                        <div className="mt-3 p-3 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100 flex items-start">
                                             <MessageSquare className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                                             <p><strong>Mensagem enviada ao cliente:</strong> {req.rescheduleReason}</p>
                                        </div>
                                   )}
                              </div>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full lg:w-auto mt-4 lg:mt-0" onClick={e => e.stopPropagation()}>
                                   <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent(req.address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center px-4 py-2.5 bg-sky-50 text-sky-700 rounded-xl hover:bg-sky-100 transition-colors text-sm font-medium w-full sm:w-auto"
                                   >
                                        <MapPin className="w-4 h-4 mr-2" /> Navegar
                                   </a>
                                   {req.status === 'pending' && (<>
                                        <button onClick={() => handleUpdateStatus(req.id!, 'confirmed')} className="flex items-center justify-center px-4 py-2.5 bg-blue-950 text-white rounded-xl hover:bg-blue-900 transition-colors text-sm font-medium w-full sm:w-auto"><CheckCircle2 className="w-4 h-4 mr-2" />Aprovar</button>
                                        <button onClick={() => onRescheduleOpen(req)} className="flex items-center justify-center px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium w-full sm:w-auto"><MessageSquare className="w-4 h-4 mr-2" />Pedir Alteração</button>
                                        <button onClick={() => handleUpdateStatus(req.id!, 'rejected')} className="flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium w-full sm:w-auto"><XCircle className="w-4 h-4 mr-2" />Recusar</button>
                                   </>)}
                                   {req.status === 'confirmed' && (
                                        <button onClick={() => onCompleteOpen(req.id!)} className="flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium w-full sm:w-auto"><CheckCircle2 className="w-4 h-4 mr-2" />Concluir</button>
                                   )}
                                   <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(req.id!, req.clientName); }}
                                        className="hidden sm:flex items-center justify-center px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium w-full sm:w-auto"
                                        title="Excluir Sistema"
                                   >
                                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                   </button>
                              </div>
                         </div>
                    ))
               )}

               {editRequest && (
                    <AppointmentModal
                         editRequest={editRequest}
                         clients={clients}
                         requests={requests}
                         blockedTimes={blockedTimes}
                         settings={settings}
                         onClose={() => setEditRequest(null)}
                         onSuccess={() => { setEditRequest(null); onRefresh(); }}
                    />
               )}
          </div>
     );
}
=======
import { CheckCircle2, XCircle, MessageSquare, MapPin, Ruler, Clock, CalendarIcon, Filter } from 'lucide-react';
import { MeasurementRequest, RequestStatus } from '../../services/requestService';
import { GlobalSettings } from '../../services/settingsService';
import { Client } from '../../services/clientService';
import { requestService } from '../../services/requestService';
import { whatsappService } from '../../services/whatsappService';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
     requests: MeasurementRequest[];
     filter: RequestStatus | 'all';
     onFilterChange: (f: RequestStatus | 'all') => void;
     clients: Client[];
     settings: GlobalSettings;
     onCompleteOpen: (id: string) => void;
     onRescheduleOpen: (req: MeasurementRequest) => void;
     onRefresh: () => void;
}

export default function RequestsTab({ requests, filter, onFilterChange, clients, settings, onCompleteOpen, onRescheduleOpen, onRefresh }: Props) {
     const filtered = requests.filter(r => filter === 'all' || r.status === filter);

     const handleUpdateStatus = async (id: string, status: RequestStatus) => {
          try {
               await requestService.updateRequestStatus(id, status);
               const req = requests.find(r => r.id === id);
               if (req) {
                    const client = clients.find(c => c.id === req.clientId);
                    if (client?.phone) {
                         if (status === 'confirmed' && settings.notifyClientApproved) {
                              whatsappService.sendMessage(client.phone, `✅ Olá ${client.name}!\n\nSua medição do dia *${format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM')} às ${req.requestedTime}* foi *APROVADA* pela Leão Medições.\n\nEndereço: ${req.address}`, settings);
                         } else if (status === 'rejected' && settings.notifyClientRejected) {
                              whatsappService.sendMessage(client.phone, `❌ Olá ${client.name}.\n\nInfelizmente sua solicitação de medição do dia *${format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM')} às ${req.requestedTime}* foi *RECUSADA*.\n\nPor favor, acesse o portal para agendar um novo horário.`, settings);
                         }
                    }
               }
               toast.success(status === 'confirmed' ? 'Medição aprovada!' : 'Medição recusada.');
               onRefresh();
          } catch {
               toast.error('Erro ao atualizar status.');
          }
     };

     const STATUS_LABELS: Record<string, string> = {
          pending: 'Aguardando Aprovação',
          confirmed: 'Aprovada (Agendada)',
          completed: 'Realizada',
          rejected: 'Recusada',
          reschedule_requested: 'Alteração Solicitada',
     };
     const STATUS_COLORS: Record<string, string> = {
          pending: 'bg-amber-100 text-amber-800',
          confirmed: 'bg-slate-100 text-slate-800',
          completed: 'bg-emerald-100 text-emerald-800',
          rejected: 'bg-red-100 text-red-800',
          reschedule_requested: 'bg-blue-100 text-blue-800',
     };

     return (
          <div className="space-y-4">
               <div className="flex items-center space-x-2 mb-6 bg-white p-2 rounded-xl border border-slate-200 inline-flex">
                    <Filter className="w-4 h-4 text-slate-400 ml-2" />
                    <select value={filter} onChange={e => onFilterChange(e.target.value as any)} className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer">
                         <option value="all">Todas as Solicitações</option>
                         <option value="pending">Aguardando Aprovação</option>
                         <option value="confirmed">Aprovadas (Agendadas)</option>
                         <option value="reschedule_requested">Alteração Solicitada</option>
                         <option value="completed">Realizadas (Faturadas)</option>
                    </select>
               </div>

               {filtered.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 text-slate-500">Nenhuma solicitação encontrada para este filtro.</div>
               ) : (
                    filtered.map(req => (
                         <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                              <div className="flex-1">
                                   <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold text-slate-900">{req.clientName}</h3>
                                        {req.projectName && <span className="text-sm text-slate-500">— {req.projectName}</span>}
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || ''}`}>
                                             {STATUS_LABELS[req.status] || req.status}
                                        </span>
                                   </div>
                                   <p className="text-sm text-slate-600 flex items-center mt-1"><MapPin className="w-4 h-4 mr-1.5 text-slate-400 shrink-0" />{req.address}</p>
                                   {req.contactName && <p className="text-sm text-slate-500 mt-1">Contato: {req.contactName} {req.contactPhone && `— ${req.contactPhone}`}</p>}
                                   <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                                        <span className="flex items-center"><Ruler className="w-4 h-4 mr-1.5" />{req.environmentsCount} ambientes</span>
                                        <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5" />{req.estimatedMinutes} min</span>
                                        <span className="flex items-center"><CalendarIcon className="w-4 h-4 mr-1.5" />{format(new Date(req.requestedDate + 'T12:00:00'), 'dd/MM/yyyy')} às {req.requestedTime}</span>
                                        {req.kmDriven !== undefined && <span className="flex items-center font-medium text-emerald-700">🚗 {req.kmDriven} km rodados</span>}
                                   </div>
                                   {req.rescheduleReason && (
                                        <div className="mt-3 p-3 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100 flex items-start">
                                             <MessageSquare className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                                             <p><strong>Mensagem enviada ao cliente:</strong> {req.rescheduleReason}</p>
                                        </div>
                                   )}
                              </div>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full lg:w-auto mt-4 lg:mt-0">
                                   {req.status === 'pending' && (<>
                                        <button onClick={() => handleUpdateStatus(req.id!, 'confirmed')} className="flex items-center justify-center px-4 py-2.5 bg-blue-950 text-white rounded-xl hover:bg-blue-900 transition-colors text-sm font-medium w-full sm:w-auto"><CheckCircle2 className="w-4 h-4 mr-2" />Aprovar</button>
                                        <button onClick={() => onRescheduleOpen(req)} className="flex items-center justify-center px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors text-sm font-medium w-full sm:w-auto"><MessageSquare className="w-4 h-4 mr-2" />Pedir Alteração</button>
                                        <button onClick={() => handleUpdateStatus(req.id!, 'rejected')} className="flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium w-full sm:w-auto"><XCircle className="w-4 h-4 mr-2" />Recusar</button>
                                   </>)}
                                   {req.status === 'confirmed' && (
                                        <button onClick={() => onCompleteOpen(req.id!)} className="flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium w-full sm:w-auto"><CheckCircle2 className="w-4 h-4 mr-2" />Marcar como Realizada</button>
                                   )}
                              </div>
                         </div>
                    ))
               )}
          </div>
     );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
