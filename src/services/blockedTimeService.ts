import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface BlockedTime {
  id?: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
}

const COLLECTION_NAME = 'blocked_times';

export const blockedTimeService = {
  async getBlockedTimes(): Promise<BlockedTime[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlockedTime[];
    } catch (error) {
      console.error("Erro ao buscar horários bloqueados:", error);
      return [];
    }
  },

  async addBlockedTime(data: Omit<BlockedTime, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error("Erro ao bloquear horário:", error);
      throw error;
    }
  },

  async updateBlockedTime(id: string, data: Partial<Pick<BlockedTime, 'title' | 'start' | 'end'>>) {
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), data as any);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar bloqueio:", error);
      throw error;
    }
  },

  async removeBlockedTime(id: string) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      return true;
    } catch (error) {
      console.error("Erro ao remover bloqueio:", error);
      throw error;
    }
  }
};
