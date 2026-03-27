import { localGet, localGetAll, localPut, localDelete, enqueueSync, localGetAdmin, localPutAdmin, initDB } from './localDb';
import { apiFetchUserCollection, apiFetchAdmin } from './apiService';
import { syncEngine } from './syncEngine';

/**
 * Faz fetch do DB local primeiro (rápido).
 * Em background, tenta puxar atualizações da API e mesclar localmente.
 */
export const dataFetchCollection = async <T extends { id: string }>(collection: string): Promise<T[]> => {
  // 1. Tenta carregar do cache local imediatamente
  let localData = await localGetAll<T>(collection);

  // 2. Tenta fazer um "pull" da DB em background (só se online)
  if (navigator.onLine) {
    apiFetchUserCollection<T>(collection)
      .then(async (apiData) => {
        // Para cada item da API, atualiza o local (se o API for mais recente ou se não houver conflito complexo)
        // Por simplicidade, assumimos que a API é a fonte final para os itens "synced".
        // Itens que estão "pending" localmente não devem ser sobrescritos pelo fetch, 
        // mas a nossa syncQueue vai cuidar deles.
        const db = await initDB();
        const tx = db.transaction(collection as any, 'readwrite');
        for (const item of apiData) {
          const localItem = await tx.store.get(item.id as any) as any;
          if (!localItem || localItem.syncStatus !== 'pending') {
            await tx.store.put({ ...item, syncStatus: 'synced' } as any);
          }
        }
        await tx.done;
      })
      .catch(err => {
        console.warn('Background pull failed for', collection, err);
      });
  }

  // Volta os dados locais atualizados que já tínhamos (Offline-first)
  return localData;
};

export const dataFetchAdmin = async (): Promise<any> => {
  let admin = await localGetAdmin();

  if (navigator.onLine) {
    apiFetchAdmin().then(apiAdmin => {
      if (apiAdmin) {
        localPutAdmin({ ...apiAdmin, syncStatus: 'synced' }).catch(console.warn);
      }
    }).catch(console.warn);
  }

  return admin;
};

export const dataSaveDoc = async (collection: string, docId: string, data: any): Promise<void> => {
  const timestamp = new Date().toISOString();
  
  // Adiciona metadados
  const payload = {
    ...data,
    id: docId,
    syncStatus: 'pending',
    updatedAt: timestamp,
    createdAt: data.createdAt || timestamp
  };

  // 1. Salva localmente IMEDIATAMENTE (UI reativa)
  if (collection === 'admin') {
    await localPutAdmin(payload);
  } else {
    await localPut(collection, payload);
  }

  // 2. Adiciona à fila de sync
  await enqueueSync(collection, docId, 'UPDATE', payload);

  // 3. Tenta sincronizar em background
  syncEngine.attemptSync().catch(console.warn);
};

export const dataDeleteDoc = async (collection: string, docId: string): Promise<void> => {
  // 1. Deleta localmente IMEDIATAMENTE
  await localDelete(collection, docId);

  // 2. Adiciona à fila de sync (passando sem payload, apenas docId)
  await enqueueSync(collection, docId, 'DELETE');

  // 3. Tenta sincronizar
  syncEngine.attemptSync().catch(console.warn);
};
