<<<<<<< HEAD
import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { blockedTimeService } from '../../services/blockedTimeService';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
     slot: { start: Date; end: Date } | null;
     onClose: () => void;
     onSuccess: () => void;
}

export default function BlockTimeModal({ slot, onClose, onSuccess }: Props) {
     const [title, setTitle] = useState('');
     // Manual form state (when no slot is pre-selected)
     const [startDate, setStartDate] = useState('');
     const [startTime, setStartTime] = useState('');
     const [endDate, setEndDate] = useState('');
     const [endTime, setEndTime] = useState('');
     const [isLoading, setIsLoading] = useState(false);

     const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!title) return;

          let start: Date, end: Date;
          if (slot) {
               start = slot.start;
               end = slot.end;
          } else {
               if (!startDate || !startTime || !endDate || !endTime) {
                    toast.error('Preencha todas as datas e horas.');
                    return;
               }
               start = new Date(`${startDate}T${startTime}:00`);
               end = new Date(`${endDate}T${endTime}:00`);
               if (end <= start) {
                    toast.error('O horário de fim deve ser após o início.');
                    return;
               }
          }

          setIsLoading(true);
          try {
               await blockedTimeService.addBlockedTime({
                    title,
                    start: start.toISOString(),
                    end: end.toISOString(),
               });
               toast.success('Horário bloqueado com sucesso!');
               onClose();
               onSuccess();
          } catch (error) {
               toast.error('Erro ao bloquear horário. Tente novamente.');
          } finally {
               setIsLoading(false);
          }
     };

     return (
          <div className="fixed inset-0 bg-blue-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center space-x-3 mb-4 text-slate-600">
                         <ShieldAlert className="w-6 h-6" />
                         <h3 className="text-lg font-bold text-slate-900">Bloquear Horário Pessoal</h3>
                    </div>
                    {slot ? (
                         <p className="text-sm text-slate-500 mb-6">
                              Este horário ficará indisponível para os clientes agendarem medições.<br /><br />
                              <strong>Início:</strong> {format(slot.start, "dd/MM 'às' HH:mm")}<br />
                              <strong>Fim:</strong> {format(slot.end, "dd/MM 'às' HH:mm")}
                         </p>
                    ) : (
                         <p className="text-sm text-slate-500 mb-4">Informe o período que deseja bloquear manualmente.</p>
                    )}
                    <form onSubmit={handleSubmit}>
                         <div className="mb-4">
                              <label className="block text-sm font-medium text-slate-700 mb-2">Motivo / Título (Apenas você vê)</label>
                              <input
                                   type="text"
                                   required
                                   value={title}
                                   onChange={e => setTitle(e.target.value)}
                                   className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm"
                                   placeholder="Ex: Consulta Médica, Almoço, etc."
                                   autoFocus
                              />
                         </div>
                         {!slot && (
                              <>
                                   <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-2">Data Início</label>
                                             <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                                        </div>
                                        <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-2">Hora Início</label>
                                             <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                                        </div>
                                   </div>
                                   <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-2">Data Fim</label>
                                             <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                                        </div>
                                        <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-2">Hora Fim</label>
                                             <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                                        </div>
                                   </div>
                              </>
                         )}
                         <div className="flex justify-end space-x-3 mt-6">
                              <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
                                   Cancelar
                              </button>
                              <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-950 text-white rounded-xl hover:bg-blue-900 transition-colors text-sm font-medium disabled:opacity-50">
                                   {isLoading ? 'Salvando...' : 'Bloquear Horário'}
                              </button>
                         </div>
                    </form>
               </div>
          </div>
     );
}
=======
import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { blockedTimeService } from '../../services/blockedTimeService';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
     slot: { start: Date; end: Date } | null;
     onClose: () => void;
     onSuccess: () => void;
}

export default function BlockTimeModal({ slot, onClose, onSuccess }: Props) {
     const [title, setTitle] = useState('');
     // Manual form state (when no slot is pre-selected)
     const [startDate, setStartDate] = useState('');
     const [startTime, setStartTime] = useState('');
     const [endDate, setEndDate] = useState('');
     const [endTime, setEndTime] = useState('');
     const [isLoading, setIsLoading] = useState(false);

     const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!title) return;

          let start: Date, end: Date;
          if (slot) {
               start = slot.start;
               end = slot.end;
          } else {
               if (!startDate || !startTime || !endDate || !endTime) {
                    toast.error('Preencha todas as datas e horas.');
                    return;
               }
               start = new Date(`${startDate}T${startTime}:00`);
               end = new Date(`${endDate}T${endTime}:00`);
               if (end <= start) {
                    toast.error('O horário de fim deve ser após o início.');
                    return;
               }
          }

          setIsLoading(true);
          try {
               await blockedTimeService.addBlockedTime({
                    title,
                    start: start.toISOString(),
                    end: end.toISOString(),
               });
               toast.success('Horário bloqueado com sucesso!');
               onClose();
               onSuccess();
          } catch (error) {
               toast.error('Erro ao bloquear horário. Tente novamente.');
          } finally {
               setIsLoading(false);
          }
     };

     return (
          <div className="fixed inset-0 bg-blue-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center space-x-3 mb-4 text-slate-600">
                         <ShieldAlert className="w-6 h-6" />
                         <h3 className="text-lg font-bold text-slate-900">Bloquear Horário Pessoal</h3>
                    </div>
                    {slot ? (
                         <p className="text-sm text-slate-500 mb-6">
                              Este horário ficará indisponível para os clientes agendarem medições.<br /><br />
                              <strong>Início:</strong> {format(slot.start, "dd/MM 'às' HH:mm")}<br />
                              <strong>Fim:</strong> {format(slot.end, "dd/MM 'às' HH:mm")}
                         </p>
                    ) : (
                         <p className="text-sm text-slate-500 mb-4">Informe o período que deseja bloquear manualmente.</p>
                    )}
                    <form onSubmit={handleSubmit}>
                         <div className="mb-4">
                              <label className="block text-sm font-medium text-slate-700 mb-2">Motivo / Título (Apenas você vê)</label>
                              <input
                                   type="text"
                                   required
                                   value={title}
                                   onChange={e => setTitle(e.target.value)}
                                   className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm"
                                   placeholder="Ex: Consulta Médica, Almoço, etc."
                                   autoFocus
                              />
                         </div>
                         {!slot && (
                              <>
                                   <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-2">Data Início</label>
                                             <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                                        </div>
                                        <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-2">Hora Início</label>
                                             <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                                        </div>
                                   </div>
                                   <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-2">Data Fim</label>
                                             <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                                        </div>
                                        <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-2">Hora Fim</label>
                                             <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                                        </div>
                                   </div>
                              </>
                         )}
                         <div className="flex justify-end space-x-3 mt-6">
                              <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
                                   Cancelar
                              </button>
                              <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-950 text-white rounded-xl hover:bg-blue-900 transition-colors text-sm font-medium disabled:opacity-50">
                                   {isLoading ? 'Salvando...' : 'Bloquear Horário'}
                              </button>
                         </div>
                    </form>
               </div>
          </div>
     );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
