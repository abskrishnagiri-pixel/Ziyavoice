import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

interface ApiInputProps {
    label: string;
    id: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    description: string;
    isConfigured?: boolean;
}

const ApiInput: React.FC<ApiInputProps> = ({ label, id, name, value, onChange, description, isConfigured = false }) => (
    <div>
        <div className="flex items-center justify-between">
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            {isConfigured && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Configured
                </span>
            )}
        </div>
        <input 
            type="password" 
            name={name} 
            id={id}
            value={value}
            onChange={onChange}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" 
        />
        <p className="mt-2 text-sm text-slate-500">
            {description}
            {isConfigured && value === '' && (
                <span className="block mt-1 text-xs text-slate-400">
                    Leave blank to keep existing key, or enter new key to update
                </span>
            )}
        </p>
    </div>
);

interface ApiService {
    id: string;
    name: string;
    description: string;
    isEnvironmentVariable?: boolean;
    envVarName?: string;
}

interface UserApiKey {
    id: string;
    userId: string;
    serviceName: string;
    createdAt: string;
    updatedAt: string;
}

const ApiPage: React.FC = () => {
    const { user } = useAuth();
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [userApiKeys, setUserApiKeys] = useState<UserApiKey[]>([]);
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    
    const apiServices: ApiService[] = [
        { 
            id: 'gemini',
            name: 'Gemini',
            description: 'Your Google Gemini API key for accessing AI services.'
        },
        { 
            id: '11labs', 
            name: 'ElevenLabs', 
            description: 'Required for both Speech-to-Text and Text-to-Speech services.' 
        }
    ];

    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setApiKeys(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveKeys = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
    return (
        <>
            <Header title="API & Integrations" />

            <div className="max-w-2xl animate-fade-in">
                 <div className="bg-white dark:bg-darkbg-light p-4 md:p-6 rounded-lg shadow-md card-animate">
                     <form onSubmit={handleSaveKeys}>
                        <div className="space-y-6 stagger-children">
                            {apiServices.map((service, idx) => (
                                service.isEnvironmentVariable ? (
                                    <div key={service.id} className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                                        <h4 className="font-semibold text-blue-800 dark:text-blue-300">{service.name} API Key</h4>
                                        <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                                            {service.description}
                                        </p>
                                    </div>
                                ) : (
                                    <div key={service.id} className="animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                                        <ApiInput 
                                            label={`${service.name} API Key`} 
                                            id={`${service.id}-key`} 
                                            name={service.id}
                                            value={apiKeys[service.id] || ''}
                                            onChange={handleKeyChange}
                                            description={service.description} 
                                            isConfigured={userApiKeys.some(key => key.serviceName === service.id)}
                                        />
                                    </div>
                                )
                            ))}
                        </div>
                         <div className="mt-8 pt-5 border-t border-slate-200 dark:border-slate-700 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                            <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
                                {saveStatus && (
                                    <span className={`text-sm font-medium transition-all duration-300 animate-slide-down ${saveStatus.includes('❌') ? 'text-red-500' : 'text-green-500'}`}>
                                        {saveStatus}
                                    </span>
                                )}
                                <button 
                                    type="submit" 
                                    className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 btn-animate"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save API Keys'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );

};
}
export default ApiPage;