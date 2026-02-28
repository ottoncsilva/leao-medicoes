<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { requestService, MeasurementRequest, Environment } from '../../services/requestService';
import { Client } from '../../services/clientService';
import { format } from 'date-fns';
import { CheckSquare, X, CheckCircle2, MessageSquare, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
     requests: MeasurementRequest[];
     clients: Client[];
     onUpdate: () => void;
}

export default function CompleteMeasurementsTab({ requests, clients, onUpdate }: Props) {
     const [selectedRequest, setSelectedRequest] = useState<MeasurementRequest | null>(null);
     const [environments, setEnvironments] = useState<Environment[]>([]);
     const [isSubmitting, setIsSubmitting] = useState(false);

     // Filtra apenas agendamentos confirmados
     const confirmedRequests = requests
          .filter(r => r.status === 'confirmed')
          .sort((a, b) => new Date(`${a.requestedDate}T${a.requestedTime}:00`).getTime() - new Date(`${b.requestedDate}T${b.requestedTime}:00`).getTime());

     const openCompletionModal = (req: MeasurementRequest) => {
          setSelectedRequest(req);
          // Cria estado local para edição dos ambientes
          if (req.environments && req.environments.length > 0) {
               setEnvironments([...req.environments]);
          } else {
               // Fallback para agendamentos antigos que só tinham número
               setEnvironments(Array.from({ length: req.environmentsCount || 1 }).map((_, i) => ({
                    id: `legacy-${i}`,
                    name: `Ambiente ${i + 1}`,
                    isMeasured: true
               })));
          }
     };

     const toggleEnvironment = (id: string, isMeasured: boolean) => {
          setEnvironments(prev => prev.map(env =>
               env.id === id ? { ...env, isMeasured, observation: isMeasured ? '' : env.observation } : env
          ));
     };

     const updateObservation = (id: string, text: string) => {
          setEnvironments(prev => prev.map(env =>
               env.id === id ? { ...env, observation: text } : env
          ));
     };

     const handleComplete = async () => {
          if (!selectedRequest || !selectedRequest.id) return;

          // Validação
          if (environments.some(env => !env.isMeasured && !env.observation)) {
               toast.error('Preencha a observação para todos os ambientes não medidos.');
               return;
          }

          setIsSubmitting(true);
          try {
               await requestService.updateRequestStatus(selectedRequest.id, 'completed', {
                    environments,
                    environmentsCount: environments.filter(e => e.isMeasured).length // Guardando apenas a quantitade efetivamente medida no número para fallback
               });
               toast.success('Medição completada com sucesso!');
               setSelectedRequest(null);
               onUpdate();
          } catch (error) {
               toast.error('Erro ao completar a medição.');
          } finally {
               setIsSubmitting(false);
          }
     };

     if (confirmedRequests.length === 0) {
          return (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Tudo em dia!</h3>
                    <p className="text-slate-500">Não há medições confirmadas aguardando conclusão no momento.</p>
               </div>
          );
     }

     return (
          <div className="space-y-6">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                         <h2 className="text-xl font-bold text-slate-900 border-l-4 border-blue-950 pl-4">
                              Completar Medições
                         </h2>
                         <p className="text-slate-500 text-sm mt-2 ml-4">
                              Marque os ambientes que foram efetivamente medidos na visita e justifique os não medidos.
                         </p>
                    </div>

                    {/* Desktop View (Tabela) */}
                    <div className="hidden md:block overflow-x-auto">
                         <table className="w-full text-left text-sm text-slate-600">
                              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-b border-slate-200">
                                   <tr>
                                        <th className="px-6 py-4">Data/Hora</th>
                                        <th className="px-6 py-4">Cliente / Projeto</th>
                                        <th className="px-6 py-4">Qtd. Ambientes Agendados</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                   </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                   {confirmedRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                             <td className="px-6 py-4 font-medium whitespace-nowrap">
                                                  {format(new Date(`${req.requestedDate}T${req.requestedTime}:00`), 'dd/MM/yyyy HH:mm')}
                                             </td>
                                             <td className="px-6 py-4">
                                                  <div className="font-bold text-slate-900">{req.clientName}</div>
                                                  {req.projectName && <div className="text-slate-500 text-xs mt-0.5">{req.projectName}</div>}
                                             </td>
                                             <td className="px-6 py-4">
                                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                       {req.environments?.length || req.environmentsCount} ambientes
                                                  </span>
                                             </td>
                                             <td className="px-6 py-4 text-right">
                                                  <button
                                                       onClick={() => openCompletionModal(req)}
                                                       className="inline-flex items-center px-4 py-2 bg-blue-950 text-white font-medium rounded-lg text-sm hover:bg-blue-900 transition-colors shadow-sm"
                                                  >
                                                       <CheckSquare className="w-4 h-4 mr-2" /> Completar Visita
                                                  </button>
                                             </td>
                                        </tr>
                                   ))}
                              </tbody>
                         </table>
                    </div>

                    {/* Mobile View (Cards) */}
                    <div className="md:hidden flex flex-col divide-y divide-slate-100 bg-slate-50">
                         {confirmedRequests.map((req) => (
                              <div key={`mob-${req.id}`} className="p-4 bg-white">
                                   <div className="flex justify-between items-start mb-2">
                                        <div>
                                             <h3 className="font-bold text-slate-900 leading-tight pr-2">{req.clientName}</h3>
                                             {req.projectName && <p className="text-slate-500 text-sm mt-0.5">{req.projectName}</p>}
                                        </div>
                                        <div className="text-right shrink-0">
                                             <span className="inline-block px-2 py-1 rounded-md text-xs font-bold text-blue-800 bg-blue-100 mb-1">
                                                  {req.environments?.length || req.environmentsCount} ambs
                                             </span>
                                        </div>
                                   </div>
                                   <div className="text-xs text-slate-500 mb-4 font-medium">
                                        📅 {format(new Date(`${req.requestedDate}T${req.requestedTime}:00`), "dd/MM 'às' HH:mm")}
                                   </div>
                                   <button
                                        onClick={() => openCompletionModal(req)}
                                        className="w-full flex items-center justify-center py-2.5 bg-blue-950 text-white font-medium rounded-xl text-sm hover:bg-blue-900 transition-colors shadow-sm"
                                   >
                                        <CheckSquare className="w-4 h-4 mr-2" /> Completar Visita
                                   </button>
                              </div>
                         ))}
                    </div>
               </div>

               {selectedRequest && (
                    <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                         <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
                              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                                   <div>
                                        <h3 className="text-xl font-bold text-slate-900">Preenchimento de Visita</h3>
                                        <p className="text-slate-500 text-sm mt-1">{selectedRequest.clientName} {selectedRequest.projectName ? `- ${selectedRequest.projectName}` : ''}</p>
                                   </div>
                                   <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
                                        <X className="w-6 h-6 text-slate-500" />
                                   </button>
                              </div>

                              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                                   <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm mb-6 flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p>Marque os ambientes que <b>foram medidos</b>. Para os que não puderam ser medidos, desmarque-os e insira a justificativa obrigatória.</p>
                                   </div>

                                   <div className="space-y-4">
                                        {environments.map((env) => (
                                             <div key={env.id} className={`p-4 rounded-xl border transition-colors ${env.isMeasured ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-300'}`}>
                                                  <label className="flex items-center cursor-pointer mb-3">
                                                       <div className="relative flex items-center">
                                                            <input
                                                                 type="checkbox"
                                                                 checked={env.isMeasured}
                                                                 onChange={(e) => toggleEnvironment(env.id, e.target.checked)}
                                                                 className="w-5 h-5 rounded border-slate-300 text-blue-950 focus:ring-blue-950 bg-white"
                                                            />
                                                       </div>
                                                       <span className={`ml-3 font-medium ${env.isMeasured ? 'text-slate-900' : 'text-slate-500'}`}>
                                                            {env.name}
                                                       </span>
                                                       {env.isMeasured && <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">✅ Medido</span>}
                                                  </label>

                                                  {!env.isMeasured && (
                                                       <div className="ml-8 animate-in fade-in slide-in-from-top-2">
                                                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                 <MessageSquare className="w-3 h-3" /> Motivo da não medição *
                                                            </label>
                                                            <textarea
                                                                 placeholder="Ex: Ambiente ainda estava em obras, cliente pediu para remover..."
                                                                 value={env.observation || ''}
                                                                 onChange={(e) => updateObservation(env.id, e.target.value)}
                                                                 className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                                                                 rows={2}
                                                                 required
                                                            />
                                                       </div>
                                                  )}
                                             </div>
                                        ))}
                                   </div>
                              </div>

                              <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 rounded-b-none sm:rounded-b-2xl flex flex-col-reverse sm:flex-row justify-end gap-3 pb-safe">
                                   <button
                                        onClick={() => setSelectedRequest(null)}
                                        className="w-full sm:w-auto px-5 py-3 sm:py-2.5 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                                   >
                                        Cancelar
                                   </button>
                                   <button
                                        onClick={handleComplete}
                                        disabled={isSubmitting}
                                        className="w-full sm:w-auto px-5 py-3 sm:py-2.5 font-medium text-white bg-blue-950 hover:bg-blue-900 rounded-xl shadow-sm transition-colors flex items-center justify-center disabled:opacity-50"
                                   >
                                        {isSubmitting && <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2 animate-spin" />}
                                        Salvar e Completar Visita
                                   </button>
                              </div>
                         </div>
                    </div>
               )}
          </div>
     );
}
=======
import { useState, useEffect } from 'react';
import { requestService, MeasurementRequest, Environment } from '../../services/requestService';
import { Client } from '../../services/clientService';
import { format } from 'date-fns';
import { CheckSquare, X, CheckCircle2, MessageSquare, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
     requests: MeasurementRequest[];
     clients: Client[];
     onUpdate: () => void;
}

export default function CompleteMeasurementsTab({ requests, clients, onUpdate }: Props) {
     const [selectedRequest, setSelectedRequest] = useState<MeasurementRequest | null>(null);
     const [environments, setEnvironments] = useState<Environment[]>([]);
     const [isSubmitting, setIsSubmitting] = useState(false);

     // Filtra apenas agendamentos confirmados
     const confirmedRequests = requests
          .filter(r => r.status === 'confirmed')
          .sort((a, b) => new Date(`${a.requestedDate}T${a.requestedTime}:00`).getTime() - new Date(`${b.requestedDate}T${b.requestedTime}:00`).getTime());

     const openCompletionModal = (req: MeasurementRequest) => {
          setSelectedRequest(req);
          // Cria estado local para edição dos ambientes
          if (req.environments && req.environments.length > 0) {
               setEnvironments([...req.environments]);
          } else {
               // Fallback para agendamentos antigos que só tinham número
               setEnvironments(Array.from({ length: req.environmentsCount || 1 }).map((_, i) => ({
                    id: `legacy-${i}`,
                    name: `Ambiente ${i + 1}`,
                    isMeasured: true
               })));
          }
     };

     const toggleEnvironment = (id: string, isMeasured: boolean) => {
          setEnvironments(prev => prev.map(env =>
               env.id === id ? { ...env, isMeasured, observation: isMeasured ? '' : env.observation } : env
          ));
     };

     const updateObservation = (id: string, text: string) => {
          setEnvironments(prev => prev.map(env =>
               env.id === id ? { ...env, observation: text } : env
          ));
     };

     const handleComplete = async () => {
          if (!selectedRequest || !selectedRequest.id) return;

          // Validação
          if (environments.some(env => !env.isMeasured && !env.observation)) {
               toast.error('Preencha a observação para todos os ambientes não medidos.');
               return;
          }

          setIsSubmitting(true);
          try {
               await requestService.updateRequestStatus(selectedRequest.id, 'completed', {
                    environments,
                    environmentsCount: environments.filter(e => e.isMeasured).length // Guardando apenas a quantitade efetivamente medida no número para fallback
               });
               toast.success('Medição completada com sucesso!');
               setSelectedRequest(null);
               onUpdate();
          } catch (error) {
               toast.error('Erro ao completar a medição.');
          } finally {
               setIsSubmitting(false);
          }
     };

     if (confirmedRequests.length === 0) {
          return (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Tudo em dia!</h3>
                    <p className="text-slate-500">Não há medições confirmadas aguardando conclusão no momento.</p>
               </div>
          );
     }

     return (
          <div className="space-y-6">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                         <h2 className="text-xl font-bold text-slate-900 border-l-4 border-blue-950 pl-4">
                              Completar Medições
                         </h2>
                         <p className="text-slate-500 text-sm mt-2 ml-4">
                              Marque os ambientes que foram efetivamente medidos na visita e justifique os não medidos.
                         </p>
                    </div>

                    <div className="overflow-x-auto">
                         <table className="w-full text-left text-sm text-slate-600">
                              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-b border-slate-200">
                                   <tr>
                                        <th className="px-6 py-4">Data/Hora</th>
                                        <th className="px-6 py-4">Cliente / Projeto</th>
                                        <th className="px-6 py-4">Qtd. Ambientes Agendados</th>
                                        <th className="px-6 py-4 text-right">Ação</th>
                                   </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                   {confirmedRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                             <td className="px-6 py-4 font-medium whitespace-nowrap">
                                                  {format(new Date(`${req.requestedDate}T${req.requestedTime}:00`), 'dd/MM/yyyy HH:mm')}
                                             </td>
                                             <td className="px-6 py-4">
                                                  <div className="font-bold text-slate-900">{req.clientName}</div>
                                                  {req.projectName && <div className="text-slate-500 text-xs mt-0.5">{req.projectName}</div>}
                                             </td>
                                             <td className="px-6 py-4">
                                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                       {req.environments?.length || req.environmentsCount} ambientes
                                                  </span>
                                             </td>
                                             <td className="px-6 py-4 text-right">
                                                  <button
                                                       onClick={() => openCompletionModal(req)}
                                                       className="inline-flex items-center px-4 py-2 bg-blue-950 text-white font-medium rounded-lg text-sm hover:bg-blue-900 transition-colors shadow-sm"
                                                  >
                                                       <CheckSquare className="w-4 h-4 mr-2" /> Completar Visita
                                                  </button>
                                             </td>
                                        </tr>
                                   ))}
                              </tbody>
                         </table>
                    </div>
               </div>

               {selectedRequest && (
                    <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                         <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                                   <div>
                                        <h3 className="text-xl font-bold text-slate-900">Preenchimento de Visita</h3>
                                        <p className="text-slate-500 text-sm mt-1">{selectedRequest.clientName} {selectedRequest.projectName ? `- ${selectedRequest.projectName}` : ''}</p>
                                   </div>
                                   <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                        <X className="w-5 h-5 text-slate-500" />
                                   </button>
                              </div>

                              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                   <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm mb-6 flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p>Marque os ambientes que <b>foram medidos</b>. Para os que não puderam ser medidos, desmarque-os e insira a justificativa obrigatória.</p>
                                   </div>

                                   <div className="space-y-4">
                                        {environments.map((env) => (
                                             <div key={env.id} className={`p-4 rounded-xl border transition-colors ${env.isMeasured ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-300'}`}>
                                                  <label className="flex items-center cursor-pointer mb-3">
                                                       <div className="relative flex items-center">
                                                            <input
                                                                 type="checkbox"
                                                                 checked={env.isMeasured}
                                                                 onChange={(e) => toggleEnvironment(env.id, e.target.checked)}
                                                                 className="w-5 h-5 rounded border-slate-300 text-blue-950 focus:ring-blue-950 bg-white"
                                                            />
                                                       </div>
                                                       <span className={`ml-3 font-medium ${env.isMeasured ? 'text-slate-900' : 'text-slate-500'}`}>
                                                            {env.name}
                                                       </span>
                                                       {env.isMeasured && <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">✅ Medido</span>}
                                                  </label>

                                                  {!env.isMeasured && (
                                                       <div className="ml-8 animate-in fade-in slide-in-from-top-2">
                                                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                 <MessageSquare className="w-3 h-3" /> Motivo da não medição *
                                                            </label>
                                                            <textarea
                                                                 placeholder="Ex: Ambiente ainda estava em obras, cliente pediu para remover..."
                                                                 value={env.observation || ''}
                                                                 onChange={(e) => updateObservation(env.id, e.target.value)}
                                                                 className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                                                                 rows={2}
                                                                 required
                                                            />
                                                       </div>
                                                  )}
                                             </div>
                                        ))}
                                   </div>
                              </div>

                              <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                                   <button
                                        onClick={() => setSelectedRequest(null)}
                                        className="px-5 py-2.5 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                                   >
                                        Cancelar
                                   </button>
                                   <button
                                        onClick={handleComplete}
                                        disabled={isSubmitting}
                                        className="px-5 py-2.5 font-medium text-white bg-blue-950 hover:bg-blue-900 rounded-xl shadow-sm transition-colors flex items-center justify-center disabled:opacity-50"
                                   >
                                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Salvar e Completar Visita
                                   </button>
                              </div>
                         </div>
                    </div>
               )}
          </div>
     );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
