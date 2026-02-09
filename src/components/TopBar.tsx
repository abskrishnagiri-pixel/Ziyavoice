import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface TopBarProps {
    isSidebarCollapsed: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ isSidebarCollapsed }) => {
    const { user } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div
            className={`fixed top-0 right-0 h-16 bg-white dark:bg-darkbg border-b border-gray-200 dark:border-gray-800 flex items-center justify-end px-6 z-30 transition-all duration-300 ${isSidebarCollapsed ? 'left-20' : 'left-64'
                }`}
        >
            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-darkbg-light transition-colors duration-200"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white font-semibold">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="text-left hidden md:block">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {user?.email || 'user@example.com'}
                        </p>
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-darkbg-light rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-fadeIn">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">User Details</p>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                            <div className="flex items-start space-x-3">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white font-bold text-lg flex-shrink-0">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                        {user?.email?.split('@')[0] || 'User'}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {user?.email || 'user@example.com'}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2 space-y-1">
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">User ID:</span>
                                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{user?.id || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Account Type:</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Standard</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopBar;
