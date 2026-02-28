import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type RequestStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'reschedule_requested';

export interface Environment {
  id: string;
  name: string;
  isMeasured: boolean;
  observation?: string;
}

export interface MeasurementRequest {
  id?: string;
  clientId: string; // ID da loja que solicitou
  clientName: string;
  projectName?: string;
  projectLink?: string; // Link direto do projeto na nuvem (OneDrive, etc)
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
  environmentsCount: number; // Mantedo para retrocompatibilidade
  environments?: Environment[]; // Lista de ambientes qualitativa
  estimatedMinutes: number;
  requestedDate: string; // Formato YYYY-MM-DD
  requestedTime: string; // Formato HH:MM
  status: RequestStatus;
  createdAt: Date;
  kmDriven?: number; // Preenchido quando status = completed
  tollFee?: number; // Preenchido com custos de pedágio quando status = completed
  rescheduleReason?: string; // Preenchido quando status = reschedule_requested
  clientNotifiedDayBefore?: boolean; // Preenchido quando o admin acessa no dia anterior
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

  // Gestor busca todas as solicitações (pode filtrar por status e cliente)
  async getRequests(status?: RequestStatus, clientId?: string) {
    try {
      let q: any = collection(db, COLLECTION_NAME);

      if (status) q = query(q, where("status", "==", status));
      if (clientId) q = query(q, where("clientId", "==", clientId));

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

  // Inscrição em tempo real com limite de 1000 registros para economizar banda (cobre anos de medições de uma PME)
  subscribeToRequests(callback: (requests: MeasurementRequest[], changes: any[]) => void, options?: { status?: RequestStatus, clientId?: string }) {
    let q: any = collection(db, COLLECTION_NAME);

    if (options?.clientId) {
      q = query(q, where("clientId", "==", options.clientId), orderBy("createdAt", "desc"), limit(1000));
    } else if (options?.status) {
      q = query(q, where("status", "==", options.status), orderBy("createdAt", "desc"), limit(1000));
    } else {
      q = query(q, orderBy("createdAt", "desc"), limit(1000));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as MeasurementRequest;
      });
      callback(requests, snapshot.docChanges());
    }, (error) => {
      console.error("Erro no onSnapshot de solicitações:", error);
    });

    return unsubscribe;
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
  },

  // Excluir solicitação permanentemente (Limpar do sistema/faturamento)
  async deleteRequest(requestId: string) {
    try {
      const requestRef = doc(db, COLLECTION_NAME, requestId);
      await deleteDoc(requestRef);
      return true;
    } catch (error) {
      console.error("Erro ao excluir solicitação:", error);
      throw error;
    }
  }
};
