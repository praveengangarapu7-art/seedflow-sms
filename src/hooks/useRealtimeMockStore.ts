import { useState } from 'react';

export function useRealtimeMockStore<T extends { id: string }>(initialData: T[]) {
  const [items, setItems] = useState<T[]>(initialData);

  const update = (id: string, patch: Partial<T>) =>
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));

  const remove = (id: string) =>
    setItems((prev) => prev.filter((item) => item.id !== id));

  const add = (item: T) =>
    setItems((prev) => [item, ...prev]);

  const bulkUpdate = (ids: string[], patch: Partial<T>) =>
    setItems((prev) => prev.map((item) => ids.includes(item.id) ? { ...item, ...patch } : item));

  return { items, update, remove, add, bulkUpdate, reset: () => setItems(initialData) };
}
