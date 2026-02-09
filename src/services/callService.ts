export interface Call {
    id: string;
    callSid: string;
    fromNumber: string;
    toNumber: string;
    direction: string;
    status: string;
    callType: 'twilio_inbound' | 'twilio_outbound' | 'web_call';
    timestamp: string;
    startedAt?: string;
    endedAt?: string;
    duration: number;
    recordingUrl?: string;
    agentId?: string;
    agentName: string;
}

export interface CallFilters {
    agentId?: string;
    callType?: string;
    startDate?: string;
    endDate?: string;
}

export interface CallHistoryResponse {
    success: boolean;
    calls: Call[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

import { getApiBaseUrl } from '../utils/api';

const API_BASE_URL = getApiBaseUrl();

export class CallService {
    /**
     * Fetch call history for a user
     */
    async fetchCallHistory(
        userId: string,
        filters: CallFilters = {},
        limit: number = 50,
        offset: number = 0
    ): Promise<CallHistoryResponse> {
        try {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
                ...filters
            });

            const response = await fetch(
                `${API_BASE_URL}/api/calls/${userId}?${params}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch call history: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching call history:', error);
            throw error;
        }
    }

    /**
     * Format duration from seconds to human-readable string
     */
    formatDuration(seconds: number): string {
        if (!seconds || seconds === 0) return '0s';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

        return parts.join(' ');
    }

    /**
     * Format timestamp to readable date/time
     */
    formatTimestamp(timestamp: string): string {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Get call type label
     */
    getCallTypeLabel(callType: string): string {
        const labels: { [key: string]: string } = {
            'web_call': 'Web Call',
            'twilio_inbound': 'Inbound',
            'twilio_outbound': 'Outbound'
        };
        return labels[callType] || callType;
    }
}

export const callService = new CallService();
