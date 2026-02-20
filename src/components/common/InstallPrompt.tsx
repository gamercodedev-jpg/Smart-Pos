import React from "react";

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = React.useCallback(() => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(() => setIsVisible(false));
    }
  }, [deferredPrompt]);

  return { isVisible, promptInstall };
};

export const InstallPrompt: React.FC = () => null;
