import { getSyncQueue, removeSyncOp, updateSyncOp, localPut, localGetAdmin, localGetAll } from './localDb';
import { apiUpsertDoc, apiDeleteDoc } from './apiService';

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2000;

class SyncEngine {
  private isSyncing = false;

  constructor() {
    window.addEventListener('online', this.attemptSync.bind(this));
  }

  public async attemptSync() {
    if (!navigator.onLine || this.isSyncing) return;
    
    this.isSyncing = true;
    try {
      const queue = await getSyncQueue();
      // Ordena por data de criação
      queue.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      for (const op of queue) {
        try {
          if (op.action === 'CREATE' || op.action === 'UPDATE') {
            await apiUpsertDoc(op.collection, op.payload);
            
            // Mark as synced locally
            const payloadCopy = { ...op.payload, syncStatus: 'synced' };
            await localPut(op.collection, payloadCopy);

          } else if (op.action === 'DELETE') {
            await apiDeleteDoc(op.collection, op.docId);
          }
          
          await removeSyncOp(op.id);
        } catch (error) {
          console.error(`Sync Engine: failed to process op ${op.id}`, error);
          
          // Exponential backoff logic
          op.retryCount += 1;
          if (op.retryCount >= MAX_RETRIES) {
            console.error(`Sync Engine: Max retries reached for op ${op.id}. Keeping it in queue but marking error.`);
            // Update local doc as error if applicable
            if (op.action !== 'DELETE') {
              const payloadCopy = { ...op.payload, syncStatus: 'error' };
              await localPut(op.collection, payloadCopy);
            }
          }
          await updateSyncOp(op);
          
          // Aguarda antes de tentar o próximo item caso a rede esteja instável
          await new Promise(resolve => setTimeout(resolve, BASE_BACKOFF_MS * Math.pow(2, op.retryCount)));
          
          if (!navigator.onLine) break; // Aborta fluxo se perdeu internet no meio
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  public async fullPullSync() {
    // Aqui podíamos puxar tudo da base, mas a estratégia "offline first" 
    // sugere puxarmos quando precisarmos ou num pull inicial.
    // Para simplificar a migração sem mexer muito na UI:
    // Nós faremos pull sob demanda no dataService.ts.
  }
}

export const syncEngine = new SyncEngine();
