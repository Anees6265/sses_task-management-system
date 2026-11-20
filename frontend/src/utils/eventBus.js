// Global Custom Event Bus for instant cross-component data synchronization
export const notifyDataRefresh = (type = 'all') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_data_refresh', { detail: { type } }));
  }
};
