/** Opens the global SeedSphere assistant drawer, optionally asking a question. */
export function openAssistant(question?: string): void {
  window.dispatchEvent(new CustomEvent('seedsphere:open-assistant', { detail: { question } }));
}
