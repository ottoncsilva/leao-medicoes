<<<<<<< HEAD
import { useState } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { MeasurementRequest } from '../../services/requestService';
import { Client } from '../../services/clientService';
import { GlobalSettings } from '../../services/settingsService';
import { BillingStatus, billingService } from '../../services/billingService';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, FileDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ClientBillingModal from './ClientBillingModal';

// PDF Styles
const pdfStyles = StyleSheet.create({
     page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1c1917' },
     title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
     subtitle: { fontSize: 11, color: '#78716c', marginBottom: 24 },
     sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#78716c', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 20 },
     summary: { flexDirection: 'row', gap: 16, marginBottom: 20 },
     summaryCard: { flex: 1, backgroundColor: '#f5f5f4', borderRadius: 8, padding: 12 },
     summaryLabel: { fontSize: 8, color: '#78716c', marginBottom: 4 },
     summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
     table: { borderRadius: 4, overflow: 'hidden', border: '1 solid #e7e5e4' },
     tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f4', padding: '8 12', borderBottom: '1 solid #e7e5e4' },
     tableRow: { flexDirection: 'row', padding: '8 12', borderBottom: '1 solid #e7e5e4' },
     th: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#78716c', textTransform: 'uppercase' },
     td: { fontSize: 9 },
     footer: { marginTop: 30, borderTop: '1 solid #e7e5e4', paddingTop: 12, color: '#78716c', fontSize: 8 },
});

interface BillingEntry { clientId: string; clientName: string; totalEnvs: number; totalKm: number; totalValue: number; requestsCount: number; isPaid: boolean; }
interface PdfProps { billingData: BillingEntry[]; month: string; totalBilling: number; totalEnvs: number; totalKm: number; }

const BillingDocument = ({ billingData, month, totalBilling, totalEnvs, totalKm }: PdfProps) => (
     <Document title={`Faturamento ${month} — Leão Medições`}>
          <Page size="A4" style={pdfStyles.page}>
               <Text style={pdfStyles.title}>Leão Medições</Text>
               <Text style={pdfStyles.subtitle}>Relatório de Faturamento — {month}</Text>

               <View style={pdfStyles.summary}>
                    <View style={pdfStyles.summaryCard}><Text style={pdfStyles.summaryLabel}>Total a Receber</Text><Text style={pdfStyles.summaryValue}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBilling)}</Text></View>
                    <View style={pdfStyles.summaryCard}><Text style={pdfStyles.summaryLabel}>Ambientes Medidos</Text><Text style={pdfStyles.summaryValue}>{totalEnvs}</Text></View>
                    <View style={pdfStyles.summaryCard}><Text style={pdfStyles.summaryLabel}>KM Rodados</Text><Text style={pdfStyles.summaryValue}>{totalKm} km</Text></View>
               </View>

               <Text style={pdfStyles.sectionTitle}>Detalhamento por Cliente</Text>
               <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeader}>
                         <Text style={[pdfStyles.th, { flex: 3 }]}>Cliente</Text>
                         <Text style={[pdfStyles.th, { flex: 1, textAlign: 'center' }]}>Medições</Text>
                         <Text style={[pdfStyles.th, { flex: 1, textAlign: 'center' }]}>Ambientes</Text>
                         <Text style={[pdfStyles.th, { flex: 1, textAlign: 'center' }]}>KM</Text>
                         <Text style={[pdfStyles.th, { flex: 2, textAlign: 'right' }]}>Total</Text>
                         <Text style={[pdfStyles.th, { flex: 1, textAlign: 'center' }]}>Status</Text>
                    </View>
                    {billingData.map(b => (
                         <View key={b.clientId} style={pdfStyles.tableRow}>
                              <Text style={[pdfStyles.td, { flex: 3, fontFamily: 'Helvetica-Bold' }]}>{b.clientName}</Text>
                              <Text style={[pdfStyles.td, { flex: 1, textAlign: 'center' }]}>{b.requestsCount}</Text>
                              <Text style={[pdfStyles.td, { flex: 1, textAlign: 'center' }]}>{b.totalEnvs}</Text>
                              <Text style={[pdfStyles.td, { flex: 1, textAlign: 'center' }]}>{b.totalKm}</Text>
                              <Text style={[pdfStyles.td, { flex: 2, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.totalValue)}</Text>
                              <Text style={[pdfStyles.td, { flex: 1, textAlign: 'center', color: b.isPaid ? '#059669' : '#d97706' }]}>{b.isPaid ? 'Pago' : 'Em Aberto'}</Text>
                         </View>
                    ))}
               </View>
               <View style={pdfStyles.footer}><Text>Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })} • Leão Medições</Text></View>
          </Page>
     </Document>
);

interface Props {
     clients: Client[];
     requests: MeasurementRequest[];
     billingStatuses: BillingStatus[];
     settings: GlobalSettings;
     billingMonth: string;
     onMonthChange: (m: string) => void;
     onRefresh: () => void;
}

export default function BillingTab({ clients, requests, billingStatuses, settings, billingMonth, onMonthChange, onRefresh }: Props) {
     const [selectedBill, setSelectedBill] = useState<BillingEntry | null>(null);
     const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

     const [yearStr, monthStr] = billingMonth.split('-');
     const selectedMonthStart = new Date(Number(yearStr), Number(monthStr) - 1, 1);
     const selectedMonthEnd = endOfMonth(selectedMonthStart);

     const billingData: BillingEntry[] = clients.map(client => {
          const reqs = requests.filter(r => r.clientId === client.id && r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: selectedMonthStart, end: selectedMonthEnd }));
          const totalEnvs = reqs.reduce((a, r) => a + r.environmentsCount, 0);
          const totalKm = reqs.reduce((a, r) => a + (r.kmDriven || 0), 0);
          const kmPrice = client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice;
          let totalValue = 0;
          if (client.model === 'por_ambiente') totalValue = totalEnvs * client.baseValue + totalKm * kmPrice;
          else if (client.model === 'pacote') { const extra = Math.max(0, totalEnvs - (client.limitEnvs || 0)); totalValue = client.baseValue + extra * (client.baseValue / (client.limitEnvs || 1)) + totalKm * kmPrice; }
          else if (client.model === 'avulso') totalValue = reqs.length * client.baseValue + totalKm * kmPrice;
          const statusRecord = billingStatuses.find(b => b.id === `${client.id}_${billingMonth}`);
          return { clientId: client.id!, clientName: client.name, totalEnvs, totalKm, totalValue, requestsCount: reqs.length, isPaid: statusRecord?.status === 'paid' };
     }).filter(b => b.requestsCount > 0);

     const totalBilling = billingData.reduce((a, b) => a + b.totalValue, 0);
     const totalEnvsMonth = billingData.reduce((a, b) => a + b.totalEnvs, 0);
     const totalKmMonth = billingData.reduce((a, b) => a + b.totalKm, 0);

     const chartData = Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(new Date(), 5 - i);
          const mStart = startOfMonth(d), mEnd = endOfMonth(d);
          let monthTotal = 0;
          clients.forEach(client => {
               const reqs = requests.filter(r => r.clientId === client.id && r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: mStart, end: mEnd }));
               const envs = reqs.reduce((a, r) => a + r.environmentsCount, 0);
               const kms = reqs.reduce((a, r) => a + (r.kmDriven || 0), 0);
               const kP = client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice;
               if (client.model === 'por_ambiente') monthTotal += envs * client.baseValue + kms * kP;
               else if (client.model === 'pacote') { const extra = Math.max(0, envs - (client.limitEnvs || 0)); monthTotal += client.baseValue + extra * (client.baseValue / (client.limitEnvs || 1)) + kms * kP; }
               else if (client.model === 'avulso') monthTotal += reqs.length * client.baseValue + kms * kP;
          });
          return { name: format(d, 'MMM', { locale: ptBR }).toUpperCase(), Faturamento: monthTotal };
     });

     const handleMarkAsPaid = async (clientId: string) => {
          try {
               await billingService.markAsPaid(clientId, billingMonth);
               toast.success('Marcado como pago!');
               onRefresh();
          } catch {
               toast.error('Erro ao marcar como pago.');
          }
     };

     const handleExportPDF = async () => {
          const toastId = toast.loading('Gerando PDF...');
          try {
               const blob = await pdf(
                    <BillingDocument
                         billingData={billingData}
                         month={format(selectedMonthStart, 'MMMM/yyyy', { locale: ptBR })}
                         totalBilling={totalBilling}
                         totalEnvs={totalEnvsMonth}
                         totalKm={totalKmMonth}
                    />
               ).toBlob();
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = `faturamento-${billingMonth}.pdf`;
               a.click();
               URL.revokeObjectURL(url);
               toast.success('PDF exportado!', { id: toastId });
          } catch (e) {
               toast.error('Erro ao gerar PDF.', { id: toastId });
          }
     };

     return (
          <div className="space-y-6">
               <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">Resumo do Mês</h3>
                    <div className="flex items-center gap-3">
                         <input type="month" value={billingMonth} onChange={e => onMonthChange(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                         <button onClick={handleExportPDF} className="flex items-center px-4 py-2 bg-blue-950 text-white rounded-xl hover:bg-blue-900 text-sm font-medium gap-2">
                              <FileDown className="w-4 h-4" /> Exportar PDF
                         </button>
                    </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-500 mb-1">Total a Receber</p><h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalBilling)}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-500 mb-1">Ambientes Medidos</p><h3 className="text-2xl font-bold text-slate-900">{totalEnvsMonth}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-500 mb-1">KM Rodados</p><h3 className="text-2xl font-bold text-slate-900">{totalKmMonth} km</h3></div>
               </div>

               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
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
                                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhuma medição realizada neste mês.</td></tr>
                                   ) : billingData.map(bill => (
                                        <tr key={bill.clientId} onClick={() => setSelectedBill(bill)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                             <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                                  {bill.clientName}
                                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400"><Eye className="w-4 h-4 ml-2" /></span>
                                             </td>
                                             <td className="px-6 py-4 text-center text-slate-600">{bill.requestsCount}</td>
                                             <td className="px-6 py-4 text-center text-slate-600">{bill.totalEnvs}</td>
                                             <td className="px-6 py-4 text-center text-slate-600">{bill.totalKm}</td>
                                             <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(bill.totalValue)}</td>
                                             <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                  {bill.isPaid ? (
                                                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><Check className="w-3 h-3 mr-1" />Pago</span>
                                                  ) : (
                                                       <button onClick={() => handleMarkAsPaid(bill.clientId)} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-950 text-white hover:bg-blue-900 transition-colors">Marcar como Pago</button>
                                                  )}
                                             </td>
                                        </tr>
                                   ))}
                              </tbody>
                         </table>
                    </div>
               </div>

               {selectedBill && (
                    <ClientBillingModal
                         client={clients.find(c => c.id === selectedBill.clientId)!}
                         requests={requests.filter(r => r.clientId === selectedBill.clientId && r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: selectedMonthStart, end: selectedMonthEnd }))}
                         monthStr={format(selectedMonthStart, 'MMMM/yyyy', { locale: ptBR })}
                         totalValue={selectedBill.totalValue}
                         settings={settings}
                         onClose={() => setSelectedBill(null)}
                    />
               )}
          </div>
     );
}
=======
import { useState } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { MeasurementRequest } from '../../services/requestService';
import { Client } from '../../services/clientService';
import { GlobalSettings } from '../../services/settingsService';
import { BillingStatus, billingService } from '../../services/billingService';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, FileDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ClientBillingModal from './ClientBillingModal';

// PDF Styles
const pdfStyles = StyleSheet.create({
     page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1c1917' },
     title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
     subtitle: { fontSize: 11, color: '#78716c', marginBottom: 24 },
     sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#78716c', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 20 },
     summary: { flexDirection: 'row', gap: 16, marginBottom: 20 },
     summaryCard: { flex: 1, backgroundColor: '#f5f5f4', borderRadius: 8, padding: 12 },
     summaryLabel: { fontSize: 8, color: '#78716c', marginBottom: 4 },
     summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
     table: { borderRadius: 4, overflow: 'hidden', border: '1 solid #e7e5e4' },
     tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f4', padding: '8 12', borderBottom: '1 solid #e7e5e4' },
     tableRow: { flexDirection: 'row', padding: '8 12', borderBottom: '1 solid #e7e5e4' },
     th: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#78716c', textTransform: 'uppercase' },
     td: { fontSize: 9 },
     footer: { marginTop: 30, borderTop: '1 solid #e7e5e4', paddingTop: 12, color: '#78716c', fontSize: 8 },
});

interface BillingEntry { clientId: string; clientName: string; totalEnvs: number; totalKm: number; totalValue: number; requestsCount: number; isPaid: boolean; }
interface PdfProps { billingData: BillingEntry[]; month: string; totalBilling: number; totalEnvs: number; totalKm: number; }

const BillingDocument = ({ billingData, month, totalBilling, totalEnvs, totalKm }: PdfProps) => (
     <Document title={`Faturamento ${month} — Leão Medições`}>
          <Page size="A4" style={pdfStyles.page}>
               <Text style={pdfStyles.title}>Leão Medições</Text>
               <Text style={pdfStyles.subtitle}>Relatório de Faturamento — {month}</Text>

               <View style={pdfStyles.summary}>
                    <View style={pdfStyles.summaryCard}><Text style={pdfStyles.summaryLabel}>Total a Receber</Text><Text style={pdfStyles.summaryValue}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBilling)}</Text></View>
                    <View style={pdfStyles.summaryCard}><Text style={pdfStyles.summaryLabel}>Ambientes Medidos</Text><Text style={pdfStyles.summaryValue}>{totalEnvs}</Text></View>
                    <View style={pdfStyles.summaryCard}><Text style={pdfStyles.summaryLabel}>KM Rodados</Text><Text style={pdfStyles.summaryValue}>{totalKm} km</Text></View>
               </View>

               <Text style={pdfStyles.sectionTitle}>Detalhamento por Cliente</Text>
               <View style={pdfStyles.table}>
                    <View style={pdfStyles.tableHeader}>
                         <Text style={[pdfStyles.th, { flex: 3 }]}>Cliente</Text>
                         <Text style={[pdfStyles.th, { flex: 1, textAlign: 'center' }]}>Medições</Text>
                         <Text style={[pdfStyles.th, { flex: 1, textAlign: 'center' }]}>Ambientes</Text>
                         <Text style={[pdfStyles.th, { flex: 1, textAlign: 'center' }]}>KM</Text>
                         <Text style={[pdfStyles.th, { flex: 2, textAlign: 'right' }]}>Total</Text>
                         <Text style={[pdfStyles.th, { flex: 1, textAlign: 'center' }]}>Status</Text>
                    </View>
                    {billingData.map(b => (
                         <View key={b.clientId} style={pdfStyles.tableRow}>
                              <Text style={[pdfStyles.td, { flex: 3, fontFamily: 'Helvetica-Bold' }]}>{b.clientName}</Text>
                              <Text style={[pdfStyles.td, { flex: 1, textAlign: 'center' }]}>{b.requestsCount}</Text>
                              <Text style={[pdfStyles.td, { flex: 1, textAlign: 'center' }]}>{b.totalEnvs}</Text>
                              <Text style={[pdfStyles.td, { flex: 1, textAlign: 'center' }]}>{b.totalKm}</Text>
                              <Text style={[pdfStyles.td, { flex: 2, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.totalValue)}</Text>
                              <Text style={[pdfStyles.td, { flex: 1, textAlign: 'center', color: b.isPaid ? '#059669' : '#d97706' }]}>{b.isPaid ? 'Pago' : 'Em Aberto'}</Text>
                         </View>
                    ))}
               </View>
               <View style={pdfStyles.footer}><Text>Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })} • Leão Medições</Text></View>
          </Page>
     </Document>
);

interface Props {
     clients: Client[];
     requests: MeasurementRequest[];
     billingStatuses: BillingStatus[];
     settings: GlobalSettings;
     billingMonth: string;
     onMonthChange: (m: string) => void;
     onRefresh: () => void;
}

export default function BillingTab({ clients, requests, billingStatuses, settings, billingMonth, onMonthChange, onRefresh }: Props) {
     const [selectedBill, setSelectedBill] = useState<BillingEntry | null>(null);
     const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

     const [yearStr, monthStr] = billingMonth.split('-');
     const selectedMonthStart = new Date(Number(yearStr), Number(monthStr) - 1, 1);
     const selectedMonthEnd = endOfMonth(selectedMonthStart);

     const billingData: BillingEntry[] = clients.map(client => {
          const reqs = requests.filter(r => r.clientId === client.id && r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: selectedMonthStart, end: selectedMonthEnd }));
          const totalEnvs = reqs.reduce((a, r) => a + r.environmentsCount, 0);
          const totalKm = reqs.reduce((a, r) => a + (r.kmDriven || 0), 0);
          const kmPrice = client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice;
          let totalValue = 0;
          if (client.model === 'por_ambiente') totalValue = totalEnvs * client.baseValue + totalKm * kmPrice;
          else if (client.model === 'pacote') { const extra = Math.max(0, totalEnvs - (client.limitEnvs || 0)); totalValue = client.baseValue + extra * (client.baseValue / (client.limitEnvs || 1)) + totalKm * kmPrice; }
          else if (client.model === 'avulso') totalValue = reqs.length * client.baseValue + totalKm * kmPrice;
          const statusRecord = billingStatuses.find(b => b.id === `${client.id}_${billingMonth}`);
          return { clientId: client.id!, clientName: client.name, totalEnvs, totalKm, totalValue, requestsCount: reqs.length, isPaid: statusRecord?.status === 'paid' };
     }).filter(b => b.requestsCount > 0);

     const totalBilling = billingData.reduce((a, b) => a + b.totalValue, 0);
     const totalEnvsMonth = billingData.reduce((a, b) => a + b.totalEnvs, 0);
     const totalKmMonth = billingData.reduce((a, b) => a + b.totalKm, 0);

     const chartData = Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(new Date(), 5 - i);
          const mStart = startOfMonth(d), mEnd = endOfMonth(d);
          let monthTotal = 0;
          clients.forEach(client => {
               const reqs = requests.filter(r => r.clientId === client.id && r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: mStart, end: mEnd }));
               const envs = reqs.reduce((a, r) => a + r.environmentsCount, 0);
               const kms = reqs.reduce((a, r) => a + (r.kmDriven || 0), 0);
               const kP = client.kmValue > 0 ? client.kmValue : settings.defaultKmPrice;
               if (client.model === 'por_ambiente') monthTotal += envs * client.baseValue + kms * kP;
               else if (client.model === 'pacote') { const extra = Math.max(0, envs - (client.limitEnvs || 0)); monthTotal += client.baseValue + extra * (client.baseValue / (client.limitEnvs || 1)) + kms * kP; }
               else if (client.model === 'avulso') monthTotal += reqs.length * client.baseValue + kms * kP;
          });
          return { name: format(d, 'MMM', { locale: ptBR }).toUpperCase(), Faturamento: monthTotal };
     });

     const handleMarkAsPaid = async (clientId: string) => {
          try {
               await billingService.markAsPaid(clientId, billingMonth);
               toast.success('Marcado como pago!');
               onRefresh();
          } catch {
               toast.error('Erro ao marcar como pago.');
          }
     };

     const handleExportPDF = async () => {
          const toastId = toast.loading('Gerando PDF...');
          try {
               const blob = await pdf(
                    <BillingDocument
                         billingData={billingData}
                         month={format(selectedMonthStart, 'MMMM/yyyy', { locale: ptBR })}
                         totalBilling={totalBilling}
                         totalEnvs={totalEnvsMonth}
                         totalKm={totalKmMonth}
                    />
               ).toBlob();
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = `faturamento-${billingMonth}.pdf`;
               a.click();
               URL.revokeObjectURL(url);
               toast.success('PDF exportado!', { id: toastId });
          } catch (e) {
               toast.error('Erro ao gerar PDF.', { id: toastId });
          }
     };

     return (
          <div className="space-y-6">
               <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">Resumo do Mês</h3>
                    <div className="flex items-center gap-3">
                         <input type="month" value={billingMonth} onChange={e => onMonthChange(e.target.value)} className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-blue-950 focus:border-blue-950 sm:text-sm" />
                         <button onClick={handleExportPDF} className="flex items-center px-4 py-2 bg-blue-950 text-white rounded-xl hover:bg-blue-900 text-sm font-medium gap-2">
                              <FileDown className="w-4 h-4" /> Exportar PDF
                         </button>
                    </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-500 mb-1">Total a Receber</p><h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totalBilling)}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-500 mb-1">Ambientes Medidos</p><h3 className="text-2xl font-bold text-slate-900">{totalEnvsMonth}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"><p className="text-sm font-medium text-slate-500 mb-1">KM Rodados</p><h3 className="text-2xl font-bold text-slate-900">{totalKmMonth} km</h3></div>
               </div>

               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
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
                                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Nenhuma medição realizada neste mês.</td></tr>
                                   ) : billingData.map(bill => (
                                        <tr key={bill.clientId} onClick={() => setSelectedBill(bill)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                             <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                                  {bill.clientName}
                                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400"><Eye className="w-4 h-4 ml-2" /></span>
                                             </td>
                                             <td className="px-6 py-4 text-center text-slate-600">{bill.requestsCount}</td>
                                             <td className="px-6 py-4 text-center text-slate-600">{bill.totalEnvs}</td>
                                             <td className="px-6 py-4 text-center text-slate-600">{bill.totalKm}</td>
                                             <td className="px-6 py-4 text-right font-medium text-slate-900">{formatCurrency(bill.totalValue)}</td>
                                             <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                  {bill.isPaid ? (
                                                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><Check className="w-3 h-3 mr-1" />Pago</span>
                                                  ) : (
                                                       <button onClick={() => handleMarkAsPaid(bill.clientId)} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-950 text-white hover:bg-blue-900 transition-colors">Marcar como Pago</button>
                                                  )}
                                             </td>
                                        </tr>
                                   ))}
                              </tbody>
                         </table>
                    </div>
               </div>

               {selectedBill && (
                    <ClientBillingModal
                         client={clients.find(c => c.id === selectedBill.clientId)!}
                         requests={requests.filter(r => r.clientId === selectedBill.clientId && r.status === 'completed' && isWithinInterval(new Date(`${r.requestedDate}T12:00:00`), { start: selectedMonthStart, end: selectedMonthEnd }))}
                         monthStr={format(selectedMonthStart, 'MMMM/yyyy', { locale: ptBR })}
                         totalValue={selectedBill.totalValue}
                         settings={settings}
                         onClose={() => setSelectedBill(null)}
                    />
               )}
          </div>
     );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
