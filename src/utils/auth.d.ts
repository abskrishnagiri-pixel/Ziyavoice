// Type declarations for auth utilities
export const getAuthToken: () => string | null;
export const setAuthToken: (token: string) => void;
export const clearAuthToken: () => void;