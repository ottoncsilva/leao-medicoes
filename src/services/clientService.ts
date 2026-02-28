import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type ClientModel = 'por_ambiente' | 'pacote' | 'avulso';

export interface Client {
  id?: string;
  name: string;
  contact: string;
  phone?: string;
  cnpj?: string;
  address?: string;
  stateRegistration?: string;
  corporateName?: string;
  responsibleContact?: string;
  model: ClientModel;
  baseValue: number;
  kmValue: number;
  limitEnvs?: number; // Apenas para o modelo 'pacote'
  createdAt: Date;
}

const COLLECTION_NAME = 'clients';

export const clientService = {
  // Criar um novo cliente
  async createClient(clientData: Omit<Client, 'id' | 'createdAt'>) {
    try {
      // Remove undefined and empty string values to prevent Firebase errors
      const cleanData = Object.fromEntries(
        Object.entries(clientData).filter(([_, v]) => v !== undefined && v !== '')
      );
      
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...cleanData,
        createdAt: new Date()
      });
      return { id: docRef.id, ...cleanData };
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      throw error;
    }
  },

  // Buscar todos os clientes
  async getClients() {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      throw error;
    }
  },

  // Atualizar cliente existente
  async updateClient(id: string, clientData: Partial<Client>) {
    try {
      // Remove undefined and empty string values to prevent Firebase errors
      const cleanData = Object.fromEntries(
        Object.entries(clientData).filter(([_, v]) => v !== undefined && v !== '')
      );
      
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, cleanData);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      throw error;
    }
  }
};
