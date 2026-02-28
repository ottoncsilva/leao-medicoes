import { useState } from 'react';
import { Settings } from 'lucide-react';
import { GlobalSettings, Holiday, FIXED_HOLIDAYS, settingsService } from '../../services/settingsService';
import { toast } from 'sonner';

interface Props {
     settings: GlobalSettings;
     onRefresh: () => void;
}

type SettingsTab = 'financeiro' | 'comunicacao' | 'feriados' | 'empresa' | 'outros';

export default function SettingsTab({ settings, onRefresh }: Props) {
     const [activeTab, setActiveTab] = useState<SettingsTab>('financeiro');
     const [form, setForm] = useState({
          defaultKmPrice: String(settings.defaultKmPrice ?? 2.5),
          minutesPerEnvironment: String(settings.minutesPerEnvironment ?? 30),
          evolutionApiUrl: settings.evolutionApiUrl || '',
          evolutionInstance: settings.evolutionInstance || '',
          evolutionApiKey: settings.evolutionApiKey || '',
          managerPhone: settings.managerPhone || '',
          notifyManagerNewRequest: settings.notifyManagerNewRequest ?? true,
          notifyClientApproved: settings.notifyClientApproved ?? true,
          notifyClientRejected: settings.notifyClientRejected ?? true,
          notifyClientReschedule: settings.notifyClientReschedule ?? true,
          customHolidays: settings.customHolidays || [] as Holiday[],
          workOnSaturdays: settings.workOnSaturdays ?? false,
          workOnSundays: settings.workOnSundays ?? false,
          workStartTime: settings.workStartTime || '08:00',
          workEndTime: settings.workEndTime || '18:00',
          companyName: settings.companyName || '',
          companyCnpj: settings.companyCnpj || '',
          companyAddress: settings.companyAddress || '',
          companyPhone: settings.companyPhone || '',
     });
     const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'fixed' as 'fixed' | 'specific' });
     const [isSaving, setIsSaving] = useState(false);

     const handleSave = async (e: React.FormEvent) => {
          e.preventDefault();
          setIsSaving(true);
          try {
               await settingsService.saveSettings({
                    defaultKmPrice: Number(form.defaultKmPrice) || 0,
                    minutesPerEnvironment: Number(form.minutesPerEnvironment) || 30,
                    evolutionApiUrl: form.evolutionApiUrl,
                    evolutionInstance: form.evolutionInstance,
                    evolutionApiKey: form.evolutionApiKey,
                    managerPhone: form.managerPhone,
                    notifyManagerNewRequest: form.notifyManagerNewRequest,
                    notifyClientApproved: form.notifyClientApproved,
                    notifyClientRejected: form.notifyClientRejected,
                    notifyClientReschedule: form.notifyClientReschedule,
                    customHolidays: form.customHolidays,
                    workOnSaturdays: form.workOnSaturdays,
                    workOnSundays: form.workOnSundays,
                    workStartTime: form.workStartTime,
                    workEndTime: form.workEndTime,
                    companyName: form.companyName,
                    companyCnpj: form.companyCnpj,
                    companyAddress: form.companyAddress,
                    companyPhone: form.companyPhone,
               });
               toast.success('Configurações salvas com sucesso!');
               onRefresh();
          } catch {
               toast.error('Erro ao salvar configurações.');
          } finally {
               setIsSaving(false);
          }
     };

     const handleAddHoliday = () => {
          if (!newHoliday.date || !newHoliday.name) return;
          let formattedDate = newHoliday.date;
          if (newHoliday.type === 'fixed' && formattedDate.length > 5) formattedDate = formattedDate.substring(5);
          const holiday: Holiday = { id: Date.now().toString(), date: formattedDate, name: newHoliday.name, type: newHoliday.type };
          setForm(p => ({ ...p, customHolidays: [...p.customHolidays, holiday] }));
          setNewHoliday({ date: '', name: '', type: 'fixed' });
     };

     const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm";
     const checkLabel = "flex items-center space-x-3 cursor-pointer";

     const TABS: { key: SettingsTab; label: string }[] = [
          { key: 'financeiro', label: 'Financeiro' },
          { key: 'comunicacao', label: 'Comunicação (WhatsApp)' },
          { key: 'feriados', label: 'Feriados e Horários' },
          { key: 'empresa', label: 'Dados da Empresa' },
          { key: 'outros', label: 'Outros' },
     ];

     return (
          <div className="max-w-4xl bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-slate-200">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center"><Settings className="w-6 h-6 text-slate-600" /></div>
                    <div>
                         <h3 className="text-lg font-semibold text-slate-900">Configurações do Sistema</h3>
                         <p className="text-sm text-slate-500">Valores globais, WhatsApp e notificações.</p>
                    </div>
               </div>

               {/* Sub-tabs */}
               <div className="flex space-x-4 border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
                    {TABS.map(t => (
                         <button type="button" key={t.key} onClick={() => setActiveTab(t.key)} className={`pb-3 text-sm font-medium whitespace-nowrap ${activeTab === t.key ? 'border-b-2 border-blue-950 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
                    ))}
               </div>

               <form onSubmit={handleSave} className="space-y-8">
                    {activeTab === 'financeiro' && (
                         <div className="space-y-8">
                              <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Financeiro</h4>
                              <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-2">Valor Padrão do KM Rodado (R$)</label>
                                   <p className="text-xs text-slate-500 mb-3">Usado para lojas sem taxa de KM específica cadastrada.</p>
                                   <input type="number" step="0.01" value={form.defaultKmPrice} onChange={e => setForm(p => ({ ...p, defaultKmPrice: e.target.value }))} className="w-full md:w-1/2 px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                              </div>
                              <div className="pt-6 border-t border-slate-200">
                                   <label className="block text-sm font-medium text-slate-700 mb-2">⏱ Minutos por Ambiente (Portal do Cliente)</label>
                                   <p className="text-xs text-slate-500 mb-3">Tempo estimado que o sistema usa para calcular a duração de cada medição no portal do cliente. Padrão: 30 min por ambiente.</p>
                                   <div className="flex items-center gap-3">
                                        <input type="number" min="5" step="5" value={form.minutesPerEnvironment} onChange={e => setForm(p => ({ ...p, minutesPerEnvironment: e.target.value }))} className="w-32 px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                                        <span className="text-sm text-slate-500">minutos por ambiente</span>
                                   </div>
                                   <p className="text-xs text-slate-400 mt-2">Exemplo: 3 ambientes × {form.minutesPerEnvironment || 30} min = {3 * (Number(form.minutesPerEnvironment) || 30)} min totais</p>
                              </div>
                         </div>
                    )}

                    {activeTab === 'comunicacao' && (
                         <div className="space-y-8">
                              <div>
                                   <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Integração WhatsApp (Evolution API)</h4>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">URL da API</label><input type="text" value={form.evolutionApiUrl} onChange={e => setForm(p => ({ ...p, evolutionApiUrl: e.target.value }))} placeholder="https://api.suaevolution.com" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-2">Nome da Instância</label><input type="text" value={form.evolutionInstance} onChange={e => setForm(p => ({ ...p, evolutionInstance: e.target.value }))} placeholder="leao-medicoes" className={inputClass} /></div>
                                        <div><label className="block text-sm font-medium text-slate-700 mb-2">API Key (Token)</label><input type="password" value={form.evolutionApiKey} onChange={e => setForm(p => ({ ...p, evolutionApiKey: e.target.value }))} className={inputClass} /></div>
                                        <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">Seu Telefone (Gestor)</label><p className="text-xs text-slate-500 mb-2">Número que receberá avisos de novas solicitações.</p><input type="text" value={form.managerPhone} onChange={e => setForm(p => ({ ...p, managerPhone: e.target.value }))} placeholder="5511999999999" className="w-full md:w-1/2 px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" /></div>
                                   </div>
                              </div>
                              <div className="pt-6 border-t border-slate-200">
                                   <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Gatilhos de Notificação</h4>
                                   <div className="space-y-4">
                                        {[
                                             { key: 'notifyManagerNewRequest', label: 'Avisar Gestor (Você)', desc: 'Quando uma loja criar nova solicitação.' },
                                             { key: 'notifyClientApproved', label: 'Avisar Loja: Aprovação', desc: 'Quando você aprovar uma medição.' },
                                             { key: 'notifyClientReschedule', label: 'Avisar Loja: Pedido de Alteração', desc: 'Quando você pedir alteração de horário.' },
                                             { key: 'notifyClientRejected', label: 'Avisar Loja: Recusa', desc: 'Quando você recusar uma solicitação.' },
                                        ].map(({ key, label, desc }) => (
                                             <label key={key} className={checkLabel}>
                                                  <input type="checkbox" checked={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="w-5 h-5 text-slate-900 border-slate-300 rounded focus:ring-blue-950" />
                                                  <div><p className="text-sm font-medium text-slate-900">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>
                                             </label>
                                        ))}
                                   </div>
                              </div>
                         </div>
                    )}

                    {activeTab === 'feriados' && (
                         <div>
                              <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Horário de Funcionamento e Dias Úteis</h4>
                              <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                             <h5 className="text-sm font-semibold text-slate-900 mb-3">Dias de Atendimento</h5>
                                             <div className="space-y-3">
                                                  <label className={checkLabel}><input type="checkbox" checked={form.workOnSaturdays} onChange={e => setForm(p => ({ ...p, workOnSaturdays: e.target.checked }))} className="w-4 h-4 text-slate-900 border-slate-300 rounded" /><span className="text-sm text-slate-700">Atender aos Sábados</span></label>
                                                  <label className={checkLabel}><input type="checkbox" checked={form.workOnSundays} onChange={e => setForm(p => ({ ...p, workOnSundays: e.target.checked }))} className="w-4 h-4 text-slate-900 border-slate-300 rounded" /><span className="text-sm text-slate-700">Atender aos Domingos</span></label>
                                             </div>
                                        </div>
                                        <div>
                                             <h5 className="text-sm font-semibold text-slate-900 mb-3">Horário da Agenda</h5>
                                             <div className="grid grid-cols-2 gap-4">
                                                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Abertura</label><input type="time" value={form.workStartTime} onChange={e => setForm(p => ({ ...p, workStartTime: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-950 focus:border-blue-950 sm:text-sm" /></div>
                                                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Fechamento</label><input type="time" value={form.workEndTime} onChange={e => setForm(p => ({ ...p, workEndTime: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-950 focus:border-blue-950 sm:text-sm" /></div>
                                             </div>
                                        </div>
                                   </div>
                              </div>

                              <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider mt-8">Feriados e Dias Indisponíveis</h4>
                              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
                                   <h5 className="text-sm font-semibold text-slate-900 mb-3">Feriados Nacionais (Fixos)</h5>
                                   <div className="grid grid-cols-2 gap-1 text-sm">
                                        {FIXED_HOLIDAYS.map(h => <p key={h.date} className="text-slate-600"><span className="font-mono text-xs mr-2">{h.date}</span>{h.name}</p>)}
                                   </div>
                              </div>

                              <div className="bg-white rounded-xl border border-slate-200 p-4">
                                   <h5 className="text-sm font-semibold text-slate-900 mb-4">Feriados Personalizados</h5>
                                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Data</label><input type={newHoliday.type === 'fixed' ? 'text' : 'date'} placeholder={newHoliday.type === 'fixed' ? 'MM-DD' : ''} value={newHoliday.date} onChange={e => setNewHoliday(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg sm:text-sm" /></div>
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Nome</label><input type="text" placeholder="Ex: Carnaval" value={newHoliday.name} onChange={e => setNewHoliday(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg sm:text-sm" /></div>
                                        <div><label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Tipo</label><select value={newHoliday.type} onChange={e => setNewHoliday(p => ({ ...p, type: e.target.value as any }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg sm:text-sm"><option value="fixed">Fixo (todo ano)</option><option value="specific">Específico (este ano)</option></select></div>
                                        <div className="flex items-end"><button type="button" onClick={handleAddHoliday} disabled={!newHoliday.date || !newHoliday.name} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">Adicionar</button></div>
                                   </div>
                                   {form.customHolidays.length === 0 ? <p className="text-center text-sm text-slate-500 py-4">Nenhum feriado personalizado cadastrado</p> : (
                                        <table className="w-full text-sm"><thead><tr className="text-slate-500 border-b border-slate-200"><th className="pb-2 font-medium text-left">Data</th><th className="pb-2 font-medium text-left">Nome</th><th className="pb-2 font-medium text-left">Tipo</th><th className="pb-2 font-medium text-right">Ação</th></tr></thead><tbody>
                                             {form.customHolidays.map(h => <tr key={h.id}><td className="py-2 font-mono text-xs text-slate-600">{h.date}</td><td className="py-2 text-slate-900">{h.name}</td><td className="py-2 text-slate-500">{h.type === 'fixed' ? 'Fixo (Anual)' : 'Específico'}</td><td className="py-2 text-right"><button type="button" onClick={() => setForm(p => ({ ...p, customHolidays: p.customHolidays.filter(x => x.id !== h.id) }))} className="text-red-600 hover:text-red-800 text-xs font-medium">Remover</button></td></tr>)}
                                        </tbody></table>
                                   )}
                              </div>

                              <div className="pt-6 border-t border-slate-200 mt-8">
                                   <button type="submit" disabled={isSaving} className="px-6 py-3 bg-blue-950 text-white rounded-xl hover:bg-blue-900 text-sm font-medium disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Configurações'}</button>
                              </div>
                         </div>
                    )}

                    {activeTab === 'empresa' && (
                         <div className="space-y-6">
                              <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-2">Razão Social / Nome da Empresa</label>
                                   <input type="text" value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} className={inputClass} placeholder="Ex: Leão Medições Ltda" />
                              </div>
                              <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-2">CNPJ</label>
                                   <input type="text" value={form.companyCnpj} onChange={e => setForm(p => ({ ...p, companyCnpj: e.target.value }))} className={inputClass} placeholder="00.000.000/0000-00" />
                              </div>
                              <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-2">Endereço Completo</label>
                                   <input type="text" value={form.companyAddress} onChange={e => setForm(p => ({ ...p, companyAddress: e.target.value }))} className={inputClass} placeholder="Rua, Número, Bairro, Cidade - Estado" />
                              </div>
                              <div>
                                   <label className="block text-sm font-medium text-slate-700 mb-2">Telefone (Empresa)</label>
                                   <input type="text" value={form.companyPhone} onChange={e => setForm(p => ({ ...p, companyPhone: e.target.value }))} className={inputClass} placeholder="(00) 00000-0000" />
                              </div>
                              <div className="flex justify-end pt-4"><button disabled={isSaving} type="submit" className="px-6 py-2.5 bg-blue-950 text-white rounded-xl hover:bg-blue-900 transition-colors font-medium">{isSaving ? 'Salvando...' : 'Salvar Configurações'}</button></div>
                         </div>
                    )}

                    {activeTab === 'outros' && (
                         <div className="py-8 text-center text-slate-500">Configurações adicionais em breve.</div>
                    )}

                    {activeTab !== 'feriados' && (
                         <div className="pt-6 border-t border-slate-200">
                              <button type="submit" disabled={isSaving} className="px-6 py-3 bg-blue-950 text-white rounded-xl hover:bg-blue-900 text-sm font-medium w-full md:w-auto disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Configurações'}</button>
                         </div>
                    )}
               </form>
          </div>
     );
}
