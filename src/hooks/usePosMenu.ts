import { useSyncExternalStore } from 'react';
import { getPosMenuState, subscribePosMenu } from '@/lib/posMenuStore';

export function usePosMenu() {
  return useSyncExternalStore(subscribePosMenu, getPosMenuState, getPosMenuState);
}
