import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../services/agentService';
import { phoneNumberService } from '../services/phoneNumberService';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [agentCount, setAgentCount] = useState(0);
    const [phoneNumberCount, setPhoneNumberCount] = useState(0);
    const [activeCalls, setActiveCalls] = useState(0);
    const [credits, setCredits] = useState<number | string>('--');
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        // Check if user is admin
        const adminData = localStorage.getItem('admin');
        setIsAdmin(!!adminData);

        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Fetch agents
            const agents = await agentService.getAgents(user!.id);
            setAgentCount(agents.length);

            // Fetch phone numbers
            const phoneNumbers = await phoneNumberService.getPhoneNumbers(user!.id);
            setPhoneNumberCount(phoneNumbers.length);

            // TODO: Fetch active calls from API when endpoint is available
            // For now, we'll use a placeholder value
            setActiveCalls(0);


        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between animate-slide-down">
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 stagger-children">
                <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-4 md:p-6 card-animate hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center">
                        <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 animate-pulse-soft">
                            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h3 className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">Total Agents</h3>
                            <p className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-white" style={{ animationDelay: '0.1s' }}>{agentCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-4 md:p-6 card-animate hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center">
                        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3 animate-pulse-soft" style={{ animationDelay: '0.2s' }}>
                            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h3 className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">Active Calls</h3>
                            <p className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-white" style={{ animationDelay: '0.2s' }}>{activeCalls}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-4 md:p-6 card-animate hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center">
                        <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-3 animate-pulse-soft" style={{ animationDelay: '0.4s' }}>
                            <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h3 className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">Phone Numbers</h3>
                            <p className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-white" style={{ animationDelay: '0.3s' }}>{phoneNumberCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-4 md:p-6 card-animate hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center">
                        <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3 animate-pulse-soft" style={{ animationDelay: '0.6s' }}>
                            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h3 className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">Total Credits</h3>
                            <p className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-white" style={{ animationDelay: '0.4s' }}>{credits}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 stagger-children">
                <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-4 md:p-6 card-animate">
                    <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white mb-4 animate-slide-left">Recent Activity</h2>
                    <div className="space-y-4">
                        <div className="flex items-start animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div className="flex-shrink-0">
                                <div className="h-2 w-2 rounded-full bg-green-500 mt-2 animate-pulse-soft"></div>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-slate-800 dark:text-white">Dashboard loaded</p>
                                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Just now</p>
                            </div>
                        </div>
                        <div className="flex items-start animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <div className="flex-shrink-0">
                                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 animate-pulse-soft"></div>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium text-slate-800 dark:text-white">Data refreshed</p>
                                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Just now</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-4 md:p-6 card-animate">
                    <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white mb-4 animate-slide-right">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <button
                            onClick={() => navigate('/agents')}
                            className="flex flex-col items-center justify-center p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 btn-animate transform hover:scale-110">
                            <svg className="h-6 md:h-8 w-6 md:w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="mt-2 text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">Create Agent</span>
                        </button>
                        <button
                            onClick={() => navigate('/phone-numbers')}
                            className="flex flex-col items-center justify-center p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 btn-animate transform hover:scale-110">
                            <svg className="h-6 md:h-8 w-6 md:w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="mt-2 text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">Import Number</span>
                        </button>
                        <button
                            onClick={() => navigate('/campaigns')}
                            className="flex flex-col items-center justify-center p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 btn-animate transform hover:scale-110">
                            <svg className="h-6 md:h-8 w-6 md:w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="mt-2 text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">View Reports</span>
                        </button>
                        <button
                            onClick={() => navigate('/settings')}
                            className="flex flex-col items-center justify-center p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 btn-animate transform hover:scale-110">
                            <svg className="h-6 md:h-8 w-6 md:w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="mt-2 text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300">Settings</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;