import { useCallback, useEffect, useRef } from 'react';
import { readCollection, setCollection, usePersistentCollection } from './persistentCollections';

type Snapshot = { id: string; values: (string | boolean)[] };
const STARTER: Snapshot[] = [];

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function controls(root: HTMLElement): Control[] {
  return Array.from(root.querySelectorAll<Control>('input, select, textarea')).filter(
    (el) => !(el instanceof HTMLInputElement && ['button', 'submit', 'file', 'hidden', 'search'].includes(el.type)),
  );
}

/**
 * Makes an uncontrolled settings form (inputs with defaultValue /
 * defaultChecked) save to the database without rewriting its markup:
 *
 *   const form = useFormSnapshot('procurement.settings', activeTab);
 *   <div ref={form.ref}> ...inputs... </div>
 *   <Button onClick={form.save}>Save</Button>
 *
 * Values are stored per section (e.g. per settings tab) in DOM order and
 * restored into the inputs whenever the section is shown again.
 */
export function useFormSnapshot(collection: string, section: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [snapshots] = usePersistentCollection<Snapshot>(collection, STARTER);
  const saved = snapshots.find((s) => s.id === section);

  useEffect(() => {
    const root = ref.current;
    if (!root || !saved) return;
    const els = controls(root);
    if (els.length !== saved.values.length) return; // form changed shape: keep defaults
    els.forEach((el, i) => {
      const v = saved.values[i];
      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) el.checked = Boolean(v);
      else el.value = String(v ?? '');
    });
  }, [saved, section]);

  const save = useCallback(() => {
    const root = ref.current;
    if (!root) return false;
    const values = controls(root).map((el) =>
      el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value,
    );
    const current = readCollection<Snapshot>(collection, STARTER);
    const next = current.some((s) => s.id === section)
      ? current.map((s) => (s.id === section ? { id: section, values } : s))
      : [...current, { id: section, values }];
    setCollection<Snapshot>(collection, STARTER, next);
    return true;
  }, [collection, section]);

  return { ref, save, hasSaved: Boolean(saved) };
}
