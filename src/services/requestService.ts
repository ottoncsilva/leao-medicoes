import { collection, addDoc, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type RequestStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'reschedule_requested';

export interface MeasurementRequest {
  id?: string;
  clientId: string; // ID da loja que solicitou
  clientName: string;
  projectName?: string;
  address: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  condominiumName?: string;
  contactName?: string;
  contactPhone?: string;
  environmentsCount: number;
  estimatedMinutes: number;
  requestedDate: string; // Formato YYYY-MM-DD
  requestedTime: string; // Formato HH:MM
  status: RequestStatus;
  createdAt: Date;
  kmDriven?: number; // Preenchido quando status = completed
  rescheduleReason?: string; // Preenchido quando status = reschedule_requested
}

const COLLECTION_NAME = 'measurement_requests';

export const requestService = {
  // Cliente solicita uma nova medição
  async createRequest(requestData: Omit<MeasurementRequest, 'id' | 'status' | 'createdAt'>) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...requestData,
        status: 'pending',
        createdAt: new Date()
      });
      return { id: docRef.id, ...requestData };
    } catch (error) {
      console.error("Erro ao criar solicitação:", error);
      throw error;
    }
  },

  // Gestor busca todas as solicitações (pode filtrar por status)
  async getRequests(status?: RequestStatus) {
    try {
      let q: any = collection(db, COLLECTION_NAME);
      
      if (status) {
        q = query(q, where("status", "==", status));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as MeasurementRequest;
      });
    } catch (error) {
      console.error("Erro ao buscar solicitações:", error);
      throw error;
    }
  },

  // Gestor atualiza o status da solicitação (Aprovar/Recusar)
  async updateRequestStatus(requestId: string, newStatus: RequestStatus, additionalData?: Partial<MeasurementRequest>) {
    try {
      const requestRef = doc(db, COLLECTION_NAME, requestId);
      await updateDoc(requestRef, {
        status: newStatus,
        updatedAt: new Date(),
        ...additionalData
      });
      return true;
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      throw error;
    }
  }
};
