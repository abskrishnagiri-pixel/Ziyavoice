/**
 * ⭐ SINGLE SOURCE OF TRUTH FOR BACKEND URL ⭐
 * Change this URL to update the backend URL everywhere in the application
 */
export const getApiBaseUrl = () => {
  return "http://localhost:5000";
};

export const fetchCampaigns = async (userId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const createCampaign = async (userId: string, name: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, name })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const fetchCampaign = async (id: string, userId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}?userId=${userId}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const setCallerPhone = async (id: string, userId: string, callerPhone: string, agentId?: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/set-caller-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, callerPhone, agentId })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const importRecords = async (id: string, userId: string, csvData: any[]) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, csvData })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const addRecord = async (id: string, userId: string, phone: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, phone })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const deleteRecord = async (campaignId: string, recordId: string, userId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${campaignId}/records/${recordId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const startCampaign = async (id: string, userId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const stopCampaign = async (id: string, userId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const fetchRecords = async (id: string, page: number = 1, limit: number = 20) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/records?page=${page}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const deleteCampaign = async (id: string, userId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}?userId=${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};

export const updateConcurrentCalls = async (id: string, userId: string, concurrentCalls: number) => {
  const response = await fetch(`${getApiBaseUrl()}/api/campaigns/${id}/concurrent-calls`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, concurrentCalls })
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  // Validate content type before parsing JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Received non-JSON response from server');
  }
  return response.json();
};