import { getApiBaseUrl } from './api';

const API_BASE_URL = `${getApiBaseUrl()}/api`;

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'billing';
}

export interface UserListItem {
  id: string;
  email: string;
  username: string;
  created_at: string;
  elevenlabs_usage: number;
  gemini_usage: number;
  deepgram_usage: number;
}

export interface ServiceLimit {
  service_name: 'elevenlabs' | 'gemini' | 'deepgram';
  monthly_limit: number | null;
  daily_limit: number | null;
  is_enabled: boolean;
}

export interface ServiceUsage {
  service_name: string;
  total_usage: number;
}

export interface BillingRecord {
  id: string;
  user_id: string;
  billing_period_start: string;
  billing_period_end: string;
  elevenlabs_usage: number;
  gemini_usage: number;
  deepgram_usage: number;
  platform_fee: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes: string;
  created_at: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  monthlyRevenue: number;
  pendingBilling: number;
  serviceUsage: {
    service_name: string;
    user_count: number;
    total_usage: number;
  }[];
}

// Admin Authentication
export const adminLogin = async (email: string, password: string): Promise<Admin> => {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Login failed');
  }

  const data = await response.json();
  return data.admin;
};

// Get dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch(`${API_BASE_URL}/admin/stats`);

  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }

  const data = await response.json();
  return data.stats;
};

// Get all users with pagination
export const getUsers = async (page: number = 1, limit: number = 50, search: string = '') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search
  });

  const response = await fetch(`${API_BASE_URL}/admin/users?${params}`);

  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  const data = await response.json();
  return {
    users: data.users as UserListItem[],
    pagination: data.pagination
  };
};

// Get user details
export const getUserDetails = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`);

  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch user details');
  }

  const data = await response.json();
  return {
    user: data.user,
    limits: data.limits as ServiceLimit[],
    usage: data.usage as ServiceUsage[],
    billing: data.billing as BillingRecord[]
  };
};

// Set service limit
export const setServiceLimit = async (
  userId: string,
  serviceName: string,
  monthlyLimit: number | null,
  dailyLimit: number | null,
  isEnabled: boolean,
  adminId: string
) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/limits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceName,
      monthlyLimit,
      dailyLimit,
      isEnabled,
      adminId
    })
  });

  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    throw new Error('Failed to set service limit');
  }

  return response.json();
};

// Get service limits
export const getServiceLimits = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/limits`);

  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch service limits');
  }

  const data = await response.json();
  return data.limits;
};

// Create billing record
export const createBillingRecord = async (
  userId: string,
  periodStart: string,
  periodEnd: string,
  usageData: {
    elevenlabs?: number;
    gemini?: number;
    deepgram?: number;
  },
  platformFee: number,
  adminId: string
) => {
  const response = await fetch(`${API_BASE_URL}/admin/billing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      periodStart,
      periodEnd,
      usageData,
      platformFee,
      adminId
    })
  });

  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    throw new Error('Failed to create billing record');
  }

  return response.json();
};

// Update billing status
export const updateBillingStatus = async (
  billingId: string,
  status: string,
  notes: string,
  adminId: string
) => {
  const response = await fetch(`${API_BASE_URL}/admin/billing/${billingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      notes,
      adminId
    })
  });

  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    throw new Error('Failed to update billing status');
  }

  return response.json();
};

// Add credits to user wallet
export const addCredits = async (
  userId: string,
  amount: number,
  description: string,
  adminId: string
): Promise<{ success: boolean; newBalance: number }> => {
  const response = await fetch(`${API_BASE_URL}/admin/wallet/add-credits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      amount,
      description,
      adminId
    })
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to add credits');
  }

  return response.json();
};

// Get user wallet balance
export const getUserBalance = async (userId: string): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/wallet/balance/${userId}`);

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch user balance');
  }

  const data = await response.json();
  return data.balance;
};