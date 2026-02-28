<<<<<<< HEAD
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { requestService, MeasurementRequest } from '../../services/requestService';
import { whatsappService } from '../../services/whatsappService';
import { GlobalSettings } from '../../services/settingsService';
import { Client } from '../../services/clientService';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
  request: MeasurementRequest;
  settings: GlobalSettings;
  clients: Client[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function CompleteRequestModal({ request, settings, clients, onClose, onSuccess }: Props) {
  const [kmInput, setKmInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await requestService.updateRequestStatus(request.id!, 'completed', { kmDriven: Number(kmInput) || 0 });

      const client = clients.find(c => c.id === request.clientId);
      if (client?.phone && settings.notifyClientCompleted) {
        whatsappService.sendMessage(
          client.phone,
          `✅ Olá ${client.name}!\n\nA medição solicitada para ${format(new Date(request.requestedDate + 'T12:00:00'), 'dd/MM')} às ${request.requestedTime} foi marcada como *CONCLUÍDA* pela equipe técnica da Leão Medições.\n\nAgradecemos a parceria!`,
          settings
        );
      }

      toast.success('Medição finalizada com sucesso!');
      onClose();
      onSuccess();
    } catch (error) {
      toast.error('Erro ao finalizar medição. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center space-x-3 mb-2 text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
          <h3 className="text-lg font-bold text-slate-900">Finalizar Medição</h3>
        </div>
        <p className="text-sm text-slate-500 mb-6">Para gerar o faturamento correto, informe quantos quilômetros foram rodados nesta visita.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">KM Rodados (Ida e Volta)</label>
            <input
              type="number"
              required
              min="0"
              value={kmInput}
              onChange={e => setKmInput(e.target.value)}
              className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm"
              placeholder="Ex: 15"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50">
              {isLoading ? 'Salvando...' : 'Confirmar e Finalizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
=======
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { requestService } from '../../services/requestService';
import { toast } from 'sonner';

interface Props {
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CompleteRequestModal({ requestId, onClose, onSuccess }: Props) {
  const [kmInput, setKmInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await requestService.updateRequestStatus(requestId, 'completed', { kmDriven: Number(kmInput) || 0 });
      toast.success('Medição finalizada com sucesso!');
      onClose();
      onSuccess();
    } catch (error) {
      toast.error('Erro ao finalizar medição. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center space-x-3 mb-2 text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
          <h3 className="text-lg font-bold text-slate-900">Finalizar Medição</h3>
        </div>
        <p className="text-sm text-slate-500 mb-6">Para gerar o faturamento correto, informe quantos quilômetros foram rodados nesta visita.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">KM Rodados (Ida e Volta)</label>
            <input
              type="number"
              required
              min="0"
              value={kmInput}
              onChange={e => setKmInput(e.target.value)}
              className="w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm"
              placeholder="Ex: 15"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50">
              {isLoading ? 'Salvando...' : 'Confirmar e Finalizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
