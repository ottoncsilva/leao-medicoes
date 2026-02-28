<<<<<<< HEAD
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Holiday {
  id: string;
  date: string; // MM-DD para fixo, YYYY-MM-DD para específico
  name: string;
  type: 'fixed' | 'specific';
}

export interface GlobalSettings {
  defaultKmPrice: number;
  minutesPerEnvironment?: number; // minutos por ambiente para calcular tempo estimado
  evolutionApiUrl?: string;
  evolutionInstance?: string;
  evolutionApiKey?: string;
  managerPhone?: string;
  notifyManagerNewRequest?: boolean;
  notifyClientApproved?: boolean;
  notifyClientRejected?: boolean;
  notifyClientReschedule?: boolean;
  notifyClientDayBefore?: boolean;
  notifyClientCompleted?: boolean;
  customHolidays?: Holiday[];
  workOnSaturdays?: boolean;
  workOnSundays?: boolean;
  workStartTime?: string;
  workEndTime?: string;
  companyName?: string;
  companyCnpj?: string;
  companyAddress?: string;
  companyPhone?: string;
}

export const FIXED_HOLIDAYS = [
  { date: '01-01', name: 'Confraternização Universal' },
  { date: '04-21', name: 'Tiradentes' },
  { date: '05-01', name: 'Dia do Trabalho' },
  { date: '09-07', name: 'Independência do Brasil' },
  { date: '10-12', name: 'Nossa Senhora Aparecida' },
  { date: '11-02', name: 'Finados' },
  { date: '11-15', name: 'Proclamação da República' },
  { date: '12-25', name: 'Natal' },
];

const DOC_ID = 'global';
const COLLECTION_NAME = 'settings';

export const settingsService = {
  async getSettings(): Promise<GlobalSettings> {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as GlobalSettings;
        return {
          ...data,
          customHolidays: data.customHolidays || [],
          workOnSaturdays: data.workOnSaturdays ?? false,
          workOnSundays: data.workOnSundays ?? false,
          workStartTime: data.workStartTime || '08:00',
          workEndTime: data.workEndTime || '18:00',
          companyName: data.companyName || '',
          companyCnpj: data.companyCnpj || '',
          companyAddress: data.companyAddress || '',
          companyPhone: data.companyPhone || ''
        };
      }
      return {
        defaultKmPrice: 2.5,
        minutesPerEnvironment: 30,
        notifyManagerNewRequest: true,
        notifyClientApproved: true,
        notifyClientRejected: true,
        notifyClientReschedule: true,
        customHolidays: [],
        workOnSaturdays: false,
        workOnSundays: false,
        workStartTime: '08:00',
        workEndTime: '18:00',
        companyName: '',
        companyCnpj: '',
        companyAddress: '',
        companyPhone: ''
      }; // Valor padrão caso não exista
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      return {
        defaultKmPrice: 2.5,
        customHolidays: [],
        workOnSaturdays: false,
        workOnSundays: false,
        workStartTime: '08:00',
        workEndTime: '18:00',
        companyName: '',
        companyCnpj: '',
        companyAddress: '',
        companyPhone: ''
      };
    }
  },

  async saveSettings(settings: GlobalSettings) {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_ID);
      await setDoc(docRef, settings, { merge: true });
      return true;
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      throw error;
    }
  }
};
=======
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Holiday {
  id: string;
  date: string; // MM-DD para fixo, YYYY-MM-DD para específico
  name: string;
  type: 'fixed' | 'specific';
}

export interface GlobalSettings {
  defaultKmPrice: number;
  minutesPerEnvironment?: number; // minutos por ambiente para calcular tempo estimado
  evolutionApiUrl?: string;
  evolutionInstance?: string;
  evolutionApiKey?: string;
  managerPhone?: string;
  notifyManagerNewRequest?: boolean;
  notifyClientApproved?: boolean;
  notifyClientRejected?: boolean;
  notifyClientReschedule?: boolean;
  customHolidays?: Holiday[];
  workOnSaturdays?: boolean;
  workOnSundays?: boolean;
  workStartTime?: string;
  workEndTime?: string;
  companyName?: string;
  companyCnpj?: string;
  companyAddress?: string;
  companyPhone?: string;
}

export const FIXED_HOLIDAYS = [
  { date: '01-01', name: 'Confraternização Universal' },
  { date: '04-21', name: 'Tiradentes' },
  { date: '05-01', name: 'Dia do Trabalho' },
  { date: '09-07', name: 'Independência do Brasil' },
  { date: '10-12', name: 'Nossa Senhora Aparecida' },
  { date: '11-02', name: 'Finados' },
  { date: '11-15', name: 'Proclamação da República' },
  { date: '12-25', name: 'Natal' },
];

const DOC_ID = 'global';
const COLLECTION_NAME = 'settings';

export const settingsService = {
  async getSettings(): Promise<GlobalSettings> {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as GlobalSettings;
        return {
          ...data,
          customHolidays: data.customHolidays || [],
          workOnSaturdays: data.workOnSaturdays ?? false,
          workOnSundays: data.workOnSundays ?? false,
          workStartTime: data.workStartTime || '08:00',
          workEndTime: data.workEndTime || '18:00',
          companyName: data.companyName || '',
          companyCnpj: data.companyCnpj || '',
          companyAddress: data.companyAddress || '',
          companyPhone: data.companyPhone || ''
        };
      }
      return {
        defaultKmPrice: 2.5,
        minutesPerEnvironment: 30,
        notifyManagerNewRequest: true,
        notifyClientApproved: true,
        notifyClientRejected: true,
        notifyClientReschedule: true,
        customHolidays: [],
        workOnSaturdays: false,
        workOnSundays: false,
        workStartTime: '08:00',
        workEndTime: '18:00',
        companyName: '',
        companyCnpj: '',
        companyAddress: '',
        companyPhone: ''
      }; // Valor padrão caso não exista
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      return {
        defaultKmPrice: 2.5,
        customHolidays: [],
        workOnSaturdays: false,
        workOnSundays: false,
        workStartTime: '08:00',
        workEndTime: '18:00',
        companyName: '',
        companyCnpj: '',
        companyAddress: '',
        companyPhone: ''
      };
    }
  },

  async saveSettings(settings: GlobalSettings) {
    try {
      const docRef = doc(db, COLLECTION_NAME, DOC_ID);
      await setDoc(docRef, settings, { merge: true });
      return true;
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      throw error;
    }
  }
};
>>>>>>> 0e85a4bbb0746910d0bf74ab9d34173325ff70eb
