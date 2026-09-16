export type InstallPlatform = 'iphone' | 'android' | 'desktop' | 'unknown';

export type InstallCapability = {
  platform: InstallPlatform;
  standalone: boolean;
  serviceWorkerSupported: boolean;
};

export function detectInstallCapability(): InstallCapability {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { platform: 'unknown', standalone: false, serviceWorkerSupported: false };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;

  let platform: InstallPlatform = 'desktop';
  if (/iphone|ipad|ipod/.test(userAgent)) platform = 'iphone';
  else if (/android/.test(userAgent)) platform = 'android';

  return {
    platform,
    standalone,
    serviceWorkerSupported: 'serviceWorker' in navigator,
  };
}
