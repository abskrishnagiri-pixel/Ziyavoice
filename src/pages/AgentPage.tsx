import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VoiceAgent, VoiceAgentStatus } from '../types';
import AgentDetailPage from './AgentDetailPage';
import Modal from '../components/Modal';
import { agentService } from '../services/agentService';
import { useAuth } from '../contexts/AuthContext';

const AgentPage: React.FC = () => {
    const [agents, setAgents] = useState<VoiceAgent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<VoiceAgent | null>(null);
    const [view, setView] = useState<'list' | 'create'>('list');
    const [newAgentName, setNewAgentName] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [agentToDelete, setAgentToDelete] = useState<VoiceAgent | null>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeDropdown && !(event.target as Element).closest('.dropdown-menu') && !(event.target as Element).closest('.dropdown-trigger')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeDropdown]);

    // Load agents when component mounts or user changes
    useEffect(() => {
        if (user) {
            loadAgents();
        }
    }, [user]);

    const loadAgents = async () => {
        try {
            setLoading(true);
            if (!user) {
                throw new Error('User not authenticated');
            }
            console.log('Loading agents for user:', user.id);
            const agentData = await agentService.getAgents(user.id);
            console.log('Agents loaded:', agentData);

            // Validate agent data
            if (Array.isArray(agentData)) {
                agentData.forEach((agent, index) => {
                    if (!agent.id || !agent.name) {
                        console.error(`Invalid agent data at index ${index}:`, agent);
                    }
                });
            }

            setAgents(agentData);
        } catch (error) {
            console.error('Error loading agents:', error);
            alert('Failed to load agents: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAgentName.trim()) {
            alert('Agent name is required.');
            return;
        }

        try {
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Create a basic agent structure
            const newAgent: Omit<VoiceAgent, 'id' | 'createdDate'> = {
                name: newAgentName,
                identity: `This is the default identity for ${newAgentName}. Please click to edit the agent's prompt, personality, and goals.`,
                status: VoiceAgentStatus.Active,
                model: 'gemini-2.5-flash',
                voiceId: 'eleven-rachel',
                language: 'ENGLISH',
                settings: {
                    userStartsFirst: false,
                    greetingLine: "Welcome! How can I help you?",
                    responseDelay: false,
                    inactivityHandling: true,
                    agentCanTerminateCall: false,
                    voicemailDetection: true,
                    callTransfer: true,
                    dtmfDial: false,
                    agentTimezone: 'America/New_York',
                    voiceDetectionConfidenceThreshold: 0.5,
                    overrideVAD: false,
                    backgroundAmbientSound: 'None',
                    callRecording: true,
                    sessionTimeoutFixedDuration: 3600,
                    sessionTimeoutNoVoiceActivity: 300,
                    sessionTimeoutEndMessage: "Your session has ended.",
                    dataPrivacyOptOut: false,
                    doNotCallDetection: true,
                    prefetchDataWebhook: '',
                    endOfCallWebhook: '',
                    preActionPhrases: [],
                    tools: [],
                    knowledgeDocIds: [],
                },
            };

            const createdAgent = await agentService.createAgent(user.id, newAgent);
            setAgents(prevAgents => [createdAgent, ...prevAgents]);
            setView('list');
            setNewAgentName('');
        } catch (error) {
            console.error('Error creating agent:', error);
            alert('Failed to create agent');
        }
    };

    const handleCancelCreate = () => {
        setView('list');
        setNewAgentName('');
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
        const timePart = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        return { date: datePart, time: timePart };
    };

    const handleBackToList = () => {
        setSelectedAgent(null);
        // Reload agents to get the latest data
        loadAgents();
    };

    const handleUpdateAgent = async (updatedAgent: VoiceAgent) => {
        try {
            console.log('handleUpdateAgent called with:', { userId: user?.id, agentId: updatedAgent.id, updatedAgent });
            if (!user) {
                throw new Error('User not authenticated');
            }
            const agent = await agentService.updateAgent(user.id, updatedAgent.id, updatedAgent);
            console.log('Agent service returned agent:', agent);
            setAgents(prevAgents => prevAgents.map(a => a.id === agent.id ? agent : a));
            setSelectedAgent(agent);
        } catch (error) {
            console.error('Error updating agent:', error);
            console.error('Error name:', error?.name);
            console.error('Error message:', error?.message);
            console.error('Error stack:', error?.stack);
            alert('Failed to update agent: ' + (error as Error).message);
        }
    };

    const handleToggleDropdown = (agentId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (activeDropdown === agentId) {
            setActiveDropdown(null);
        } else {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY,
                left: rect.right + window.scrollX - 192 // w-48 is 192px
            });
            setActiveDropdown(agentId);
        }
    };

    const handleEditAgent = (agent: VoiceAgent) => {
        console.log('Editing agent:', agent);
        setSelectedAgent(agent);
        setActiveDropdown(null);
    };

    const handleDuplicateAgent = async (agentToDuplicate: VoiceAgent) => {
        try {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const duplicatedAgentData: Omit<VoiceAgent, 'id' | 'createdDate'> = {
                ...JSON.parse(JSON.stringify(agentToDuplicate)), // Deep copy
                name: `${agentToDuplicate.name} (Copy)`,
            };

            const duplicatedAgent = await agentService.createAgent(user.id, duplicatedAgentData);
            setAgents(prev => [duplicatedAgent, ...prev]);
            setActiveDropdown(null);
            return duplicatedAgent;
        } catch (error) {
            console.error('Error duplicating agent:', error);
            alert('Failed to duplicate agent');
        }
    };

    const handleDuplicateAgentFromDetail = async (agent: VoiceAgent) => {
        const newAgent = await handleDuplicateAgent(agent);
        if (newAgent) {
            setSelectedAgent(null);
            alert(`Agent "${newAgent.name}" has been created.`);
        }
    };

    const handleDeleteRequest = (agentId: string) => {
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
            setAgentToDelete(agent);
            setIsDeleteModalOpen(true);
        }
        setActiveDropdown(null);
    };

    const handleConfirmDelete = async () => {
        if (agentToDelete) {
            try {
                if (!user) {
                    throw new Error('User not authenticated');
                }
                await agentService.deleteAgent(user.id, agentToDelete.id);
                setAgents(prev => prev.filter(agent => agent.id !== agentToDelete.id));
                setIsDeleteModalOpen(false);
                setAgentToDelete(null);
            } catch (error) {
                console.error('Error deleting agent:', error);
                alert('Failed to delete agent');
            }
        }
    };

    const handleDeleteAgentFromDetail = async (agentId: string) => {
        if (window.confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
            try {
                if (!user) {
                    throw new Error('User not authenticated');
                }
                await agentService.deleteAgent(user.id, agentId);
                setAgents(prev => prev.filter(agent => agent.id !== agentId));
                setSelectedAgent(null); // Go back to list view
            } catch (error) {
                console.error('Error deleting agent:', error);
                alert('Failed to delete agent');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (selectedAgent) {
        // Validate agent data before rendering
        if (!selectedAgent.id || !selectedAgent.name) {
            console.error('Invalid agent data:', selectedAgent);
            return (
                <div className="p-6">
                    <h2 className="text-xl font-bold text-red-600">Invalid Agent Data</h2>
                    <p className="text-red-500">The selected agent is missing required information.</p>
                    <button
                        onClick={() => setSelectedAgent(null)}
                        className="mt-4 bg-primary text-white px-4 py-2 rounded-md"
                    >
                        Back to Agent List
                    </button>
                </div>
            );
        }

        // Ensure user is authenticated before rendering AgentDetailPage
        if (!user || !user.id) {
            return (
                <div className="p-6">
                    <h2 className="text-xl font-bold text-red-600">Authentication Error</h2>
                    <p className="text-red-500">User not authenticated. Please log in again.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-primary text-white px-4 py-2 rounded-md"
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }

        try {
            return <AgentDetailPage
                agent={selectedAgent}
                onBack={handleBackToList}
                updateAgent={handleUpdateAgent}
                onDuplicate={handleDuplicateAgentFromDetail}
                onDelete={handleDeleteAgentFromDetail}
                userId={user.id}
            />;
        } catch (error) {
            console.error('Error rendering AgentDetailPage:', error);
            return (
                <div className="p-6">
                    <h2 className="text-xl font-bold text-red-600">Error loading agent details</h2>
                    <p className="text-red-500">{error instanceof Error ? error.message : 'Unknown error'}</p>
                    <button
                        onClick={() => setSelectedAgent(null)}
                        className="mt-4 bg-primary text-white px-4 py-2 rounded-md"
                    >
                        Back to Agent List
                    </button>
                </div>
            );
        }
    }

    if (view === 'create') {
        return (
            <>
                <div className="flex items-center justify-between mb-8 animate-slide-down">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
                        Create Agent
                    </h1>
                </div>
                <div className="bg-white dark:bg-darkbg-light p-4 sm:p-6 md:p-8 rounded-lg shadow-md max-w-2xl mx-auto card-animate">
                    <form onSubmit={handleCreateAgent}>
                        <div className="space-y-6 stagger-children">
                            <div style={{ animationDelay: '0.1s' }}>
                                <label htmlFor="agentName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Agent name</label>
                                <input
                                    type="text"
                                    name="agentName"
                                    id="agentName"
                                    value={newAgentName}
                                    onChange={(e) => setNewAgentName(e.target.value)}
                                    required
                                    className="input-animate mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                    placeholder="e.g., Sales Assistant"
                                />
                            </div>
                        </div>
                        <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelCreate}
                                className="btn-animate bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-animate bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition"
                            >
                                Create Agent
                            </button>
                        </div>
                    </form>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="flex items-center justify-end mb-8 gap-2 animate-slide-down">
                <button
                    onClick={() => setView('create')}
                    className="btn-animate bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                    Add
                </button>
            </div>

            <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-md overflow-x-auto card-animate animate-fade-in relative">
                <div className="min-w-[700px]">
                    <div className="flex px-3 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold tracking-wider">
                        <div className="w-[40%]">Name</div>
                        <div className="w-[30%] flex items-center">
                            Created
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                        <div className="w-[20%]">Status</div>
                        <div className="w-[10%]"></div>
                    </div>

                    <div className="stagger-children">
                        {agents.map((agent, idx) => (
                            <div key={agent.id} onClick={() => handleEditAgent(agent)} style={{ animationDelay: `${idx * 0.05}s` }} className="flex items-center px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-darkbg transition-colors duration-150">
                                <div className="w-[40%] font-medium text-slate-800 dark:text-slate-100 pr-4 text-xs sm:text-sm">
                                    {agent.name}
                                </div>

                                <div className="w-[30%] text-xs sm:text-sm">
                                    <div className="text-slate-800 dark:text-slate-100">{formatDateTime(agent.createdDate).date}</div>
                                    <div className="text-slate-500 dark:text-slate-400 text-xs">{formatDateTime(agent.createdDate).time}</div>
                                </div>

                                <div className="w-[20%] flex items-center text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100">
                                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 mr-2 animate-pulse-soft"></span>
                                    {agent.status}
                                </div>

                                <div className="w-[10%] flex justify-end relative">
                                    <button onClick={(e) => handleToggleDropdown(agent.id, e)} className="dropdown-trigger p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors transform hover:scale-110">
                                        <svg className="w-5 h-5 pointer-events-none" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {activeDropdown && (() => {
                const agent = agents.find(a => a.id === activeDropdown);
                if (!agent) return null;
                return createPortal(
                    <div
                        className="dropdown-menu absolute w-48 bg-white dark:bg-darkbg-light rounded-md shadow-lg z-50 border border-slate-200 dark:border-slate-700"
                        style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
                    >
                        <div className="py-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAgent(agent);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-darkbg"
                            >
                                Edit
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateAgent(agent);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-darkbg"
                            >
                                Duplicate
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRequest(agent.id);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-darkbg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>,
                    document.body
                );
            })()}

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Agent"
            >
                <div className="animate-fade-in">
                    <p className="mb-4 text-slate-600 dark:text-slate-300">
                        Are you sure you want to delete the agent <strong className="font-semibold text-slate-800 dark:text-slate-100">{agentToDelete?.name}</strong>?
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                        This action cannot be undone. All associated data will be permanently removed.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setAgentToDelete(null);
                            }}
                            className="btn-animate bg-slate-200 dark:bg-slate-600 px-4 py-2 rounded-md font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="btn-animate bg-red-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-700 transition-colors"
                        >
                            Delete Agent
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default AgentPage;