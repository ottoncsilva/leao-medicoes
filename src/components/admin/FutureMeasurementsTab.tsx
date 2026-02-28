<<<<<<< HEAD
import { useState } from 'react';
import { MeasurementRequest } from '../../services/requestService';
import { format } from 'date-fns';
import { Clock, Search, ExternalLink, CalendarDays, RefreshCw } from 'lucide-react';

interface Props {
     requests: MeasurementRequest[];
}

export default function FutureMeasurementsTab({ requests }: Props) {
     const [searchTerm, setSearchTerm] = useState('');

     // Pega todas as requisições "completed" que tem ambientes "não medidos"
     const futureMeasurements = requests
          .filter(r => r.status === 'completed' && r.environments && r.environments.some(e => !e.isMeasured))
          .flatMap(r => {
               const unmeasured = r.environments!.filter(e => !e.isMeasured);
               return unmeasured.map(env => ({
                    request: r,
                    environment: env
               }));
          })
          .sort((a, b) => new Date(`${b.request.requestedDate}T${b.request.requestedTime}:00`).getTime() - new Date(`${a.request.requestedDate}T${a.request.requestedTime}:00`).getTime());

     const filteredMeasurements = futureMeasurements.filter(m =>
          m.request.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.request.projectName && m.request.projectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          m.environment.name.toLowerCase().includes(searchTerm.toLowerCase())
     );

     return (
          <div className="space-y-6">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                   <h2 className="text-xl font-bold text-slate-900 border-l-4 border-amber-500 pl-4">
                                        Medidas Futuras (Remarketing)
                                   </h2>
                                   <p className="text-slate-500 text-sm mt-2 ml-4">
                                        Histórico de ambientes não medidos durante as visitas, ideal para contato futuro e prospecção.
                                   </p>
                              </div>

                              <div className="relative">
                                   <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                   <input
                                        type="text"
                                        placeholder="Buscar cliente, projeto..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-amber-500 focus:border-amber-500 w-full sm:w-64"
                                   />
                              </div>
                         </div>
                    </div>

                    {filteredMeasurements.length === 0 ? (
                         <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                              <RefreshCw className="w-10 h-10 text-slate-300 mb-3" />
                              <p>Nenhuma medida futura encontrada em seu histórico de visitas concluídas.</p>
                         </div>
                    ) : (
                         <>
                              {/* Desktop View (Table) */}
                              <div className="hidden md:block overflow-x-auto">
                                   <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-b border-slate-200">
                                             <tr>
                                                  <th className="px-6 py-4">Data Original</th>
                                                  <th className="px-6 py-4">Cliente / Projeto</th>
                                                  <th className="px-6 py-4">Ambiente Pendente</th>
                                                  <th className="px-6 py-4">Motivo (Observação)</th>
                                                  <th className="px-6 py-4 text-center">Contato</th>
                                             </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                             {filteredMeasurements.map((item, idx) => (
                                                  <tr key={`${item.request.id}-${item.environment.id}-${idx}`} className="hover:bg-amber-50/30 transition-colors">
                                                       <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center text-slate-700">
                                                                 <CalendarDays className="w-4 h-4 mr-2 text-amber-500" />
                                                                 {format(new Date(`${item.request.requestedDate}T00:00:00`), 'dd/MM/yyyy')}
                                                            </div>
                                                       </td>
                                                       <td className="px-6 py-4">
                                                            <div className="font-bold text-slate-900">{item.request.clientName}</div>
                                                            {item.request.projectName && <div className="text-slate-500 text-xs mt-0.5">{item.request.projectName}</div>}
                                                       </td>
                                                       <td className="px-6 py-4 font-medium text-amber-700">
                                                            {item.environment.name}
                                                       </td>
                                                       <td className="px-6 py-4 max-w-xs truncate" title={item.environment.observation}>
                                                            <span className="text-slate-500 italic bg-slate-50 px-2 py-1 rounded">
                                                                 "{item.environment.observation}"
                                                            </span>
                                                       </td>
                                                       <td className="px-6 py-4 text-center">
                                                            <a
                                                                 href={`https://wa.me/55${item.request.contactPhone?.replace(/\D/g, '')}`}
                                                                 target="_blank"
                                                                 rel="noopener noreferrer"
                                                                 className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 font-medium rounded-lg hover:bg-green-100 transition-colors"
                                                                 title="Abrir WhatsApp"
                                                            >
                                                                 <ExternalLink className="w-3 h-3 mr-1" /> WhatsApp
                                                            </a>
                                                       </td>
                                                  </tr>
                                             ))}
                                        </tbody>
                                   </table>
                              </div>

                              {/* Mobile View (Cards) */}
                              <div className="md:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
                                   {filteredMeasurements.map((item, idx) => (
                                        <div key={`mob-${item.request.id}-${item.environment.id}-${idx}`} className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-sm relative overflow-hidden">
                                             <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                             <div className="flex justify-between items-start mb-3">
                                                  <div>
                                                       <h3 className="font-bold text-slate-900 text-sm leading-tight pr-2">{item.request.clientName}</h3>
                                                       {item.request.projectName && <p className="text-slate-500 text-xs mt-0.5">{item.request.projectName}</p>}
                                                  </div>
                                                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md shrink-0 border border-amber-100">
                                                       {item.environment.name}
                                                  </span>
                                             </div>

                                             <div className="flex items-center text-xs text-slate-500 mb-3 font-medium">
                                                  <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                  {format(new Date(`${item.request.requestedDate}T00:00:00`), 'dd/MM/yyyy')}
                                             </div>

                                             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                                                  <p className="text-xs text-slate-600 italic line-clamp-2" title={item.environment.observation}>
                                                       "{item.environment.observation}"
                                                  </p>
                                             </div>

                                             <a
                                                  href={`https://wa.me/55${item.request.contactPhone?.replace(/\D/g, '')}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="w-full flex items-center justify-center px-4 py-2.5 bg-[#25D366] text-white font-medium rounded-xl hover:bg-[#128C7E] transition-colors shadow-sm text-sm"
                                             >
                                                  <ExternalLink className="w-4 h-4 mr-2" /> Contatar Reagendamento
                                             </a>
                                        </div>
                                   ))}
                              </div>
                         </>
                    )}
               </div>
          </div>
     );
}
=======
import { useState } from 'react';
import { MeasurementRequest } from '../../services/requestService';
import { format } from 'date-fns';
import { Clock, Search, ExternalLink, CalendarDays, RefreshCw } from 'lucide-react';

interface Props {
     requests: MeasurementRequest[];
}

export default function FutureMeasurementsTab({ requests }: Props) {
     const [searchTerm, setSearchTerm] = useState('');

     // Pega todas as requisições "completed" que tem ambientes "não medidos"
     const futureMeasurements = requests
          .filter(r => r.status === 'completed' && r.environments && r.environments.some(e => !e.isMeasured))
          .flatMap(r => {
               const unmeasured = r.environments!.filter(e => !e.isMeasured);
               return unmeasured.map(env => ({
                    request: r,
                    environment: env
               }));
          })
          .sort((a, b) => new Date(`${b.request.requestedDate}T${b.request.requestedTime}:00`).getTime() - new Date(`${a.request.requestedDate}T${a.request.requestedTime}:00`).getTime());

     const filteredMeasurements = futureMeasurements.filter(m =>
          m.request.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.request.projectName && m.request.projectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          m.environment.name.toLowerCase().includes(searchTerm.toLowerCase())
     );

     return (
          <div className="space-y-6">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                   <h2 className="text-xl font-bold text-slate-900 border-l-4 border-amber-500 pl-4">
                                        Medidas Futuras (Remarketing)
                                   </h2>
                                   <p className="text-slate-500 text-sm mt-2 ml-4">
                                        Histórico de ambientes não medidos durante as visitas, ideal para contato futuro e prospecção.
                                   </p>
                              </div>

                              <div className="relative">
                                   <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                   <input
                                        type="text"
                                        placeholder="Buscar cliente, projeto..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-amber-500 focus:border-amber-500 w-full sm:w-64"
                                   />
                              </div>
                         </div>
                    </div>

                    {filteredMeasurements.length === 0 ? (
                         <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                              <RefreshCw className="w-10 h-10 text-slate-300 mb-3" />
                              <p>Nenhuma medida futura encontrada em seu histórico de visitas concluídas.</p>
                         </div>
                    ) : (
                         <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm text-slate-600">
                                   <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs border-b border-slate-200">
                                        <tr>
                                             <th className="px-6 py-4">Data Original</th>
                                             <th className="px-6 py-4">Cliente / Projeto</th>
                                             <th className="px-6 py-4">Ambiente Pendente</th>
                                             <th className="px-6 py-4">Motivo (Observação)</th>
                                             <th className="px-6 py-4 text-center">Contato</th>
                                        </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredMeasurements.map((item, idx) => (
                                             <tr key={`${item.request.id}-${item.environment.id}-${idx}`} className="hover:bg-amber-50/30 transition-colors">
                                                  <td className="px-6 py-4 whitespace-nowrap">
                                                       <div className="flex items-center text-slate-700">
                                                            <CalendarDays className="w-4 h-4 mr-2 text-amber-500" />
                                                            {format(new Date(`${item.request.requestedDate}T00:00:00`), 'dd/MM/yyyy')}
                                                       </div>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                       <div className="font-bold text-slate-900">{item.request.clientName}</div>
                                                       {item.request.projectName && <div className="text-slate-500 text-xs mt-0.5">{item.request.projectName}</div>}
                                                  </td>
                                                  <td className="px-6 py-4 font-medium text-amber-700">
                                                       {item.environment.name}
                                                  </td>
                                                  <td className="px-6 py-4 max-w-xs truncate" title={item.environment.observation}>
                                                       <span className="text-slate-500 italic bg-slate-50 px-2 py-1 rounded">
                                                            "{item.environment.observation}"
                                                       </span>
                                                  </td>
                                                  <td className="px-6 py-4 text-center">
                                                       <a
                                                            href={`https://wa.me/55${item.request.contactPhone?.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center px-3 py-1.5 bg-green-50 text-green-700 font-medium rounded-lg hover:bg-green-100 transition-colors"
                                                            title="Abrir WhatsApp"
                                                       >
                                                            <ExternalLink className="w-3 h-3 mr-1" /> WhatsApp
                                                       </a>
                                                  </td>
                                             </tr>
                                        ))}
                                   </tbody>
                              </table>
                         </div>
                    )}
               </div>
          </div>
     );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
