import { db, auth } from './firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { get, set } from 'idb-keyval';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(errorText || `HTTP error! Status: ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const previewText = await response.text().catch(() => "");
    throw new Error(`Expected JSON response but received Content-Type: "${contentType}". Content preview: ${previewText.slice(0, 150)}`);
  }
  try {
    return await response.json();
  } catch (err: any) {
    throw new Error(`Failed to parse JSON response: ${err.message}`);
  }
};

export const fetchCollection = async (collName: string): Promise<any[]> => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  try {
    const q = query(collection(db, collName), where("ownerId", "==", auth.currentUser.uid));
    const querySnapshot = await getDocs(q);
    const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Cache to idb
    await set(`cache_${collName}_${auth.currentUser.uid}`, result).catch(console.error);
    return result;
  } catch (error) {
    const cached = await get(`cache_${collName}_${auth.currentUser.uid}`).catch(console.error);
    if (cached) {
      console.warn("Using offline fallback cache for", collName);
      return cached;
    }
    handleFirestoreError(error, OperationType.LIST, collName);
    return [];
  }
};

export const createItem = async (collName: string, item: any) => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const id = crypto.randomUUID();
  const newItem = { ownerId: auth.currentUser.uid, ...item };
  
  try {
    const cached = (await get(`cache_${collName}_${auth.currentUser.uid}`)) as any[] || [];
    cached.push({ id, ...newItem });
    await set(`cache_${collName}_${auth.currentUser.uid}`, cached).catch(console.error);
  } catch (e) { console.error('IDB set err', e); }

  try {
    window.dispatchEvent(new Event('cloud-sync-start'));
    await setDoc(doc(db, collName, id), newItem);
    window.dispatchEvent(new Event('cloud-sync-end'));
    return { id, ...newItem };
  } catch (error) {
    window.dispatchEvent(new Event('cloud-sync-end'));
    if (collName === 'notes') {
        const customEvent = new CustomEvent('toast-message', { detail: { message: "Saved to local IDB fallback", type: "info" }});
        window.dispatchEvent(customEvent);
        return { id, ...newItem };
    }
    handleFirestoreError(error, OperationType.CREATE, `${collName}/${id}`);
    throw error;
  }
};

export const updateItem = async (collName: string, id: string | number, item: any) => {
  if (!auth.currentUser) throw new Error("Not authenticated");
  
  try {
    const cached = (await get(`cache_${collName}_${auth.currentUser.uid}`)) as any[] || [];
    const index = cached.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
      cached[index] = { ...cached[index], ...item };
      await set(`cache_${collName}_${auth.currentUser.uid}`, cached).catch(console.error);
    }
  } catch (e) { console.error('IDB set err', e); }

  try {
    window.dispatchEvent(new Event('cloud-sync-start'));
    const updateData = { ...item };
    delete updateData.id;
    await updateDoc(doc(db, collName, String(id)), updateData);
    window.dispatchEvent(new Event('cloud-sync-end'));
    return { id: String(id), ...item };
  } catch (error) {
    window.dispatchEvent(new Event('cloud-sync-end'));
    if (collName === 'notes') {
        const customEvent = new CustomEvent('toast-message', { detail: { message: "Changes saved to local IDB fallback", type: "info" }});
        window.dispatchEvent(customEvent);
        return { id: String(id), ...item };
    }
    handleFirestoreError(error, OperationType.UPDATE, `${collName}/${id}`);
    throw error;
  }
};

export const deleteItem = async (collName: string, id: string | number) => {
  if (!auth.currentUser) throw new Error("Not authenticated");

  try {
    const cached = (await get(`cache_${collName}_${auth.currentUser.uid}`)) as any[] || [];
    const newCached = cached.filter(c => String(c.id) !== String(id));
    await set(`cache_${collName}_${auth.currentUser.uid}`, newCached).catch(console.error);
  } catch (e) { console.error('IDB set err', e); }

  try {
    window.dispatchEvent(new Event('cloud-sync-start'));
    await deleteDoc(doc(db, collName, String(id)));
    window.dispatchEvent(new Event('cloud-sync-end'));
  } catch (error) {
    window.dispatchEvent(new Event('cloud-sync-end'));
    if (collName === 'notes') {
        const customEvent = new CustomEvent('toast-message', { detail: { message: "Deleted locally in IDB fallback", type: "info" }});
        window.dispatchEvent(customEvent);
        return;
    }
    handleFirestoreError(error, OperationType.DELETE, `${collName}/${id}`);
    throw error;
  }
};
