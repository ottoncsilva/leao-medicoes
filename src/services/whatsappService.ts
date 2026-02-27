import { GlobalSettings } from './settingsService';

export const whatsappService = {
  async sendMessage(phone: string, message: string, settings: GlobalSettings) {
    if (!settings.evolutionApiUrl || !settings.evolutionInstance || !settings.evolutionApiKey) {
      console.warn("Evolution API não configurada nas Configurações.");
      return false;
    }
    if (!phone) {
      console.warn("Telefone não fornecido para envio de WhatsApp.");
      return false;
    }

    try {
      // Remove tudo que não for número do telefone
      const formattedPhone = phone.replace(/\D/g, '');
      
      // Remove a barra final da URL se houver
      const baseUrl = settings.evolutionApiUrl.replace(/\/$/, '');
      const url = `${baseUrl}/message/sendText/${settings.evolutionInstance}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': settings.evolutionApiKey
        },
        body: JSON.stringify({
          number: formattedPhone,
          options: { delay: 1200, presence: 'composing' },
          textMessage: { text: message }
        })
      });
      
      if (!response.ok) {
        console.error("Erro da EvolutionAPI:", await response.text());
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao enviar WhatsApp:", error);
      return false;
    }
  }
};
