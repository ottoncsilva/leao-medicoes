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
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center space-x-3 mb-2 text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
          <h3 className="text-lg font-bold text-stone-900">Finalizar Medição</h3>
        </div>
        <p className="text-sm text-stone-500 mb-6">Para gerar o faturamento correto, informe quantos quilômetros foram rodados nesta visita.</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-stone-700 mb-2">KM Rodados (Ida e Volta)</label>
            <input
              type="number"
              required
              min="0"
              value={kmInput}
              onChange={e => setKmInput(e.target.value)}
              className="w-full px-3 py-3 border border-stone-300 rounded-xl focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm"
              placeholder="Ex: 15"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium">
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
