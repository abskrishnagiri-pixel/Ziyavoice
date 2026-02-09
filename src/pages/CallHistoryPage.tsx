import React, { useState, useEffect } from 'react';
import { callService, Call, CallFilters } from '../services/callService';
import { useAuth } from '../contexts/AuthContext';
import { PhoneIcon, ClockIcon, UserIcon, FunnelIcon } from '@heroicons/react/24/outline';

const CallHistoryPage: React.FC = () => {
    const { user } = useAuth();
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<CallFilters>({});
    const [pagination, setPagination] = useState({
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false
    });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchCallHistory();
        }
    }, [user, filters, pagination.offset]);

    const fetchCallHistory = async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            setError(null);
            const response = await callService.fetchCallHistory(
                user.id,
                filters,
                pagination.limit,
                pagination.offset
            );

            setCalls(response.calls);
            setPagination(response.pagination);
        } catch (err) {
            console.error('Error fetching call history:', err);
            setError('Failed to load call history. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: keyof CallFilters, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value || undefined
        }));
        setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
    };

    const handlePageChange = (newOffset: number) => {
        setPagination(prev => ({ ...prev, offset: newOffset }));
    };

    const getCallTypeColor = (callType: string) => {
        const colors: { [key: string]: string } = {
            'web_call': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'twilio_inbound': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'twilio_outbound': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
        };
        return colors[callType] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            'completed': 'text-green-600 dark:text-green-400',
            'in-progress': 'text-yellow-600 dark:text-yellow-400',
            'failed': 'text-red-600 dark:text-red-400',
            'initiated': 'text-blue-600 dark:text-blue-400'
        };
        return colors[status] || 'text-gray-600 dark:text-gray-400';
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-slate-500">Please log in to view call history.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-darkbg p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                        Call History
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        View and manage your call records
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-4 mb-6">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-primary transition-colors"
                    >
                        <FunnelIcon className="w-5 h-5" />
                        <span className="font-medium">Filters</span>
                        <span className="text-sm text-slate-500">
                            {showFilters ? '▼' : '▶'}
                        </span>
                    </button>

                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Call Type
                                </label>
                                <select
                                    value={filters.callType || ''}
                                    onChange={(e) => handleFilterChange('callType', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-darkbg text-slate-800 dark:text-slate-100"
                                >
                                    <option value="">All Types</option>
                                    <option value="web_call">Web Calls</option>
                                    <option value="twilio_inbound">Inbound</option>
                                    <option value="twilio_outbound">Outbound</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.startDate || ''}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-darkbg text-slate-800 dark:text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={filters.endDate || ''}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-darkbg text-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Call List */}
                <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64">
                            <p className="text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    ) : calls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <PhoneIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 text-lg">No calls found</p>
                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                                Start making calls to see them here
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-darkbg border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Date & Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Agent
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Duration
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {calls.map((call) => (
                                            <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-darkbg transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">
                                                    {callService.formatTimestamp(call.timestamp)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <UserIcon className="w-4 h-4 text-slate-400 mr-2" />
                                                        <span className="text-sm text-slate-800 dark:text-slate-200">
                                                            {call.agentName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <ClockIcon className="w-4 h-4 text-slate-400 mr-2" />
                                                        <span className="text-sm text-slate-800 dark:text-slate-200">
                                                            {callService.formatDuration(call.duration)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCallTypeColor(call.callType)}`}>
                                                        {callService.getCallTypeLabel(call.callType)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-sm font-medium ${getStatusColor(call.status)}`}>
                                                        {call.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
                                {calls.map((call) => (
                                    <div key={call.id} className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    {call.agentName}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {callService.formatTimestamp(call.timestamp)}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCallTypeColor(call.callType)}`}>
                                                {callService.getCallTypeLabel(call.callType)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {callService.formatDuration(call.duration)}
                                            </span>
                                            <span className={`font-medium ${getStatusColor(call.status)}`}>
                                                {call.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {pagination.total > pagination.limit && (
                                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                        Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} calls
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handlePageChange(Math.max(0, pagination.offset - pagination.limit))}
                                            disabled={pagination.offset === 0}
                                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-darkbg border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                                            disabled={!pagination.hasMore}
                                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-darkbg border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CallHistoryPage;
