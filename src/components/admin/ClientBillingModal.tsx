import { useState } from 'react';
import { X, FileDown, CalendarDays, MapPin, Building2, Ruler, Loader2 } from 'lucide-react';
import { MeasurementRequest } from '../../services/requestService';
import { Client } from '../../services/clientService';
import { GlobalSettings } from '../../services/settingsService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { toast } from 'sonner';

// ========================
// Estilos do PDF do Cliente
// ========================// PDF Styles
export const pdfStyles = StyleSheet.create({
     page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b' },
     header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '1 solid #cbd5e1', paddingBottom: 16, marginBottom: 24 },
     headerLeft: { flex: 1 },
     companyName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1e3a8a', marginBottom: 4 },
     companyData: { fontSize: 9, color: '#64748b', marginBottom: 2 },
     headerRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-end' },
     faturaTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 4 },
     faturaData: { fontSize: 10, color: '#64748b' },

     clientBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 24, border: '1 solid #e2e8f0' },
     clientTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 8, color: '#0f172a' },
     clientDataRow: { flexDirection: 'row', marginBottom: 4 },
     clientDataLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#475569', width: 60 },
     clientDataValue: { fontSize: 10, color: '#1e293b', flex: 1 },

     table: { border: '1 solid #e2e8f0', borderRadius: 4, overflow: 'hidden' },
     tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottom: '1 solid #e2e8f0', padding: 8 },
     tableRow: { flexDirection: 'row', borderBottom: '1 solid #e2e8f0', padding: 8 },
     th: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#475569' },
     td: { fontSize: 9, color: '#1e293b' },

     colDate: { flex: 1.5 },
     colProject: { flex: 3 },
     colEnvs: { flex: 1, textAlign: 'center' },
     colKm: { flex: 1, textAlign: 'center' },
     colValue: { flex: 1.5, textAlign: 'right' },

     totalsBox: { marginTop: 24, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, alignSelf: 'flex-end', width: 250, border: '1 solid #e2e8f0' },
     totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
     totalLabel: { fontSize: 10, color: '#475569' },
     totalValue: { fontSize: 10, color: '#1e293b', fontFamily: 'Helvetica-Bold' },
     grandTotalValue: { fontSize: 14, color: '#1e3a8a', fontFamily: 'Helvetica-Bold' },

     footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#94a3b8', fontSize: 8, borderTop: '1 solid #e2e8f0', paddingTop: 10 }
});

export const ClientBillingPDF = ({ client, requests, month, totalValue, totalKm, totalEnvs, settings }: { client: Client, requests: MeasurementRequest[], month: string, totalValue: number, totalKm: number, totalEnvs: number, settings: GlobalSettings }) => {
     const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
     const companyName = settings.companyName || 'Leão Medições';
     const companyCnpj = settings.companyCnpj || '00.000.000/0000-00';
     const companyAddress = settings.companyAddress || 'Endereço não cadastrado';
     const companyPhone = settings.companyPhone || 'Sem telefone';

     return (
          <Document title={`Fatura ${client.name} — ${month}`}>
               <Page size="A4" style={pdfStyles.page}>
                    {/* Header */}
                    <View style={pdfStyles.header}>
                         <View style={pdfStyles.headerLeft}>
                              <Text style={pdfStyles.companyName}>{companyName.toUpperCase()}</Text>
                              <Text style={pdfStyles.companyData}>CNPJ: {companyCnpj}</Text>
                              <Text style={pdfStyles.companyData}>Endereço: {companyAddress}</Text>
                              <Text style={pdfStyles.companyData}>Contato: {companyPhone}</Text>
                         </View>
                         <View style={pdfStyles.headerRight}>
                              <Text style={pdfStyles.faturaTitle}>FATURA</Text>
                              <Text style={pdfStyles.faturaData}>Referência: {month}</Text>
                         </View>
                    </View>

                    {/* Cliente Info */}
                    <View style={pdfStyles.clientBox}>
                         <Text style={pdfStyles.clientTitle}>Dados da Loja / Cliente</Text>
                         <View style={pdfStyles.clientDataRow}>
                              <Text style={pdfStyles.clientDataLabel}>Razão Social:</Text>
                              <Text style={pdfStyles.clientDataValue}>{client.name}</Text>
                         </View>
                         <View style={pdfStyles.clientDataRow}>
                              <Text style={pdfStyles.clientDataLabel}>Documento:</Text>
                              <Text style={pdfStyles.clientDataValue}>{client.cnpj || 'Não informado'}</Text>
                         </View>
                         <View style={pdfStyles.clientDataRow}>
                              <Text style={pdfStyles.clientDataLabel}>Endereço:</Text>
                              <Text style={pdfStyles.clientDataValue}>{client.address || 'Não informado'}</Text>
                         </View>
                    </View>

                    {/* Tabela de Medições */}
                    <View style={pdfStyles.table}>
                         <View style={pdfStyles.tableHeader}>
                              <Text style={[pdfStyles.th, pdfStyles.colDate]}>Data Realiz.</Text>
                              <Text style={[pdfStyles.th, pdfStyles.colProject]}>Projeto / Cliente Final</Text>
                              <Text style={[pdfStyles.th, pdfStyles.colEnvs]}>Ambientes (R$)</Text>
                              <Text style={[pdfStyles.th, pdfStyles.colKm]}>KM Adicional (R$)</Text>
                              <Text style={[pdfStyles.th, pdfStyles.colValue]}>Valor Calculado</Text>
                         </View>
                         {requests.map((r, i) => {
                              const itemKmValue = (r.kmDriven || 0) * (client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice);
                              let itemBaseValue = 0;
                              if (client.model === 'por_ambiente') {
                                   itemBaseValue = r.environmentsCount * client.baseValue;
                              } else {
                                   itemBaseValue = client.baseValue; // Simplificado para visualização no relatorio
                              }
                              const itemTotal = itemBaseValue + itemKmValue;

                              return (
                                   <View key={i} style={[pdfStyles.tableRow, i === requests.length - 1 ? { borderBottom: 0 } : {}]}>
                                        <Text style={[pdfStyles.td, pdfStyles.colDate]}>{format(new Date(`${r.requestedDate}T12:00:00`), 'dd/MM/yyyy')}</Text>
                                        <Text style={[pdfStyles.td, pdfStyles.colProject]}>{r.projectName || r.contactName || 'Sem nome'}</Text>
                                        <Text style={[pdfStyles.td, pdfStyles.colEnvs]}>{r.environmentsCount} ({formatCurrency(itemBaseValue)})</Text>
                                        <Text style={[pdfStyles.td, pdfStyles.colKm]}>{r.kmDriven || 0} ({formatCurrency(itemKmValue)})</Text>
                                        <Text style={[pdfStyles.td, pdfStyles.colValue]}>{formatCurrency(itemTotal)}</Text>
                                   </View>
                              );
                         })}
                    </View>

                    {/* Totais */}
                    <View style={pdfStyles.totalsBox}>
                         <View style={pdfStyles.totalRow}>
                              <Text style={pdfStyles.totalLabel}>Total de Medições/Ambientes:</Text>
                              <Text style={pdfStyles.totalValue}>{requests.length} med / {totalEnvs} amb</Text>
                         </View>
                         <View style={pdfStyles.totalRow}>
                              <Text style={pdfStyles.totalLabel}>Custo de Medições:</Text>
                              <Text style={pdfStyles.totalValue}>{formatCurrency(requests.reduce((acc, r) => acc + (client.model === 'por_ambiente' ? r.environmentsCount * client.baseValue : client.baseValue), 0))}</Text>
                         </View>
                         <View style={pdfStyles.totalRow}>
                              <Text style={pdfStyles.totalLabel}>Total de KM Adicional:</Text>
                              <Text style={pdfStyles.totalValue}>{totalKm} km ({formatCurrency(totalKm * (client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice))})</Text>
                         </View>
                         <View style={[pdfStyles.totalRow, { marginTop: 8, paddingTop: 8, borderTop: '1 solid #cbd5e1' }]}>
                              <Text style={[pdfStyles.totalLabel, { fontFamily: 'Helvetica-Bold', color: '#1e3a8a' }]}>VALOR DA FATURA:</Text>
                              <Text style={pdfStyles.grandTotalValue}>{formatCurrency(totalValue)}</Text>
                         </View>
                    </View>

                    {/* Footer */}
                    <Text style={pdfStyles.footer}>
                         Documento gerado pelo sistema {companyName} em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                    </Text>
               </Page>
          </Document>
     );
};


// ========================
// Modal Component
// ========================

interface Props {
     client: Client;
     requests: MeasurementRequest[];
     monthStr: string;
     totalValue: number;
     settings: GlobalSettings;
     onClose: () => void;
}

export default function ClientBillingModal({ client, requests, monthStr, totalValue, settings, onClose }: Props) {
     const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
     const [isGenerating, setIsGenerating] = useState(false);

     const totalEnvs = requests.reduce((a, r) => a + r.environmentsCount, 0);
     const totalKm = requests.reduce((a, r) => a + (r.kmDriven || 0), 0);

     // Ordena do mais antigo para o mais novo
     const sortedRequests = [...requests].sort((a, b) => new Date(`${a.requestedDate}T00:00:00`).getTime() - new Date(`${b.requestedDate}T00:00:00`).getTime());

     const handleGeneratePdf = async () => {
          setIsGenerating(true);
          const toastId = toast.loading('Gerando PDF da Fatura...');
          try {
               const doc = (
                    <ClientBillingPDF
                         client={client}
                         requests={sortedRequests}
                         month={monthStr}
                         totalValue={totalValue}
                         totalEnvs={totalEnvs}
                         totalKm={totalKm}
                         settings={settings}
                    />
               );
               const blob = await pdf(doc).toBlob();
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = `FATURA_${client.name.replace(/\s+/g, '_')}_${monthStr.replace('/', '_')}.pdf`;
               a.click();
               URL.revokeObjectURL(url);
               toast.success('PDF gerado com sucesso!', { id: toastId });
          } catch (error) {
               console.error('Erro ao gerar PDF', error);
               toast.error('Erro ao gerar documento PDF.', { id: toastId });
          } finally {
               setIsGenerating(false);
          }
     };

     return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                         <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-900">
                                   <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                   <h2 className="text-xl font-semibold text-slate-900 leading-tight">Detalhamento: {client.name}</h2>
                                   <p className="text-sm text-slate-500">Ref: {monthStr} • {requests.length} medições concluídas</p>
                              </div>
                         </div>
                         <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-lg border border-slate-200">
                              <X className="w-5 h-5" />
                         </button>
                    </div>

                    <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                   <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Total a Faturar</p>
                                   <h3 className="text-2xl font-bold text-blue-950">{formatCurrency(totalValue)}</h3>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                   <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Modelo Comercial</p>
                                   <h3 className="text-lg font-bold text-slate-900 mt-1 capitalize">{client.model.replace('_', ' ')}</h3>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                   <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Total Ambientes</p>
                                   <h3 className="text-2xl font-bold text-slate-900">{totalEnvs}</h3>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                   <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">KM Adicional</p>
                                   <h3 className="text-2xl font-bold text-slate-900">{totalKm} km</h3>
                              </div>
                         </div>

                         <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <div className="overflow-x-auto">
                                   <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                             <tr>
                                                  <th className="px-4 py-3">Data</th>
                                                  <th className="px-4 py-3">Projeto / Cliente Final</th>
                                                  <th className="px-4 py-3 text-center">Ambientes</th>
                                                  <th className="px-4 py-3 text-center">Valor Ambiente</th>
                                                  <th className="px-4 py-3 text-center">KM Extra</th>
                                                  <th className="px-4 py-3 text-center">Valor KM</th>
                                                  <th className="px-4 py-3 text-right">Total Calculado</th>
                                             </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                             {sortedRequests.length === 0 ? (
                                                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nenhuma medição para detalhar.</td></tr>
                                             ) : sortedRequests.map(r => {
                                                  const itemKmValue = (r.kmDriven || 0) * (client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice);
                                                  const itemBaseValue = client.model === 'por_ambiente' ? r.environmentsCount * client.baseValue : client.baseValue;
                                                  return (
                                                       <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                                                                 <CalendarDays className="w-4 h-4 text-slate-400" />
                                                                 {format(new Date(`${r.requestedDate}T12:00:00`), 'dd/MM/yyyy')}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 max-w-[150px] truncate" title={r.projectName || r.contactName || 'N/A'}>{r.projectName || r.contactName || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-center text-slate-700 font-medium">
                                                                 <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-xs">
                                                                      <Ruler className="w-3 h-3 mr-1" />{r.environmentsCount}
                                                                 </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-slate-500">{formatCurrency(itemBaseValue)}</td>
                                                            <td className="px-4 py-3 text-center text-slate-700">{r.kmDriven || 0}</td>
                                                            <td className="px-4 py-3 text-center text-slate-500">{formatCurrency(itemKmValue)}</td>
                                                            <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(itemBaseValue + itemKmValue)}</td>
                                                       </tr>
                                                  )
                                             })}
                                        </tbody>
                                   </table>
                              </div>
                         </div>
                    </div>

                    <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                         <span className="text-sm text-slate-500">Dados da empresa {settings.companyName || 'Leão Medições'} serão exibidos no cabeçalho.</span>
                         <div className="flex gap-3 w-full sm:w-auto">
                              <button onClick={onClose} className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium text-sm transition-colors flex-1 sm:flex-none text-center">
                                   Fechar
                              </button>
                              <button onClick={handleGeneratePdf} disabled={isGenerating} className="flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm transition-colors flex-1 sm:flex-none shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                                   {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                                   Gerar PDF da Fatura
                              </button>
                         </div>
                    </div>
               </div>
          </div>
     );
}
