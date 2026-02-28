<<<<<<< HEAD
import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { requestService, MeasurementRequest } from '../../services/requestService';
import { GlobalSettings } from '../../services/settingsService';
import { whatsappService } from '../../services/whatsappService';
import { clientService, Client } from '../../services/clientService';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
     request: MeasurementRequest;
     settings: GlobalSettings;
     clients: Client[];
     onClose: () => void;
     onSuccess: () => void;
}

export default function RescheduleModal({ request, settings, clients, onClose, onSuccess }: Props) {
     const [message, setMessage] = useState('');
     const [isLoading, setIsLoading] = useState(false);

     const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setIsLoading(true);
          try {
               await requestService.updateRequestStatus(request.id!, 'reschedule_requested', { rescheduleReason: message });

               const client = clients.find(c => c.id === request.clientId);
               if (client?.phone && settings.notifyClientReschedule) {
                    whatsappService.sendMessage(
                         client.phone,
                         `⚠️ Olá ${client.name}!\n\nSobre a sua solicitação de medição do dia *${format(new Date(request.requestedDate + 'T12:00:00'), 'dd/MM')} às ${request.requestedTime}*, a Leão Medições enviou a seguinte mensagem:\n\n_"${message}"_\n\nPor favor, acesse o portal para responder ou reagendar.`,
                         settings
                    );
               }

               toast.success('Solicitação de alteração enviada ao cliente.');
               onClose();
               onSuccess();
          } catch (error) {
               toast.error('Erro ao solicitar alteração. Tente novamente.');
          } finally {
               setIsLoading(false);
          }
     };

     return (
          <div className="fixed inset-0 bg-blue-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
               <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center space-x-3 mb-4 text-blue-600">
                         <MessageSquare className="w-6 h-6" />
                         <h3 className="text-lg font-bold text-slate-900">Pedir Alteração de Horário</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-6">Envie uma mensagem para a loja sugerindo um novo horário. O cliente será notificado via WhatsApp.</p>
                    <form onSubmit={handleSubmit}>
                         <div className="mb-6">
                              <label className="block text-sm font-medium text-slate-700 mb-2">Mensagem para a Loja</label>
                              <textarea
                                   required
                                   rows={4}
                                   value={message}
                                   onChange={e => setMessage(e.target.value)}
                                   className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                                   placeholder="Ex: Olá! Infelizmente neste horário estou em outra obra. Podemos alterar para as 15h?"
                                   autoFocus
                              />
                         </div>
                         <div className="flex justify-end space-x-3">
                              <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
                                   Cancelar
                              </button>
                              <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50">
                                   {isLoading ? 'Enviando...' : 'Enviar Solicitação'}
                              </button>
                         </div>
                    </form>
               </div>
          </div>
     );
}
=======
import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { requestService, MeasurementRequest } from '../../services/requestService';
import { GlobalSettings } from '../../services/settingsService';
import { whatsappService } from '../../services/whatsappService';
import { clientService, Client } from '../../services/clientService';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
     request: MeasurementRequest;
     settings: GlobalSettings;
     clients: Client[];
     onClose: () => void;
     onSuccess: () => void;
}

export default function RescheduleModal({ request, settings, clients, onClose, onSuccess }: Props) {
     const [message, setMessage] = useState('');
     const [isLoading, setIsLoading] = useState(false);

     const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setIsLoading(true);
          try {
               await requestService.updateRequestStatus(request.id!, 'reschedule_requested', { rescheduleReason: message });

               const client = clients.find(c => c.id === request.clientId);
               if (client?.phone && settings.notifyClientReschedule) {
                    whatsappService.sendMessage(
                         client.phone,
                         `⚠️ Olá ${client.name}!\n\nSobre a sua solicitação de medição do dia *${format(new Date(request.requestedDate + 'T12:00:00'), 'dd/MM')} às ${request.requestedTime}*, a Leão Medições enviou a seguinte mensagem:\n\n_"${message}"_\n\nPor favor, acesse o portal para responder ou reagendar.`,
                         settings
                    );
               }

               toast.success('Solicitação de alteração enviada ao cliente.');
               onClose();
               onSuccess();
          } catch (error) {
               toast.error('Erro ao solicitar alteração. Tente novamente.');
          } finally {
               setIsLoading(false);
          }
     };

     return (
          <div className="fixed inset-0 bg-blue-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center space-x-3 mb-4 text-blue-600">
                         <MessageSquare className="w-6 h-6" />
                         <h3 className="text-lg font-bold text-slate-900">Pedir Alteração de Horário</h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-6">Envie uma mensagem para a loja sugerindo um novo horário. O cliente será notificado via WhatsApp.</p>
                    <form onSubmit={handleSubmit}>
                         <div className="mb-6">
                              <label className="block text-sm font-medium text-slate-700 mb-2">Mensagem para a Loja</label>
                              <textarea
                                   required
                                   rows={4}
                                   value={message}
                                   onChange={e => setMessage(e.target.value)}
                                   className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                                   placeholder="Ex: Olá! Infelizmente neste horário estou em outra obra. Podemos alterar para as 15h?"
                                   autoFocus
                              />
                         </div>
                         <div className="flex justify-end space-x-3">
                              <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
                                   Cancelar
                              </button>
                              <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50">
                                   {isLoading ? 'Enviando...' : 'Enviar Solicitação'}
                              </button>
                         </div>
                    </form>
               </div>
          </div>
     );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
