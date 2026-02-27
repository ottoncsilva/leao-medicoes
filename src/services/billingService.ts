import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface BillingStatus {
  id: string; // Formato: clientId_YYYY-MM
  clientId: string;
  month: string; // Formato: YYYY-MM
  status: 'open' | 'paid';
  paidAt?: string;
}

const COLLECTION_NAME = 'billing_status';

export const billingService = {
  async getAllBillingStatus(): Promise<BillingStatus[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      return snap.docs.map(d => d.data() as BillingStatus);
    } catch (error) {
      console.error("Erro ao buscar status de faturamento:", error);
      return [];
    }
  },

  async markAsPaid(clientId: string, month: string) {
    try {
      const docId = `${clientId}_${month}`;
      const docRef = doc(db, COLLECTION_NAME, docId);
      await setDoc(docRef, {
        id: docId,
        clientId,
        month,
        status: 'paid',
        paidAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      throw error;
    }
  }
};
