export async function registerSreadyaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  const basePath = process.env.NEXT_PUBLIC_SREADYA_BASE_PATH ?? '';
  const scriptUrl = `${basePath}/sw.js`;
  const scope = `${basePath || ''}/`;

  return navigator.serviceWorker.register(scriptUrl, { scope });
}
