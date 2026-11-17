import type { SessionItem } from '../session';

/** Screen switching; filled in by main.ts to avoid import cycles. */
export const nav = {
  home: () => {},
  study: (_items: SessionItem[]) => {},
  stats: () => {},
  settings: () => {},
};
