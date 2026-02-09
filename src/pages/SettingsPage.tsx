import React, { useState } from 'react';
import Header from '../components/Header';
import { AppSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SettingsPageProps {
    theme: string;
    toggleTheme: () => void;
}

// Helper to safely get saved settings from localStorage
const getSavedSettings = () => {
    try {
        const saved = localStorage.getItem('ziyaAgentSettings');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
    }
    return null;
};


const SettingsPage: React.FC<SettingsPageProps> = ({ theme, toggleTheme }) => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<AppSettings>(() => {
        const savedSettings = getSavedSettings();
        return {
            agentName: savedSettings?.agentName || 'Ziya',
            language: savedSettings?.language || 'English (US)',
            voiceType: savedSettings?.voiceType || 'Male',
        };
    });

    const [saveStatus, setSaveStatus] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({ ...prev, voiceType: e.target.value }));
    }

    const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            localStorage.setItem('ziyaAgentSettings', JSON.stringify(settings));
            setSaveStatus('✅ Settings saved successfully!');
            setTimeout(() => setSaveStatus(''), 3000); // Hide message after 3 seconds
        } catch (error) {
            console.error("Failed to save settings to localStorage", error);
            setSaveStatus('❌ Failed to save settings.');
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    return (
        <>
            <Header title="Settings" />

            <div className="max-w-2xl">
                <div className="bg-white dark:bg-darkbg-light p-4 sm:p-6 md:p-8 rounded-lg shadow-md card-animate">
                    <form onSubmit={handleSaveSettings}>
                        <div className="space-y-6 stagger-children">
                            <div style={{ animationDelay: '0.1s' }}>
                                <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white animate-slide-down">General Settings</h2>
                                <div className="space-y-6 stagger-children">
                                    <div style={{ animationDelay: '0.2s' }}>
                                        <label htmlFor="agentName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Agent Name</label>
                                        <input
                                            type="text"
                                            name="agentName"
                                            id="agentName"
                                            value={settings.agentName}
                                            onChange={handleInputChange}
                                            className="input-animate mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                        />
                                    </div>
                                    <div style={{ animationDelay: '0.3s' }}>
                                        <label htmlFor="language" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Default Language</label>
                                        <select
                                            id="language"
                                            name="language"
                                            value={settings.language}
                                            onChange={handleInputChange}
                                            className="input-animate mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                                        >
                                            <option>English (US)</option>
                                            <option>English (UK)</option>
                                            <option>Spanish</option>
                                            <option>French</option>
                                        </select>
                                    </div>
                                    <div style={{ animationDelay: '0.4s' }}>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Voice Type</label>
                                        <div className="mt-2 flex flex-col sm:flex-row gap-4">
                                            <label className="inline-flex items-center">
                                                <input type="radio" className="form-radio text-primary" name="voiceType" value="Male" checked={settings.voiceType === 'Male'} onChange={handleRadioChange} />
                                                <span className="ml-2">Male</span>
                                            </label>
                                            <label className="inline-flex items-center">
                                                <input type="radio" className="form-radio text-primary" name="voiceType" value="Female" checked={settings.voiceType === 'Female'} onChange={handleRadioChange} />
                                                <span className="ml-2">Female</span>
                                            </label>
                                            <label className="inline-flex items-center">
                                                <input type="radio" className="form-radio text-primary" name="voiceType" value="Neutral" checked={settings.voiceType === 'Neutral'} onChange={handleRadioChange} />
                                                <span className="ml-2">Neutral</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div style={{ animationDelay: '0.5s' }}>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Theme</label>
                                        <div className="mt-2 flex items-center">
                                            <button
                                                type="button"
                                                onClick={toggleTheme}
                                                className="btn-animate relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary bg-slate-200 dark:bg-primary"
                                            >
                                                <span className="sr-only">Use setting</span>
                                                <span
                                                    aria-hidden="true"
                                                    className={`${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                                                />
                                            </button>
                                            <span className="ml-3 capitalize">{theme} Mode</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-700 animate-slide-up">
                            <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                                {saveStatus && (
                                    <span className={`text-sm font-medium transition-opacity duration-300 ${saveStatus.includes('❌') ? 'text-red-500' : 'text-green-500'}`}>
                                        {saveStatus}
                                    </span>
                                )}
                                <button type="submit" className="btn-animate w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition">Save Settings</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;