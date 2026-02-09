import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/api';

interface Campaign {
    id: string;
    name: string;
    description: string;
    agent_id: string;
    agent_name: string;
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
    total_contacts: number;
    completed_calls: number;
    successful_calls: number;
    failed_calls: number;
    total_cost: number;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    phone_number_id?: string;
    phone_number?: string;
}

const CampaignsPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        description: '',
        phone_number_id: '',
        contacts: ''
    });

    const apiUrl = getApiBaseUrl();

    useEffect(() => {
        if (user?.id) {
            fetchCampaigns();
            fetchPhoneNumbers();
        }
    }, [user]);

    const fetchCampaigns = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/campaigns?userId=${user?.id}`);
            const data = await response.json();
            if (data.success && data.data) {
                setCampaigns(data.data || []);
            } else {
                setCampaigns([]);
            }
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            setCampaigns([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPhoneNumbers = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/phone-numbers?userId=${user?.id}`);
            const data = await response.json();
            if (data.success) {
                const allNumbers = data.data || data.phoneNumbers || [];
                // Only show phone numbers that have an agent assigned
                const numbersWithAgents = allNumbers.filter((pn: any) => pn.agent_id || pn.agentId);
                setPhoneNumbers(numbersWithAgents);
            }
        } catch (error) {
            console.error('Error fetching phone numbers:', error);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const contactLines = newCampaign.contacts.trim().split('\n');
            const contacts = contactLines.map(line => {
                const parts = line.trim().split(',');
                return {
                    phone_number: parts[0].trim(),
                    name: parts[1]?.trim() || ''
                };
            }).filter(c => c.phone_number);


            const response = await fetch(`${apiUrl}/api/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id,
                    phoneNumberId: null,
                    agentId: null,
                    name: newCampaign.name,
                    description: newCampaign.description,
                    contacts
                })
            });

            const data = await response.json();
            if (data.success) {
                setShowCreateModal(false);
                setNewCampaign({ name: '', description: '', phone_number_id: '', contacts: '' });
                fetchCampaigns();
            } else {
                alert('Failed to create campaign: ' + (data.message || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Error creating campaign:', error);
            alert('Error creating campaign: ' + (error.message || 'Network error'));
        }
    };

    const handleStartCampaign = async (campaignId: string) => {
        if (!window.confirm('Start this campaign? Calls will begin immediately.')) return;

        try {
            const response = await fetch(`${apiUrl}/api/campaigns/${campaignId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id })
            });

            const data = await response.json();
            if (data.success) {
                fetchCampaigns();
            } else {
                alert(data.message || 'Failed to start campaign');
            }
        } catch (error) {
            console.error('Error starting campaign:', error);
            alert('Error starting campaign');
        }
    };

    const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${campaignName}"? This action cannot be undone.`)) return;

        try {
            const response = await fetch(`${apiUrl}/api/campaigns/${campaignId}?userId=${user?.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            if (data.success) {
                fetchCampaigns();
            } else {
                alert(data.message || 'Failed to delete campaign');
            }
        } catch (error) {
            console.error('Error deleting campaign:', error);
            alert('Error deleting campaign');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900';
            case 'completed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900';
            case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900';
            default: return 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center animate-slide-down">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Campaigns</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage and monitor your outbound campaigns</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition shadow-md hover:shadow-lg flex items-center btn-animate"
                >
                    <span className="mr-2 text-xl">+</span> Create Campaign
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children">
                    {campaigns.length === 0 ? (
                        <div className="col-span-full text-center p-12 bg-white dark:bg-darkbg-light rounded-lg border border-slate-200 dark:border-slate-700 dashed-border shadow-sm">
                            <div className="text-4xl mb-4 opacity-50">📱</div>
                            <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">No campaigns found</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">Create your first campaign to start reaching out to contacts.</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-6 rounded-lg transition btn-animate"
                            >
                                Get Started
                            </button>
                        </div>
                    ) : (
                        campaigns.map(campaign => (
                            <div
                                key={campaign.id}
                                className="group bg-white dark:bg-darkbg-light border border-slate-200 dark:border-gray-700/50 p-5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden card-animate"
                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </div>

                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(campaign.status)}`}>
                                        {campaign.status.toUpperCase()}
                                    </div>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                        {new Date(campaign.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 group-hover:text-primary transition-colors">{campaign.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 h-10">{campaign.description || 'No description provided.'}</p>

                                <div className="space-y-2 border-t border-slate-100 dark:border-gray-700/50 pt-4">
                                    <div className="flex items-center text-sm text-slate-600 dark:text-gray-300">
                                        <span className="w-5 text-center mr-2 text-slate-400 dark:text-gray-500">📞</span>
                                        <span className="font-mono text-slate-500 dark:text-gray-400">
                                            {phoneNumbers.find(p => p.id === (campaign as any).phone_number_id)?.number || (campaign as any).phone_number || 'No Phone Set'}
                                        </span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600 dark:text-gray-300">
                                        <span className="w-5 text-center mr-2 text-slate-400 dark:text-gray-500">👥</span>
                                        <span className="text-slate-500 dark:text-gray-400">
                                            {campaign.total_contacts || 0} Contacts
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    {campaign.status === 'draft' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartCampaign(campaign.id);
                                            }}
                                            className="flex-1 bg-slate-700 hover:bg-primary text-white py-2 rounded-lg text-sm font-medium transition"
                                        >
                                            Quick Start
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCampaign(campaign.id, campaign.name);
                                        }}
                                        className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg text-sm font-medium transition"
                                        title="Delete Campaign"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-darkbg-light border border-slate-200 dark:border-gray-700 p-6 rounded-xl w-full max-w-lg shadow-2xl relative card-animate">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
                            <span className="bg-primary/20 text-primary p-2 rounded-lg mr-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </span>
                            Create New Campaign
                        </h2>

                        <form onSubmit={handleCreateCampaign}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-1.5">
                                        Campaign Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                                        value={newCampaign.name}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                        required
                                        placeholder="e.g., Q4 Outreach"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition resize-none"
                                        value={newCampaign.description}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                                        rows={2}
                                        placeholder="Optional description..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium mb-1.5">
                                        Caller Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition appearance-none"
                                        value={newCampaign.phone_number_id}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, phone_number_id: e.target.value })}
                                        required
                                    >
                                        <option value="">-- Select a Number --</option>
                                        {phoneNumbers.map((pn) => (
                                            <option key={pn.id} value={pn.id}>
                                                {pn.number || pn.phone_number}  —  {pn.agent_name || pn.agentName || 'Agent'}
                                            </option>
                                        ))}
                                    </select>
                                    {phoneNumbers.length === 0 && (
                                        <p className="text-xs text-amber-500 mt-2">
                                            No phone numbers with assigned agents found. Please assign an agent in Phone Numbers page.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-slate-600 dark:text-gray-400 text-sm font-medium">
                                            Contacts
                                        </label>
                                        <label className="text-xs text-primary hover:text-primary-dark cursor-pointer flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            Upload CSV
                                            <input type="file" className="hidden" accept=".csv" onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const text = await file.text();
                                                    setNewCampaign({ ...newCampaign, contacts: text });
                                                }
                                            }} />
                                        </label>
                                    </div>
                                    <textarea
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                                        value={newCampaign.contacts}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, contacts: e.target.value })}
                                        rows={4}
                                        placeholder="+1234567890,Name"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">
                                        {newCampaign.contacts.trim() ? newCampaign.contacts.trim().split('\n').filter(l => l.trim()).length : 0} contacts pending
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-gray-600 text-slate-800 dark:text-white rounded-lg font-medium transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold shadow-lg shadow-primary/20 transition"
                                >
                                    Create Campaign
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignsPage;