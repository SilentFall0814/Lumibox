import type { LumiboxAPI } from '../../../shared/types';

declare global {
  interface Window {
    lumibox: LumiboxAPI;
  }
}

export {};
