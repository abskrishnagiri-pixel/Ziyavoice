import { create } from 'zustand';
import { Campaign, CampaignRecord } from '../types';
import { getApiBaseUrl } from '../utils/api';

interface CampaignState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  campaignRecords: CampaignRecord[];
  loading: boolean;
  error: string | null;
  fetchCampaigns: (userId: string) => Promise<void>;
  fetchCampaign: (id: string, userId: string) => Promise<void>;
  createCampaign: (userId: string, name: string) => Promise<Campaign | null>;
  setCallerPhone: (id: string, userId: string, callerPhone: string) => Promise<Campaign | null>;
  importRecords: (id: string, userId: string, csvData: { phone: string }[]) => Promise<number | null>;
  addRecord: (id: string, userId: string, phone: string) => Promise<CampaignRecord | null>;
  startCampaign: (id: string, userId: string) => Promise<Campaign | null>;
  stopCampaign: (id: string, userId: string) => Promise<Campaign | null>;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  currentCampaign: null,
  campaignRecords: [],
  loading: false,
  error: null,

  fetchCampaigns: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns?userId=${userId}`);
      const result = await response.json();

      if (result.success) {
        set({ campaigns: result.data, loading: false });
      } else {
        throw new Error(result.message || 'Failed to fetch campaigns');
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCampaign: async (id: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}?userId=${userId}`);
      const result = await response.json();

      if (result.success) {
        set({
          currentCampaign: result.data.campaign,
          campaignRecords: result.data.records,
          loading: false
        });
      } else {
        throw new Error(result.message || 'Failed to fetch campaign');
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createCampaign: async (userId: string, name: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name })
      });

      const result = await response.json();

      if (result.success) {
        const newCampaign = result.data;
        set(state => ({
          campaigns: [...state.campaigns, newCampaign],
          loading: false
        }));
        return newCampaign;
      } else {
        throw new Error(result.message || 'Failed to create campaign');
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  setCallerPhone: async (id: string, userId: string, callerPhone: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/set-caller-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, callerPhone })
      });

      const result = await response.json();

      if (result.success) {
        const updatedCampaign = result.data;
        set(state => ({
          currentCampaign: updatedCampaign,
          campaigns: state.campaigns.map(campaign =>
            campaign.id === id ? updatedCampaign : campaign
          ),
          loading: false
        }));
        return updatedCampaign;
      } else {
        throw new Error(result.message || 'Failed to set caller phone');
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  importRecords: async (id: string, userId: string, csvData: { phone: string }[]) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, csvData })
      });

      const result = await response.json();

      if (result.success) {
        set({ loading: false });
        return csvData.length; // Return number of records imported
      } else {
        throw new Error(result.message || 'Failed to import records');
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  addRecord: async (id: string, userId: string, phone: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phone })
      });

      const result = await response.json();

      if (result.success) {
        const newRecord = result.data;
        set(state => ({
          campaignRecords: [newRecord, ...state.campaignRecords],
          loading: false
        }));
        return newRecord;
      } else {
        throw new Error(result.message || 'Failed to add record');
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  startCampaign: async (id: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (result.success) {
        const updatedCampaign = result.data;
        set(state => ({
          currentCampaign: updatedCampaign,
          campaigns: state.campaigns.map(campaign =>
            campaign.id === id ? updatedCampaign : campaign
          ),
          loading: false
        }));
        return updatedCampaign;
      } else {
        throw new Error(result.message || 'Failed to start campaign');
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  stopCampaign: async (id: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (result.success) {
        const updatedCampaign = result.data;
        set(state => ({
          currentCampaign: updatedCampaign,
          campaigns: state.campaigns.map(campaign =>
            campaign.id === id ? updatedCampaign : campaign
          ),
          loading: false
        }));
        return updatedCampaign;
      } else {
        throw new Error(result.message || 'Failed to stop campaign');
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  }
}));