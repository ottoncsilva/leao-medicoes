import { useState } from 'react';
import { Building2, Plus, Edit2, KeyRound } from 'lucide-react';
import { clientService, Client } from '../../services/clientService';
import { GlobalSettings } from '../../services/settingsService';
import { toast } from 'sonner';
import { auth } from '../../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface Props {
     clients: Client[];
     settings: GlobalSettings;
     onRefresh: () => void;
}

const EMPTY_CLIENT = {
     name: '', contact: '', phone: '', cnpj: '', address: '', stateRegistration: '',
     corporateName: '', responsibleContact: '', model: 'por_ambiente' as Client['model'],
     baseValue: '', kmValue: '', limitEnvs: ''
};

export default function ClientsTab({ clients, settings, onRefresh }: Props) {
     const [showForm, setShowForm] = useState(false);
     const [editingClient, setEditingClient] = useState<Client | null>(null);
     const [form, setForm] = useState(EMPTY_CLIENT);

     const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
     const getModelLabel = (m: string) => ({ por_ambiente: 'Por Ambiente', pacote: 'Pacote Mensal', avulso: 'Avulso' }[m] || m);

     const handleCreate = async () => {
          try {
               await clientService.createClient({
                    name: form.name, contact: form.contact.toLowerCase().trim(), phone: form.phone,
                    cnpj: form.cnpj, address: form.address, stateRegistration: form.stateRegistration,
                    corporateName: form.corporateName, responsibleContact: form.responsibleContact,
                    model: form.model, baseValue: Number(form.baseValue) || 0, kmValue: Number(form.kmValue) || 0,
                    limitEnvs: form.model === 'pacote' ? Number(form.limitEnvs) : undefined,
               });
               toast.success('Cliente criado com sucesso!');
               setShowForm(false);
               setForm(EMPTY_CLIENT);
               onRefresh();
          } catch {
               toast.error('Erro ao criar cliente.');
          }
     };

     const handleUpdate = async () => {
          if (!editingClient?.id) return;
          try {
               await clientService.updateClient(editingClient.id, {
                    name: editingClient.name, contact: editingClient.contact.toLowerCase().trim(),
                    phone: editingClient.phone, cnpj: editingClient.cnpj, address: editingClient.address,
                    stateRegistration: editingClient.stateRegistration, corporateName: editingClient.corporateName,
                    responsibleContact: editingClient.responsibleContact, model: editingClient.model,
                    baseValue: Number(editingClient.baseValue) || 0, kmValue: Number(editingClient.kmValue) || 0,
                    limitEnvs: editingClient.model === 'pacote' ? Number(editingClient.limitEnvs) : undefined,
               });
               toast.success('Cliente atualizado!');
               setEditingClient(null);
               onRefresh();
          } catch {
               toast.error('Erro ao atualizar cliente.');
          }
     };

     const handleResetPassword = async (email: string) => {
          try {
               await sendPasswordResetEmail(auth, email);
               toast.success(`Link de redefinição de senha enviado para ${email}`);
          } catch (error: any) {
               console.error("Erro reset senha:", error);
               toast.error('Ocorreu um erro ao enviar e-mail de redefinicão. O e-mail está cadastrado no Firebase Auth?');
          }
     };

     const inputClass = "w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm";

     const renderForm = (data: any, setData: (v: any) => void, isEditing: boolean) => (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-4xl">
               <h3 className="text-lg font-semibold text-slate-900 mb-6">{isEditing ? 'Editar Loja' : 'Cadastrar Nova Loja'}</h3>
               <form onSubmit={e => { e.preventDefault(); isEditing ? handleUpdate() : handleCreate(); }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="md:col-span-2 border-b border-slate-200 pb-4 mb-2"><h4 className="text-sm font-semibold text-slate-900">Dados Principais</h4></div>
                         <div><label className="block text-sm font-medium text-slate-700 mb-2">Nome Fantasia *</label><input required type="text" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} className={inputClass} /></div>
                         <div><label className="block text-sm font-medium text-slate-700 mb-2">Razão Social</label><input type="text" value={data.corporateName || ''} onChange={e => setData({ ...data, corporateName: e.target.value })} className={inputClass} /></div>
                         <div><label className="block text-sm font-medium text-slate-700 mb-2">CNPJ</label><input type="text" value={data.cnpj || ''} onChange={e => setData({ ...data, cnpj: e.target.value })} className={inputClass} placeholder="00.000.000/0000-00" /></div>
                         <div><label className="block text-sm font-medium text-slate-700 mb-2">Inscrição Estadual</label><input type="text" value={data.stateRegistration || ''} onChange={e => setData({ ...data, stateRegistration: e.target.value })} className={inputClass} /></div>
                         <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">Endereço</label><input type="text" value={data.address || ''} onChange={e => setData({ ...data, address: e.target.value })} className={inputClass} placeholder="Rua, Número, Bairro, Cidade - UF" /></div>

                         <div className="md:col-span-2 border-b border-slate-200 pb-4 mb-2 mt-4"><h4 className="text-sm font-semibold text-slate-900">Contato e Acesso</h4></div>
                         <div><label className="block text-sm font-medium text-slate-700 mb-2">Contato Responsável</label><input type="text" value={data.responsibleContact || ''} onChange={e => setData({ ...data, responsibleContact: e.target.value })} className={inputClass} /></div>
                         <div><label className="block text-sm font-medium text-slate-700 mb-2">Telefone WhatsApp</label><input type="text" value={data.phone || ''} onChange={e => setData({ ...data, phone: e.target.value })} className={inputClass} placeholder="5511999999999" /></div>
                         <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">E-mail de Login *</label>
                              <div className="flex gap-2">
                                   <input required type="email" value={data.contact} onChange={e => setData({ ...data, contact: e.target.value })} className={inputClass} disabled={isEditing} />
                                   {isEditing && (
                                        <button type="button" onClick={() => handleResetPassword(data.contact)} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl whitespace-nowrap text-sm font-medium flex items-center transition-colors">
                                             <KeyRound className="w-4 h-4 mr-2" /> Redefinir Senha
                                        </button>
                                   )}
                              </div>
                              {isEditing && <p className="text-xs text-slate-500 mt-1">O e-mail de login não pode ser alterado. Você pode enviar a redefinição de senha.</p>}
                         </div>

                         <div className="md:col-span-2 border-b border-slate-200 pb-4 mb-2 mt-4"><h4 className="text-sm font-semibold text-slate-900">Regras de Cobrança</h4></div>
                         <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-slate-700 mb-2">Modelo de Contrato</label>
                              <select value={data.model} onChange={e => setData({ ...data, model: e.target.value })} className={inputClass}>
                                   <option value="por_ambiente">Valor Fixo por Ambiente</option>
                                   <option value="pacote">Pacote Mensal Fechado</option>
                                   <option value="avulso">Avulso (Combinado no ato)</option>
                              </select>
                         </div>
                         {data.model === 'pacote' && <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">Limite de Ambientes do Pacote</label><input type="number" value={data.limitEnvs} onChange={e => setData({ ...data, limitEnvs: e.target.value })} className={inputClass} /></div>}
                         <div><label className="block text-sm font-medium text-slate-700 mb-2">Valor Base (R$)</label><input type="number" step="0.01" value={data.baseValue} onChange={e => setData({ ...data, baseValue: e.target.value })} className={inputClass} /></div>
                         <div><label className="block text-sm font-medium text-slate-700 mb-2">Valor do KM (R$)</label><input type="number" step="0.01" value={data.kmValue} onChange={e => setData({ ...data, kmValue: e.target.value })} className={inputClass} placeholder="0 = usa o global" /></div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
                         <button type="button" onClick={() => { setShowForm(false); setEditingClient(null); }} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium">Cancelar</button>
                         <button type="submit" disabled={!data.name || !data.contact} className="px-4 py-2 bg-blue-950 text-white rounded-xl hover:bg-blue-900 text-sm font-medium disabled:opacity-50">{isEditing ? 'Salvar Alterações' : 'Salvar Cliente'}</button>
                    </div>
               </form>
          </div>
     );

     if (showForm) return <div className="space-y-6">{renderForm(form, setForm, false)}</div>;
     if (editingClient) return <div className="space-y-6">{renderForm(editingClient, setEditingClient, true)}</div>;

     return (
          <div className="space-y-6">
               <div className="flex justify-end">
                    <button onClick={() => setShowForm(true)} className="flex items-center px-4 py-2 bg-blue-950 text-white rounded-xl hover:bg-blue-900 text-sm font-medium"><Plus className="w-4 h-4 mr-2" />Novo Cliente</button>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {clients.map(client => (
                         <div key={client.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                              <div className="flex items-start justify-between mb-4">
                                   <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-slate-600" /></div>
                                        <div>
                                             <h3 className="font-semibold text-slate-900">{client.name}</h3>
                                             <p className="text-xs text-slate-500">{client.contact}</p>
                                             {client.phone && <p className="text-xs text-slate-500">WA: {client.phone}</p>}
                                             {client.cnpj && <p className="text-xs text-slate-500">CNPJ: {client.cnpj}</p>}
                                        </div>
                                   </div>
                                   <div className="flex flex-col items-end space-y-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{getModelLabel(client.model)}</span>
                                        <button onClick={() => setEditingClient(client)} className="text-xs text-slate-500 hover:text-slate-900 flex items-center"><Edit2 className="w-3 h-3 mr-1" />Editar</button>
                                   </div>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                                   <div className="flex justify-between text-sm"><span className="text-slate-500">Valor Base:</span><span className="font-medium text-slate-900">{client.model === 'avulso' ? 'A combinar' : formatCurrency(client.baseValue)}{client.model === 'por_ambiente' && ' / ambiente'}{client.model === 'pacote' && ' / mês'}</span></div>
                                   {client.model === 'pacote' && client.limitEnvs && <div className="flex justify-between text-sm"><span className="text-slate-500">Limite do Pacote:</span><span className="font-medium text-slate-900">{client.limitEnvs} ambientes</span></div>}
                                   <div className="flex justify-between text-sm"><span className="text-slate-500">Taxa de KM:</span><span className="font-medium text-slate-900">{client.kmValue > 0 ? formatCurrency(client.kmValue) : `${formatCurrency(settings.defaultKmPrice)} (Global)`} / km</span></div>
                              </div>
                         </div>
                    ))}
               </div>
          </div>
     );
}
