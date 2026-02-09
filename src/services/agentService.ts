import { VoiceAgent } from '../types';
import { getApiBaseUrl } from '../utils/api';

// API-based agent service
const API_BASE_URL = getApiBaseUrl();

export const agentService = {
  // Get all agents for the current user
  async getAgents(userId: string): Promise<any[]> {
    try {
      console.log('Fetching agents for user:', userId);
      const response = await fetch(`${API_BASE_URL}/api/agents?userId=${userId}`);
      console.log('Agents response status:', response.status);

      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.log('Non-JSON response:', text);
        throw new Error(`Expected JSON response but got ${contentType}: ${text}`);
      }

      const result = await response.json();
      console.log('Agents response data:', result);

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch agents');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw new Error('Failed to fetch agents: ' + (error as Error).message);
    }
  },

  // Get a specific agent by ID
  async getAgentById(userId: string, id: string): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/${id}?userId=${userId}`);

      // Check if the response is OK
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response but got ${contentType}: ${text}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch agent');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching agent:', error);
      throw new Error('Failed to fetch agent: ' + (error as Error).message);
    }
  },

  // Create a new agent
  async createAgent(userId: string, agent: any): Promise<any> {
    try {
      console.log('Creating agent with userId:', userId, 'agentData:', agent);

      // Validate required fields
      if (!userId) {
        throw new Error('User ID is required');
      }

      const requestBody = { userId, agent };
      console.log('Sending request body:', JSON.stringify(requestBody));

      const response = await fetch(`${API_BASE_URL}/api/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Create agent response status:', response.status);

      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create agent error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Expected JSON response but got ${contentType}: ${text}`);
      }

      const result = await response.json();
      console.log('Create agent result:', result);

      if (!result.success) {
        throw new Error(result.message || 'Failed to create agent');
      }

      return result.data;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw new Error('Failed to create agent: ' + (error as Error).message);
    }
  },

  // Update an existing agent
  async updateAgent(userId: string, id: string, agent: Partial<any>): Promise<any> {
    try {
      console.log('Updating agent with userId:', userId, 'agentId:', id, 'agentData:', agent);

      // Validate required fields
      if (!userId) {
        throw new Error('User ID is required');
      }
      if (!id) {
        throw new Error('Agent ID is required');
      }

      const requestBody = { userId, ...agent };
      console.log('Sending request body:', JSON.stringify(requestBody));

      const response = await fetch(`${API_BASE_URL}/api/agents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Update agent response status:', response.status);

      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update agent error response:', errorText);
        console.error('Response status:', response.status);
        console.error('Response headers:', [...response.headers.entries()]);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Expected JSON response but got ${contentType}: ${text}`);
      }

      const result = await response.json();
      console.log('Update agent result:', result);

      if (!result.success) {
        console.error('Server returned success=false with message:', result.message);
        throw new Error(result.message || 'Failed to update agent');
      }

      // Return the updated agent data
      return result.data;
    } catch (error) {
      console.error('Error updating agent:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error));
      throw new Error('Failed to update agent: ' + (error as Error).message);
    }
  },

  // Delete an agent
  async deleteAgent(userId: string, id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/${id}?userId=${userId}`, {
        method: 'DELETE',
      });

      // Check if the response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response but got ${contentType}: ${text}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to delete agent');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      throw new Error('Failed to delete agent: ' + (error as Error).message);
    }
  }
};