<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { X, MapPin, User, Phone, Building2, Loader2, Clock, Layers, Pencil } from 'lucide-react';
import { requestService, MeasurementRequest, Environment } from '../../services/requestService';
import { blockedTimeService, BlockedTime } from '../../services/blockedTimeService';
import { Client } from '../../services/clientService';
import { GlobalSettings } from '../../services/settingsService';
import { addMinutes, format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
     initialDate?: string;
     initialTime?: string;
     editRequest?: MeasurementRequest; // Se fornecido, entra em modo edição
     clients: Client[];
     requests: MeasurementRequest[];
     blockedTimes: BlockedTime[];
     settings: GlobalSettings;
     onClose: () => void;
     onSuccess: () => void;
}

interface AddressForm {
     zipCode: string;
     street: string;
     number: string;
     complement: string;
     neighborhood: string;
     city: string;
     state: string;
     condominiumName: string;
     contactName: string;
     contactPhone: string;
}

export default function AppointmentModal({
     initialDate = '',
     initialTime = '',
     editRequest,
     clients,
     requests,
     blockedTimes,
     settings,
     onClose,
     onSuccess,
}: Props) {
     const isEditMode = !!editRequest;

     const [clientId, setClientId] = useState(editRequest?.clientId || '');
     const [projectName, setProjectName] = useState(editRequest?.projectName || '');
     const [environmentsList, setEnvironmentsList] = useState<Environment[]>(editRequest?.environments || Array.from({ length: editRequest?.environmentsCount || 1 }).map((_, i) => ({ id: `legacy-${i}`, name: `Ambiente ${i + 1}`, isMeasured: true })));
     const [envInput, setEnvInput] = useState('');
     const [estimatedMinutes, setEstimatedMinutes] = useState(editRequest?.estimatedMinutes || 60);
     const [date, setDate] = useState(editRequest?.requestedDate || initialDate);
     const [time, setTime] = useState(editRequest?.requestedTime || initialTime);
     const [isLoadingCep, setIsLoadingCep] = useState(false);
     const [isSubmitting, setIsSubmitting] = useState(false);
     const [conflictError, setConflictError] = useState('');

     const [address, setAddress] = useState<AddressForm>({
          zipCode: editRequest?.zipCode || '',
          street: editRequest?.street || '',
          number: editRequest?.number || '',
          complement: editRequest?.complement || '',
          neighborhood: editRequest?.neighborhood || '',
          city: editRequest?.city || '',
          state: editRequest?.state || '',
          condominiumName: editRequest?.condominiumName || '',
          contactName: editRequest?.contactName || '',
          contactPhone: editRequest?.contactPhone || '',
     });

     const suggestedMinutes = Math.max(1, environmentsList.length) * 30;

     useEffect(() => {
          if (!isEditMode) setEstimatedMinutes(Math.max(1, environmentsList.length) * 30);
     }, [environmentsList.length, isEditMode]);

     // Conflito check reativo (ignora o próprio evento em modo edição)
     useEffect(() => {
          if (!date || !time) { setConflictError(''); return; }
          const start = new Date(`${date}T${time}:00`);
          const end = addMinutes(start, estimatedMinutes);
          const hasConflict = [...requests, ...blockedTimes].some(event => {
               let eventStart: Date, eventEnd: Date;
               if ('requestedDate' in event) {
                    if (event.status === 'rejected') return false;
                    if (isEditMode && event.id === editRequest?.id) return false; // ignora o próprio
                    eventStart = new Date(`${event.requestedDate}T${event.requestedTime}:00`);
                    eventEnd = addMinutes(eventStart, event.estimatedMinutes);
               } else {
                    eventStart = new Date(event.start);
                    eventEnd = new Date(event.end);
               }
               return start < eventEnd && end > eventStart;
          });
          setConflictError(hasConflict ? 'Conflito de horário! Já existe uma medição ou bloqueio neste período.' : '');
     }, [date, time, estimatedMinutes, requests, blockedTimes, isEditMode, editRequest?.id]);

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
               } catch { toast.error('Erro ao buscar CEP. Verifique sua conexão.'); }
               finally { setIsLoadingCep(false); }
          }
     };

     const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (conflictError) { toast.error(conflictError); return; }

          const fullAddress = `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}, ${address.neighborhood}, ${address.city} - ${address.state}, CEP: ${address.zipCode}`;
          setIsSubmitting(true);
          try {
               if (isEditMode && editRequest?.id) {
                    // Modo edição: atualiza os dados mantendo o status atual
                    await requestService.updateRequestStatus(editRequest.id, editRequest.status, {
                         projectName,
                         address: fullAddress,
                         zipCode: address.zipCode,
                         street: address.street,
                         number: address.number,
                         complement: address.complement,
                         neighborhood: address.neighborhood,
                         city: address.city,
                         state: address.state,
                         condominiumName: address.condominiumName,
                         contactName: address.contactName,
                         contactPhone: address.contactPhone,
                         environmentsCount: environmentsList.length,
                         environments: environmentsList,
                         estimatedMinutes,
                         requestedDate: date,
                         requestedTime: time,
                    });
                    toast.success(`Agendamento atualizado para ${format(new Date(`${date}T${time}:00`), 'dd/MM')} às ${time}!`);
               } else {
                    // Modo criação
                    const client = clients.find(c => c.id === clientId);
                    if (!client || !client.id) return;
                    await requestService.createRequest({
                         clientId: client.id,
                         clientName: client.name,
                         projectName,
                         address: fullAddress,
                         zipCode: address.zipCode,
                         street: address.street,
                         number: address.number,
                         complement: address.complement,
                         neighborhood: address.neighborhood,
                         city: address.city,
                         state: address.state,
                         condominiumName: address.condominiumName,
                         contactName: address.contactName,
                         contactPhone: address.contactPhone,
                         environmentsCount: environmentsList.length,
                         environments: environmentsList,
                         estimatedMinutes,
                         requestedDate: date,
                         requestedTime: time,
                    });
                    toast.success(`Medição agendada para ${format(new Date(`${date}T${time}:00`), 'dd/MM')} às ${time}!`);
               }
               onClose();
               onSuccess();
          } catch {
               toast.error('Erro ao salvar. Tente novamente.');
          } finally {
               setIsSubmitting(false);
          }
     };

     const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm";
     const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

     const editingClient = isEditMode ? clients.find(c => c.id === editRequest?.clientId) : null;

     return (
          <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 pb-0" onClick={onClose}>
               <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 shrink-0">
                         <div>
                              <div className="flex items-center gap-2">
                                   {isEditMode && <Pencil className="w-4 h-4 text-amber-500" />}
                                   <h3 className="text-xl font-bold text-slate-900">
                                        {isEditMode ? 'Editar Agendamento' : 'Agendar Nova Medição'}
                                   </h3>
                              </div>
                              {isEditMode && editingClient && (
                                   <p className="text-sm text-slate-500 mt-0.5">{editingClient.name} • <span className="text-amber-600 font-medium capitalize">{editRequest?.status === 'pending' ? 'Pendente' : editRequest?.status === 'confirmed' ? 'Confirmado' : editRequest?.status}</span></p>
                              )}
                              {!isEditMode && <p className="text-sm text-slate-500 mt-0.5">Preencha os dados do agendamento</p>}
                         </div>
                         <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
                              <X className="w-5 h-5" />
                         </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                         <div className="p-4 sm:p-6 space-y-6">

                              {/* Loja e Projeto (somente modo criação) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {!isEditMode && (
                                        <div>
                                             <label className={labelClass}>Cliente (Loja) *</label>
                                             <select required value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass}>
                                                  <option value="">Selecione...</option>
                                                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                             </select>
                                        </div>
                                   )}
                                   <div>
                                        <label className={labelClass}>Nome do Projeto</label>
                                        <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className={inputClass} placeholder="Ex: Apto 302 Torre A" />
                                   </div>
                              </div>

                              {/* Data, Hora e Ambientes */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   <div>
                                        <label className={labelClass}>Data *</label>
                                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                                   </div>
                                   <div>
                                        <label className={labelClass}>Hora *</label>
                                        <input type="time" required value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
                                   </div>
                                   <div className="md:col-span-2">
                                        <label className={labelClass}><Layers className="w-3 h-3 inline mr-1" />Ambientes a Medir *</label>
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
                                                  className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors text-sm"
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
                                             <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                                                  Adicione os ambientes (pelo menos 1) para calcularmos o tempo estimado.
                                             </p>
                                        )}
                                   </div>
                                   <div>
                                        <label className={labelClass}><Clock className="w-3 h-3 inline mr-1" />Tempo Est. (min)</label>
                                        <input type="number" required min="15" step="15" value={estimatedMinutes} onChange={e => setEstimatedMinutes(Number(e.target.value))} className={inputClass} />
                                        {estimatedMinutes !== suggestedMinutes && (
                                             <p className="text-xs text-amber-600 mt-1">Sugerido: {suggestedMinutes} min</p>
                                        )}
                                   </div>
                              </div>

                              {/* Conflito warning */}
                              {conflictError && (
                                   <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
                                        ⚠️ {conflictError}
                                   </div>
                              )}

                              {/* Endereço */}
                              <div>
                                   <div className="flex items-center space-x-2 mb-4">
                                        <MapPin className="w-4 h-4 text-slate-500" />
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Endereço da Obra</h4>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="relative">
                                             <label className={labelClass}>CEP *</label>
                                             <input type="text" value={address.zipCode} onChange={handleCepChange} className={inputClass} placeholder="00000-000" maxLength={9} />
                                             {isLoadingCep && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-8 text-slate-400" />}
                                        </div>
                                        <div className="md:col-span-2">
                                             <label className={labelClass}>Rua / Logradouro</label>
                                             <input type="text" value={address.street} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))} className={inputClass} placeholder="Auto-preenchido pelo CEP" />
                                        </div>
                                        <div>
                                             <label className={labelClass}>Número *</label>
                                             <input type="text" required value={address.number} onChange={e => setAddress(p => ({ ...p, number: e.target.value }))} className={inputClass} placeholder="123" />
                                        </div>
                                        <div>
                                             <label className={labelClass}>Complemento</label>
                                             <input type="text" value={address.complement} onChange={e => setAddress(p => ({ ...p, complement: e.target.value }))} className={inputClass} placeholder="Apto, Bloco..." />
                                        </div>
                                        <div>
                                             <label className={labelClass}>Bairro</label>
                                             <input type="text" value={address.neighborhood} onChange={e => setAddress(p => ({ ...p, neighborhood: e.target.value }))} className={inputClass} />
                                        </div>
                                        <div>
                                             <label className={labelClass}>Cidade</label>
                                             <input type="text" value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} className={inputClass} />
                                        </div>
                                        <div>
                                             <label className={labelClass}>UF</label>
                                             <input type="text" maxLength={2} value={address.state} onChange={e => setAddress(p => ({ ...p, state: e.target.value.toUpperCase() }))} className={inputClass} placeholder="SP" />
                                        </div>
                                        <div>
                                             <label className={labelClass}><Building2 className="w-3 h-3 inline mr-1" />Condomínio</label>
                                             <input type="text" value={address.condominiumName} onChange={e => setAddress(p => ({ ...p, condominiumName: e.target.value }))} className={inputClass} placeholder="Nome do condomínio" />
                                        </div>
                                   </div>
                              </div>

                              {/* Contato */}
                              <div>
                                   <div className="flex items-center space-x-2 mb-4">
                                        <User className="w-4 h-4 text-slate-500" />
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Contato no Local</h4>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                             <label className={labelClass}><User className="w-3 h-3 inline mr-1" />Nome do Contato</label>
                                             <input type="text" value={address.contactName} onChange={e => setAddress(p => ({ ...p, contactName: e.target.value }))} className={inputClass} placeholder="Nome da pessoa no local" />
                                        </div>
                                        <div>
                                             <label className={labelClass}><Phone className="w-3 h-3 inline mr-1" />Telefone do Contato</label>
                                             <input type="text" value={address.contactPhone} onChange={e => setAddress(p => ({ ...p, contactPhone: e.target.value }))} className={inputClass} placeholder="Ex: (11) 99999-9999" />
                                        </div>
                                   </div>
                              </div>
                         </div>
                    </form>

                    {/* Footer */}
                    <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 rounded-b-none sm:rounded-b-2xl flex flex-col-reverse sm:flex-row justify-end gap-3 pb-safe">
                         <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                         <button
                              onClick={handleSubmit as any}
                              disabled={isSubmitting || !!conflictError}
                              className={`w-full sm:w-auto px-5 py-3 sm:py-2.5 font-medium text-white rounded-xl shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 ${isEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                         >
                              {isSubmitting ? <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 mr-2 animate-spin" /> : null}
                              {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                         </button>
                    </div>
               </div>
          </div>
     );
}
=======
import { useState, useEffect } from 'react';
import { X, MapPin, User, Phone, Building2, Loader2, Clock, Layers, Pencil } from 'lucide-react';
import { requestService, MeasurementRequest, Environment } from '../../services/requestService';
import { blockedTimeService, BlockedTime } from '../../services/blockedTimeService';
import { Client } from '../../services/clientService';
import { GlobalSettings } from '../../services/settingsService';
import { addMinutes, format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
     initialDate?: string;
     initialTime?: string;
     editRequest?: MeasurementRequest; // Se fornecido, entra em modo edição
     clients: Client[];
     requests: MeasurementRequest[];
     blockedTimes: BlockedTime[];
     settings: GlobalSettings;
     onClose: () => void;
     onSuccess: () => void;
}

interface AddressForm {
     zipCode: string;
     street: string;
     number: string;
     complement: string;
     neighborhood: string;
     city: string;
     state: string;
     condominiumName: string;
     contactName: string;
     contactPhone: string;
}

export default function AppointmentModal({
     initialDate = '',
     initialTime = '',
     editRequest,
     clients,
     requests,
     blockedTimes,
     settings,
     onClose,
     onSuccess,
}: Props) {
     const isEditMode = !!editRequest;

     const [clientId, setClientId] = useState(editRequest?.clientId || '');
     const [projectName, setProjectName] = useState(editRequest?.projectName || '');
     const [environmentsList, setEnvironmentsList] = useState<Environment[]>(editRequest?.environments || Array.from({ length: editRequest?.environmentsCount || 1 }).map((_, i) => ({ id: `legacy-${i}`, name: `Ambiente ${i + 1}`, isMeasured: true })));
     const [envInput, setEnvInput] = useState('');
     const [estimatedMinutes, setEstimatedMinutes] = useState(editRequest?.estimatedMinutes || 60);
     const [date, setDate] = useState(editRequest?.requestedDate || initialDate);
     const [time, setTime] = useState(editRequest?.requestedTime || initialTime);
     const [isLoadingCep, setIsLoadingCep] = useState(false);
     const [isSubmitting, setIsSubmitting] = useState(false);
     const [conflictError, setConflictError] = useState('');

     const [address, setAddress] = useState<AddressForm>({
          zipCode: editRequest?.zipCode || '',
          street: editRequest?.street || '',
          number: editRequest?.number || '',
          complement: editRequest?.complement || '',
          neighborhood: editRequest?.neighborhood || '',
          city: editRequest?.city || '',
          state: editRequest?.state || '',
          condominiumName: editRequest?.condominiumName || '',
          contactName: editRequest?.contactName || '',
          contactPhone: editRequest?.contactPhone || '',
     });

     const suggestedMinutes = Math.max(1, environmentsList.length) * 30;

     useEffect(() => {
          if (!isEditMode) setEstimatedMinutes(Math.max(1, environmentsList.length) * 30);
     }, [environmentsList.length, isEditMode]);

     // Conflito check reativo (ignora o próprio evento em modo edição)
     useEffect(() => {
          if (!date || !time) { setConflictError(''); return; }
          const start = new Date(`${date}T${time}:00`);
          const end = addMinutes(start, estimatedMinutes);
          const hasConflict = [...requests, ...blockedTimes].some(event => {
               let eventStart: Date, eventEnd: Date;
               if ('requestedDate' in event) {
                    if (event.status === 'rejected') return false;
                    if (isEditMode && event.id === editRequest?.id) return false; // ignora o próprio
                    eventStart = new Date(`${event.requestedDate}T${event.requestedTime}:00`);
                    eventEnd = addMinutes(eventStart, event.estimatedMinutes);
               } else {
                    eventStart = new Date(event.start);
                    eventEnd = new Date(event.end);
               }
               return start < eventEnd && end > eventStart;
          });
          setConflictError(hasConflict ? 'Conflito de horário! Já existe uma medição ou bloqueio neste período.' : '');
     }, [date, time, estimatedMinutes, requests, blockedTimes, isEditMode, editRequest?.id]);

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
               } catch { toast.error('Erro ao buscar CEP. Verifique sua conexão.'); }
               finally { setIsLoadingCep(false); }
          }
     };

     const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (conflictError) { toast.error(conflictError); return; }

          const fullAddress = `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}, ${address.neighborhood}, ${address.city} - ${address.state}, CEP: ${address.zipCode}`;
          setIsSubmitting(true);
          try {
               if (isEditMode && editRequest?.id) {
                    // Modo edição: atualiza os dados mantendo o status atual
                    await requestService.updateRequestStatus(editRequest.id, editRequest.status, {
                         projectName,
                         address: fullAddress,
                         zipCode: address.zipCode,
                         street: address.street,
                         number: address.number,
                         complement: address.complement,
                         neighborhood: address.neighborhood,
                         city: address.city,
                         state: address.state,
                         condominiumName: address.condominiumName,
                         contactName: address.contactName,
                         contactPhone: address.contactPhone,
                         environmentsCount: environmentsList.length,
                         environments: environmentsList,
                         estimatedMinutes,
                         requestedDate: date,
                         requestedTime: time,
                    });
                    toast.success(`Agendamento atualizado para ${format(new Date(`${date}T${time}:00`), 'dd/MM')} às ${time}!`);
               } else {
                    // Modo criação
                    const client = clients.find(c => c.id === clientId);
                    if (!client || !client.id) return;
                    await requestService.createRequest({
                         clientId: client.id,
                         clientName: client.name,
                         projectName,
                         address: fullAddress,
                         zipCode: address.zipCode,
                         street: address.street,
                         number: address.number,
                         complement: address.complement,
                         neighborhood: address.neighborhood,
                         city: address.city,
                         state: address.state,
                         condominiumName: address.condominiumName,
                         contactName: address.contactName,
                         contactPhone: address.contactPhone,
                         environmentsCount: environmentsList.length,
                         environments: environmentsList,
                         estimatedMinutes,
                         requestedDate: date,
                         requestedTime: time,
                    });
                    toast.success(`Medição agendada para ${format(new Date(`${date}T${time}:00`), 'dd/MM')} às ${time}!`);
               }
               onClose();
               onSuccess();
          } catch {
               toast.error('Erro ao salvar. Tente novamente.');
          } finally {
               setIsSubmitting(false);
          }
     };

     const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm";
     const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1";

     const editingClient = isEditMode ? clients.find(c => c.id === editRequest?.clientId) : null;

     return (
          <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
                         <div>
                              <div className="flex items-center gap-2">
                                   {isEditMode && <Pencil className="w-4 h-4 text-amber-500" />}
                                   <h3 className="text-xl font-bold text-slate-900">
                                        {isEditMode ? 'Editar Agendamento' : 'Agendar Nova Medição'}
                                   </h3>
                              </div>
                              {isEditMode && editingClient && (
                                   <p className="text-sm text-slate-500 mt-0.5">{editingClient.name} • <span className="text-amber-600 font-medium capitalize">{editRequest?.status === 'pending' ? 'Pendente' : editRequest?.status === 'confirmed' ? 'Confirmado' : editRequest?.status}</span></p>
                              )}
                              {!isEditMode && <p className="text-sm text-slate-500 mt-0.5">Preencha os dados do agendamento</p>}
                         </div>
                         <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
                              <X className="w-5 h-5" />
                         </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                         <div className="p-6 space-y-6">

                              {/* Loja e Projeto (somente modo criação) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {!isEditMode && (
                                        <div>
                                             <label className={labelClass}>Cliente (Loja) *</label>
                                             <select required value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass}>
                                                  <option value="">Selecione...</option>
                                                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                             </select>
                                        </div>
                                   )}
                                   <div>
                                        <label className={labelClass}>Nome do Projeto</label>
                                        <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} className={inputClass} placeholder="Ex: Apto 302 Torre A" />
                                   </div>
                              </div>

                              {/* Data, Hora e Ambientes */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   <div>
                                        <label className={labelClass}>Data *</label>
                                        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                                   </div>
                                   <div>
                                        <label className={labelClass}>Hora *</label>
                                        <input type="time" required value={time} onChange={e => setTime(e.target.value)} className={inputClass} />
                                   </div>
                                   <div className="md:col-span-2">
                                        <label className={labelClass}><Layers className="w-3 h-3 inline mr-1" />Ambientes a Medir *</label>
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
                                                  className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors text-sm"
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
                                             <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                                                  Adicione os ambientes (pelo menos 1) para calcularmos o tempo estimado.
                                             </p>
                                        )}
                                   </div>
                                   <div>
                                        <label className={labelClass}><Clock className="w-3 h-3 inline mr-1" />Tempo Est. (min)</label>
                                        <input type="number" required min="15" step="15" value={estimatedMinutes} onChange={e => setEstimatedMinutes(Number(e.target.value))} className={inputClass} />
                                        {estimatedMinutes !== suggestedMinutes && (
                                             <p className="text-xs text-amber-600 mt-1">Sugerido: {suggestedMinutes} min</p>
                                        )}
                                   </div>
                              </div>

                              {/* Conflito warning */}
                              {conflictError && (
                                   <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
                                        ⚠️ {conflictError}
                                   </div>
                              )}

                              {/* Endereço */}
                              <div>
                                   <div className="flex items-center space-x-2 mb-4">
                                        <MapPin className="w-4 h-4 text-slate-500" />
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Endereço da Obra</h4>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="relative">
                                             <label className={labelClass}>CEP *</label>
                                             <input type="text" value={address.zipCode} onChange={handleCepChange} className={inputClass} placeholder="00000-000" maxLength={9} />
                                             {isLoadingCep && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-8 text-slate-400" />}
                                        </div>
                                        <div className="md:col-span-2">
                                             <label className={labelClass}>Rua / Logradouro</label>
                                             <input type="text" value={address.street} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))} className={inputClass} placeholder="Auto-preenchido pelo CEP" />
                                        </div>
                                        <div>
                                             <label className={labelClass}>Número *</label>
                                             <input type="text" required value={address.number} onChange={e => setAddress(p => ({ ...p, number: e.target.value }))} className={inputClass} placeholder="123" />
                                        </div>
                                        <div>
                                             <label className={labelClass}>Complemento</label>
                                             <input type="text" value={address.complement} onChange={e => setAddress(p => ({ ...p, complement: e.target.value }))} className={inputClass} placeholder="Apto, Bloco..." />
                                        </div>
                                        <div>
                                             <label className={labelClass}>Bairro</label>
                                             <input type="text" value={address.neighborhood} onChange={e => setAddress(p => ({ ...p, neighborhood: e.target.value }))} className={inputClass} />
                                        </div>
                                        <div>
                                             <label className={labelClass}>Cidade</label>
                                             <input type="text" value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} className={inputClass} />
                                        </div>
                                        <div>
                                             <label className={labelClass}>UF</label>
                                             <input type="text" maxLength={2} value={address.state} onChange={e => setAddress(p => ({ ...p, state: e.target.value.toUpperCase() }))} className={inputClass} placeholder="SP" />
                                        </div>
                                        <div>
                                             <label className={labelClass}><Building2 className="w-3 h-3 inline mr-1" />Condomínio</label>
                                             <input type="text" value={address.condominiumName} onChange={e => setAddress(p => ({ ...p, condominiumName: e.target.value }))} className={inputClass} placeholder="Nome do condomínio" />
                                        </div>
                                   </div>
                              </div>

                              {/* Contato */}
                              <div>
                                   <div className="flex items-center space-x-2 mb-4">
                                        <User className="w-4 h-4 text-slate-500" />
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Contato no Local</h4>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                             <label className={labelClass}><User className="w-3 h-3 inline mr-1" />Nome do Contato</label>
                                             <input type="text" value={address.contactName} onChange={e => setAddress(p => ({ ...p, contactName: e.target.value }))} className={inputClass} placeholder="Nome da pessoa no local" />
                                        </div>
                                        <div>
                                             <label className={labelClass}><Phone className="w-3 h-3 inline mr-1" />Telefone do Contato</label>
                                             <input type="text" value={address.contactPhone} onChange={e => setAddress(p => ({ ...p, contactPhone: e.target.value }))} className={inputClass} placeholder="Ex: (11) 99999-9999" />
                                        </div>
                                   </div>
                              </div>
                         </div>
                    </form>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-200 flex justify-end space-x-3 shrink-0 bg-slate-50 rounded-b-2xl">
                         <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors text-sm font-medium">
                              Cancelar
                         </button>
                         <button
                              onClick={handleSubmit as any}
                              disabled={isSubmitting || !!conflictError}
                              className={`px-5 py-2.5 text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${isEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                         >
                              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                              {isSubmitting ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                         </button>
                    </div>
               </div>
          </div>
     );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
