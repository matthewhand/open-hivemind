/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiService } from './core';

export function authMixin(api: ApiService) {
  return {
    auth: {
      login(username: string, password: string): Promise<any> {
        return api.post('/api/auth/login', { username, password });
      },

      refresh(refreshToken: string): Promise<any> {
        return api.post('/api/auth/refresh', { refreshToken });
      },

      verify(token: string): Promise<any> {
        return api.post('/api/auth/verify', { token });
      },

      checkHealth(): Promise<any> {
        return api.get('/health');
      }
    }
  };
}
