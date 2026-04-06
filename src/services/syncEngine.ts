import { getSyncQueue, removeSyncOp, updateSyncOp, localPut } from './localDb';
import { apiUpsertDoc, apiDeleteDoc } from './apiService';

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 2000;

class SyncEngine {
  private isSyncing = false;
  private boundAttemptSync: () => void;

  constructor() {
    // Guardamos a referência ligada para poder remover o listener depois
    this.boundAttemptSync = this.attemptSync.bind(this);
    window.addEventListener('online', this.boundAttemptSync);
  }

  /**
   * Remove o listener de 'online'.
   * Chame este método se o SyncEngine for destruído (ex: testes ou hot-reload).
   */
  public destroy() {
    window.removeEventListener('online', this.boundAttemptSync);
  }

  public async attemptSync() {
    if (!navigator.onLine || this.isSyncing) return;

    this.isSyncing = true;
    try {
      const queue = await getSyncQueue();
      // Ordena por data de criação (ordem cronológica)
      queue.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      for (const op of queue) {
        try {
          if (op.action === 'CREATE' || op.action === 'UPDATE') {
            await apiUpsertDoc(op.collection, op.payload);

            // Marca como sincronizado localmente
            const payloadCopy = { ...op.payload, syncStatus: 'synced' };
            await localPut(op.collection, payloadCopy);

          } else if (op.action === 'DELETE') {
            await apiDeleteDoc(op.collection, op.docId);
          }

          await removeSyncOp(op.id);
        } catch (error) {
          console.error(`Sync Engine: failed to process op ${op.id}`, error);

          // Lógica de exponential backoff
          op.retryCount += 1;
          if (op.retryCount >= MAX_RETRIES) {
            console.error(`Sync Engine: Max retries reached for op ${op.id}. Marking as error.`);
            if (op.action !== 'DELETE') {
              const payloadCopy = { ...op.payload, syncStatus: 'error' };
              await localPut(op.collection, payloadCopy);
            }
          }
          await updateSyncOp(op);

          // Aguarda antes de continuar caso a rede esteja instável
          await new Promise(resolve =>
            setTimeout(resolve, BASE_BACKOFF_MS * Math.pow(2, op.retryCount))
          );

          if (!navigator.onLine) break; // Aborta se perdeu internet a meio
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
