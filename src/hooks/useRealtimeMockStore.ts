import { useState } from 'react';
import { usePersistentCollection } from './persistentCollections';

/**
 * List state for module screens. With a collection name the list is saved to
 * the SeedSphere database and shared by every page and user (see
 * persistentCollections.ts); without one it is local to the component, as
 * before (used only for throwaway lists such as a modal's working copy).
 */
export function useRealtimeMockStore<T extends { id: string }>(initialData: T[], collection?: string) {
  const [localItems, setLocalItems] = useState<T[]>(initialData);
  const [sharedItems, setSharedItems] = usePersistentCollection<T>(collection ?? '__local__.unused', collection ? initialData : EMPTY as T[]);
  const items = collection ? sharedItems : localItems;
  const setItems = collection ? setSharedItems : setLocalItems;

  const update = (id: string, patch: Partial<T>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const remove = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const add = (item: T) => setItems((prev) => [item, ...prev]);

  const bulkUpdate = (ids: string[], patch: Partial<T>) =>
    setItems((prev) => prev.map((item) => (ids.includes(item.id) ? { ...item, ...patch } : item)));

  return { items, update, remove, add, bulkUpdate, setItems, reset: () => setItems(initialData.slice()) };
}

const EMPTY: never[] = [];
