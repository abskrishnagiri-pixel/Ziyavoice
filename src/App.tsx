import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CampaignsPage from './pages/CampaignsPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import AgentPage from './pages/AgentPage';
import PhoneNoPage from './pages/PhoneNoPage';
import SettingsPage from './pages/SettingsPage';
import TwilioSettingsPage from './pages/TwilioSettingsPage';
import ApiPage from './pages/ApiPage';
import CreditsPage from './pages/CreditsPage';
import DashboardPage from './pages/DashboardPage';
import CallHistoryPage from './pages/CallHistoryPage';
import { Page } from './types';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import TopBar from './components/TopBar';

const App: React.FC = () => {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('ziya-theme');
        if (savedTheme) return savedTheme;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('ziya-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
                {/* User Routes */}
                <Route path="/" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <TopBar isSidebarCollapsed={isSidebarCollapsed} />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 pt-20 relative z-10`}>
                                <DashboardPage />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 relative z-10`}>
                                <DashboardPage />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/campaigns" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 relative z-10`}>
                                <CampaignsPage />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/campaigns/:id" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 relative z-10`}>
                                <CampaignDetailPage />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/agents" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 relative z-10`}>
                                <AgentPage />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/phone-numbers" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 relative z-10`}>
                                <PhoneNoPage />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/settings" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 relative z-10`}>
                                <SettingsPage theme={theme} toggleTheme={toggleTheme} />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/api" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 relative z-10`}>
                                <ApiPage />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/credits" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 relative z-10`}>
                                <CreditsPage />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="/call-history" element={
                    <ProtectedRoute>
                        <div className="min-h-screen bg-lightbg dark:bg-darkbg text-slate-800 dark:text-slate-200 font-sans page-transition relative overflow-hidden">

                            <Sidebar
                                isCollapsed={isSidebarCollapsed}
                                setCollapsed={setSidebarCollapsed}
                            />
                            <main className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-64 md:ml-64'} p-3 sm:p-4 md:p-6 lg:p-8 relative z-10`}>
                                <CallHistoryPage />
                            </main>
                        </div>
                    </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </AuthProvider>
    );
};

export default App;