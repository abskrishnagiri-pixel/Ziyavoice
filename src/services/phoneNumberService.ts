import { PhoneNumber, PhoneProvider } from '../types';
import { getApiBaseUrl } from '../utils/api';

// API-based phone number service
const API_BASE_URL = getApiBaseUrl();

export const phoneNumberService = {
  // Get all phone numbers for the current user
  async getPhoneNumbers(userId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/phone-numbers?userId=${userId}`);
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

  // Get a specific phone number by ID
  async getPhoneNumberById(userId: string, id: string): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/phone-numbers/${id}?userId=${userId}`);
      const result = await response.json();

      if (!result.success) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(result.message || 'Failed to fetch phone number');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching phone number:', error);
      throw new Error('Failed to fetch phone number');
    }
  },

  // Create a new phone number
  async createPhoneNumber(userId: string, phoneNumber: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/phone-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, ...phoneNumber }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to create phone number');
      }

      return result.data;
    } catch (error) {
      console.error('Error creating phone number:', error);
      throw new Error('Failed to create phone number');
    }
  },

  // Update an existing phone number
  async updatePhoneNumber(userId: string, id: string, phoneNumber: Partial<any>): Promise<any> {
    try {
      console.log('Updating phone number with:', { userId, id, phoneNumber });
      // Send the update fields directly, not wrapped in phoneNumber object
      const response = await fetch(`${API_BASE_URL}/api/phone-numbers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, ...phoneNumber }),
      });

      const result = await response.json();
      console.log('Update phone number response:', result);

      if (!result.success) {
        throw new Error(result.message || 'Failed to update phone number');
      }

      return result.data;
    } catch (error) {
      console.error('Error updating phone number:', error);
      throw new Error('Failed to update phone number: ' + (error as Error).message);
    }
  },

  // Delete a phone number
  async deletePhoneNumber(userId: string, id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/phone-numbers/${id}?userId=${userId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to delete phone number');
      }
    } catch (error) {
      console.error('Error deleting phone number:', error);
      throw new Error('Failed to delete phone number');
    }
  },

  async importPhoneNumber(userId: string, phoneNumberData: {
    region: string;
    country: string;
    phoneNumber: string;
    twilioSid?: string;
  }): Promise<PhoneNumber> {
    try {
      // Make an API call to the backend to actually create the phone number in the database
      const response = await fetch(`${API_BASE_URL}/api/phone-numbers/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          phoneNumber: {
            region: phoneNumberData.region,
            country: phoneNumberData.country,
            phoneNumber: phoneNumberData.phoneNumber,
            twilioSid: phoneNumberData.twilioSid
          }
        }),
      });

      if (!response.ok) {
        let error;
        try {
          error = await response.json();
        } catch {
          error = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(error.message || 'Failed to import phone number');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to import phone number');
      }

      return result.data;
    } catch (error) {
      console.error('Error importing phone number:', error);
      throw new Error('Failed to import phone number: ' + (error as Error).message);
    }
  }
};