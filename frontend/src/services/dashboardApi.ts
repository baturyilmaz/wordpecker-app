import type { DashboardData } from '../types';
import { api } from './api';

export const dashboardApi = { get: (): Promise<DashboardData> => api.get('/api/dashboard') };
