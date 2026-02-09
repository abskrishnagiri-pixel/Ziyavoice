import { getAuthToken } from '../utils/auth';
import { getApiBaseUrl } from '../utils/api';

const API_BASE_URL = `${getApiBaseUrl()}/api`;

interface Document {
  id: string;
  name: string;
  uploadedAt: string;
  agentId?: string;
}

interface DocumentContent {
  content: string;
}

export class DocumentService {
  private async getHeaders() {
    const token = getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Upload a document
   * @param userId The ID of the user
   * @param file The file to upload
   * @param agentId Optional agent ID to associate with the document
   * @returns The uploaded document
   */
  async uploadDocument(userId: string, file: File, agentId?: string): Promise<Document> {
    try {
      // Validate inputs
      if (!userId || userId.trim() === '') {
        throw new Error('User ID is required');
      }

      if (!file) {
        throw new Error('File is required');
      }

      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        throw new Error(`File size exceeds limit of 10MB. Current file size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      }

      console.log('Uploading document with userId:', userId, 'fileName:', file.name, 'fileSize:', file.size, 'agentId:', agentId);

      // Read file content as text
      const content = await file.text();

      // Check content length (limit to 5MB of text)
      const maxContentLength = 5 * 1024 * 1024; // 5MB in characters
      if (content.length > maxContentLength) {
        throw new Error(`File content exceeds limit of 5MB. Current content length: ${(content.length / (1024 * 1024)).toFixed(2)}MB`);
      }

      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({
          userId,
          agentId,
          name: file.name,
          content
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.log('Response status:', response.status, 'Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        let errorMessage = `Failed to upload document: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the generic message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Upload successful:', data);

      return {
        id: data.data.id,
        name: data.data.name,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      // Provide a more user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error: Could not connect to the server. Please check your connection and try again.');
        } else if (error.message.includes('PayloadTooLargeError')) {
          throw new Error('File too large: The document is too large to upload. Please try a smaller file.');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred while uploading the document.');
    }
  }

  /**
   * Get documents for a user
   * @param userId The ID of the user
   * @param agentId Optional agent ID to filter documents
   * @returns List of documents
   */
  async getDocuments(userId: string, agentId?: string): Promise<Document[]> {
    try {
      // Validate inputs
      if (!userId || userId.trim() === '') {
        throw new Error('User ID is required');
      }

      const url = new URL(`${API_BASE_URL}/documents/${userId}`);
      if (agentId) {
        url.searchParams.append('agentId', agentId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: await this.getHeaders()
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        let errorMessage = `Failed to fetch documents: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the generic message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.data.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        uploadedAt: doc.uploaded_at,
        agentId: doc.agent_id
      }));
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Provide a more user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error: Could not connect to the server. Please check your connection and try again.');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching documents.');
    }
  }

  /**
   * Get document content by ID
   * @param documentId The ID of the document
   * @returns The document content
   */
  async getDocumentContent(documentId: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/content/${documentId}`, {
        method: 'GET',
        headers: await this.getHeaders()
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        let errorMessage = `Failed to fetch document content: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the generic message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.data.content;
    } catch (error) {
      console.error('Error fetching document content:', error);
      // Provide a more user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error: Could not connect to the server. Please check your connection and try again.');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching document content.');
    }
  }

  /**
   * Delete a document
   * @param documentId The ID of the document to delete
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: 'DELETE',
        headers: await this.getHeaders()
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        let errorMessage = `Failed to delete document: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the generic message
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      // Provide a more user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error: Could not connect to the server. Please check your connection and try again.');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred while deleting the document.');
    }
  }
}