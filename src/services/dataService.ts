import { localGet, localGetAll, localPut, localDelete, enqueueSync, localGetAdmin, localPutAdmin, initDB } from './localDb';
import { apiFetchUserCollection, apiFetchAdmin } from './apiService';
import { syncEngine } from './syncEngine';

/**
 * Faz fetch do DB local primeiro (rápido).
 * Em background, tenta puxar atualizações da API e mesclar localmente.
 */
export const dataFetchCollection = async <T extends { id: string }>(collection: string): Promise<T[]> => {
  // 1. Carrega do cache local imediatamente (Offline-first)
  const localData = await localGetAll<T>(collection);

  // 2. Tenta fazer um "pull" da DB em background (só se online)
  if (navigator.onLine) {
    apiFetchUserCollection<T>(collection)
      .then(async (apiData) => {
        // Para itens da API: actualiza apenas os que não têm escrita local pendente.
        // Itens 'pending' têm escrita mais recente localmente — não sobrescrever.
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

  return localData;
};

export const dataFetchAdmin = async (): Promise<any> => {
  const admin = await localGetAdmin();

  if (navigator.onLine) {
    apiFetchAdmin().then(apiAdmin => {
      if (apiAdmin) {
        localPutAdmin({ ...apiAdmin, syncStatus: 'synced' }).catch(console.warn);
      }
    }).catch(console.warn);
  }

  return admin;
};

/**
 * Cria um novo documento — enfileira como CREATE.
 */
export const dataCreateDoc = async (collection: string, docId: string, data: any): Promise<void> => {
  const timestamp = new Date().toISOString();
  const payload = {
    ...data,
    id: docId,
    syncStatus: 'pending',
    updatedAt: timestamp,
    createdAt: timestamp,
  };

  // 1. Salva localmente IMEDIATAMENTE (UI reactiva)
  if (collection === 'admin') {
    await localPutAdmin(payload);
  } else {
    await localPut(collection, payload);
  }

  // 2. Enfileira como CREATE para o cloud
  await enqueueSync(collection, docId, 'CREATE', payload);

  // 3. Tenta sincronizar em background
  syncEngine.attemptSync().catch(console.warn);
};

/**
 * Actualiza um documento existente — enfileira como UPDATE.
 */
export const dataUpdateDoc = async (collection: string, docId: string, data: any): Promise<void> => {
  const timestamp = new Date().toISOString();
  const payload = {
    ...data,
    id: docId,
    syncStatus: 'pending',
    updatedAt: timestamp,
    createdAt: data.createdAt || timestamp,
  };

  // 1. Salva localmente IMEDIATAMENTE
  if (collection === 'admin') {
    await localPutAdmin(payload);
  } else {
    await localPut(collection, payload);
  }

  // 2. Enfileira como UPDATE para o cloud
  await enqueueSync(collection, docId, 'UPDATE', payload);

  // 3. Tenta sincronizar em background
  syncEngine.attemptSync().catch(console.warn);
};

/**
 * @deprecated Usar dataCreateDoc ou dataUpdateDoc conforme o caso.
 * Mantido por retrocompatibilidade com lib/db.ts.
 */
export const dataSaveDoc = async (collection: string, docId: string, data: any): Promise<void> => {
  await dataUpdateDoc(collection, docId, data);
};

export const dataDeleteDoc = async (collection: string, docId: string): Promise<void> => {
  // 1. Deleta localmente IMEDIATAMENTE
  await localDelete(collection, docId);

  // 2. Enfileira como DELETE para o cloud
  await enqueueSync(collection, docId, 'DELETE');

  // 3. Tenta sincronizar
  syncEngine.attemptSync().catch(console.warn);
};
