// src/hooks/useManagerOverride.ts
import { useState, useEffect, useCallback } from 'react';

const TOKEN_LIFESPAN_S = 60;

export const useManagerOverride = () => {
  const [token, setToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAwaitingOverride, setIsAwaitingOverride] = useState(false);
  
  let timer: NodeJS.Timeout;

  useEffect(() => {
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else {
      setToken(null);
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const generateToken = useCallback(() => {
    const newToken = Math.floor(1000 + Math.random() * 9000).toString();
    setToken(newToken);
    setTimeLeft(TOKEN_LIFESPAN_S);
    return newToken;
  }, []);

  const requestOverride = useCallback(() => {
    generateToken();
    setIsAwaitingOverride(true);
    return new Promise<boolean>((resolve) => {
        // This promise will be resolved by the dialog
        (window as any).resolveOverride = resolve;
    });
  }, [generateToken]);

  const validateToken = (inputToken: string): boolean => {
    if (inputToken === token && timeLeft > 0) {
      setToken(null);
      setTimeLeft(0);
      setIsAwaitingOverride(false);
      return true;
    }
    return false;
  };

  return {
    isAwaitingOverride,
    requestOverride,
    validateToken,
    timeLeft,
    token,
    cancelOverride: () => setIsAwaitingOverride(false),
  };
};
