export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  try {
    await navigator.serviceWorker.register('/service-worker.js');
  } catch {
    // ignore registration errors for now
  }
};
