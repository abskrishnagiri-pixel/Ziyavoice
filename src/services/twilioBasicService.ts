import { getApiBaseUrl } from '../utils/api';

export interface TwilioConfig {
  id: string;
  accountSid: string;
  appUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface TwilioPhoneNumber {
  id: string;
  userId: string;
  number: string;
  twilioNumberSid: string;
  provider: string;
  region: string;
  capabilities: any;
  voiceWebhookUrl: string;
  statusWebhookUrl: string;
  createdAt: string;
}

export interface TwilioCall {
  id: string;
  userId: string;
  callSid: string;
  fromNumber: string;
  toNumber: string;
  direction: 'inbound' | 'outbound';
  status: string;
  timestamp: string;
  duration: number;
  recordingUrl?: string;
}

export const twilioBasicService = {
  // Save/Update Twilio Configuration
  async saveConfig(
    userId: string,
    accountSid: string,
    authToken: string,
    appUrl: string,
    apiKeySid?: string,
    apiKeySecret?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/twilio/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          accountSid,
          authToken,
          appUrl,
          apiKeySid,
          apiKeySecret
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save Twilio configuration');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to save Twilio configuration');
      }
    } catch (error) {
      console.error('Error saving Twilio config:', error);
      throw new Error('Failed to save Twilio configuration: ' + (error as Error).message);
    }
  },

  // Get Twilio Configuration
  async getConfig(userId: string): Promise<TwilioConfig | null> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/twilio/config/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch Twilio configuration');
      }

      const result = await response.json();
      if (!result.success) {
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching Twilio config:', error);
      return null;
    }
  },

  // Connect/Import Twilio Number
  async connectNumber(userId: string, number: string): Promise<TwilioPhoneNumber> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/twilio/connect-number`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          number
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to connect number');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to connect number');
      }

      return result.data;
    } catch (error) {
      console.error('Error connecting number:', error);
      throw new Error('Failed to connect number: ' + (error as Error).message);
    }
  },

  // Get User's Phone Numbers
  async getPhoneNumbers(userId: string): Promise<TwilioPhoneNumber[]> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/twilio/phone-numbers/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch phone numbers');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      throw new Error('Failed to fetch phone numbers');
    }
  },

  // Make Outbound Call
  async makeCall(userId: string, from: string, to: string, agentId: string): Promise<TwilioCall> {
    // Validate required parameters
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate user ID format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      throw new Error('User ID must be a valid UUID');
    }

    if (!from) {
      throw new Error('From number is required');
    }

    if (!to) {
      throw new Error('To number is required');
    }

    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    // Validate phone number formats
    if (!/^\+?[1-9]\d{1,14}$/.test(from)) {
      throw new Error('From number must be a valid Twilio number in E.164 format (e.g., +1234567890)');
    }

    if (!/^\+?[1-9]\d{1,14}$/.test(to)) {
      throw new Error('To number must be in E.164 format (e.g., +1234567890)');
    }

    // Validate agent ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId)) {
      throw new Error('Agent ID must be a valid UUID');
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/twilio/make-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          from,
          to,
          agentId
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If we can't parse JSON, get text response
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
        }
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to make call');
      }

      return result.data;
    } catch (error) {
      console.error('Error making call:', error);
      // Provide more context about what went wrong
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
      }

      // Provide more specific error messages based on the error type
      let errorMessage = (error as Error).message;
      if (errorMessage.includes('Twilio configuration error')) {
        errorMessage = 'Twilio configuration error: ' + errorMessage;
      } else if (errorMessage.includes('Connection error')) {
        errorMessage = 'Connection error: ' + errorMessage;
      } else if (errorMessage.includes('Validation error')) {
        errorMessage = 'Validation error: ' + errorMessage;
      }

      throw new Error(errorMessage);
    }
  },

  // Get Call History
  async getCalls(userId: string, limit: number = 50): Promise<TwilioCall[]> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/twilio/calls/${userId}?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch calls: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch calls');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching calls:', error);
      throw new Error(`Failed to fetch calls: ${(error as Error).message}`);
    }
  }
};

