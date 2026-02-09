import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Header from '../components/Header';
import Modal from '../components/Modal';
import CallInitiator from '../components/CallInitiator';
import { EditIcon, PhoneIcon, ImportIcon, ArrowUpRightIcon } from '../constants';
import { PhoneNumber, PhoneProvider, VoiceAgent } from '../types';
import { phoneNumberService } from '../services/phoneNumberService';
import { agentService } from '../services/agentService';
import { twilioNumberService } from '../services/twilioNumberService';
import { twilioBasicService } from '../services/twilioBasicService';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/api';

const ImportPhoneNumberModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onPhoneNumberImported: (phoneNumber: PhoneNumber) => void;
}> = ({ isOpen, onClose, user, onPhoneNumberImported }) => {
    const PROVIDERS = ['TWILIO']; // Only Twilio provider
    const [activeProvider, setActiveProvider] = useState('TWILIO');
    const [formData, setFormData] = useState({
        region: 'us-west',
        country: 'us',
        phoneNumber: '',
        twilioSid: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(''); // Clear error when user types
    };

    const handleImport = async () => {
        try {
            setLoading(true);
            setError('');

            if (!user) {
                throw new Error('User not authenticated');
            }

            // Validate phone number format
            if (!formData.phoneNumber || formData.phoneNumber.trim().length === 0) {
                throw new Error('Phone number is required');
            }

            // Basic format validation - should contain at least numbers
            if (!/[\d\+\-\(\)\s]{7,}/.test(formData.phoneNumber)) {
                throw new Error('Invalid phone number format');
            }

            // Call the phone number service to import the phone number
            // The backend will validate with Twilio if credentials are available
            const newPhoneNumber = await phoneNumberService.importPhoneNumber(user.id, formData);

            // Notify the parent component about the new phone number
            onPhoneNumberImported(newPhoneNumber);

            // Reset form and close modal
            setFormData({
                region: 'us-west',
                country: 'us',
                phoneNumber: '',
                twilioSid: '',
            });
            onClose();

            alert('Phone number imported successfully!');
        } catch (error) {
            console.error('Error importing phone number:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-darkbg text-slate-800 dark:text-slate-200 rounded-lg shadow-xl w-full max-w-2xl transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                {/* Tabs - Only Twilio */}
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-8 px-6">
                        <button
                            onClick={() => setActiveProvider('TWILIO')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeProvider === 'TWILIO'
                                ? 'border-primary text-slate-900 dark:text-white'
                                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'
                                }`}
                        >
                            TWILIO
                        </button>
                    </nav>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label htmlFor="region" className="block text-sm font-medium mb-1">Region</label>
                        <select
                            id="region"
                            name="region"
                            value={formData.region}
                            onChange={handleInputChange}
                            className="w-full bg-white dark:bg-darkbg-light border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                        >
                            <option value="us-west">us-west</option>
                            <option value="us-east">us-east</option>
                            <option value="eu-central-1">eu-central-1</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Select the region matching your Twilio account region. If unsure, choose based on call destination.</p>
                    </div>

                    <div>
                        <label htmlFor="country" className="block text-sm font-medium mb-1">Country</label>
                        <select
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            className="w-full bg-white dark:bg-darkbg-light border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                        >
                            <option value="us">United States (+1)</option>
                            <option value="gb">United Kingdom (+44)</option>
                            <option value="ca">Canada (+1)</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">Phone Number</label>
                        <input
                            type="text"
                            id="phoneNumber"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            placeholder="+1234567890"
                            className="w-full bg-white dark:bg-darkbg-light border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                        />
                    </div>

                    <div>
                        <label htmlFor="twilioSid" className="block text-sm font-medium mb-1">Twilio SID (Optional)</label>
                        <input
                            type="text"
                            id="twilioSid"
                            name="twilioSid"
                            value={formData.twilioSid}
                            onChange={handleInputChange}
                            placeholder="PNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                            className="w-full bg-white dark:bg-darkbg-light border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                        />
                        <p className="text-xs text-slate-400 mt-1">Enter the Twilio SID for this phone number (starts with PN).</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-darkbg-light flex justify-between items-center rounded-b-lg">
                    <a href="#" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline flex items-center">
                        Tutorials
                        <ArrowUpRightIcon className="h-4 w-4 ml-1" />
                    </a>
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Close
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={loading}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Importing...
                                </>
                            ) : (
                                'Import'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Connect Twilio Number Modal - Integrated Setup
const ConnectTwilioNumberModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onNumberAdded: () => void;
}> = ({ isOpen, onClose, user, onNumberAdded }) => {
    const [formData, setFormData] = useState({
        twilioAccountSid: '',
        twilioAuthToken: '',
        phoneNumber: '',
        region: 'us-west'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [step, setStep] = useState(1); // Step 1: Credentials, Step 2: Phone Number
    const [availableNumbers, setAvailableNumbers] = useState<Array<{ phoneNumber: string; friendlyName: string; capabilities: any; sid: string }>>([]);
    const [fetchingNumbers, setFetchingNumbers] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const validateCredentials = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');

            if (!formData.twilioAccountSid || !formData.twilioAuthToken) {
                throw new Error('Both Account SID and Auth Token are required');
            }

            if (!formData.twilioAccountSid.startsWith('AC')) {
                throw new Error('Account SID should start with "AC"');
            }

            if (formData.twilioAuthToken.length < 32) {
                throw new Error('Auth Token appears to be invalid (too short)');
            }

            // Validate credentials by making an API call to the backend
            const response = await fetch(`${getApiBaseUrl()}/api/validate-twilio-credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountSid: formData.twilioAccountSid,
                    authToken: formData.twilioAuthToken,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to validate Twilio credentials');
            }

            setSuccess('✅ Credentials validated successfully! Fetching your phone numbers...');

            // Fetch available phone numbers from Twilio
            setFetchingNumbers(true);
            try {
                const numbers = await twilioNumberService.fetchAvailableNumbers(
                    formData.twilioAccountSid,
                    formData.twilioAuthToken
                );
                setAvailableNumbers(numbers);

                if (numbers.length === 0) {
                    setError('No phone numbers found in your Twilio account. Please purchase a number first.');
                    setSuccess('');
                } else {
                    setTimeout(() => {
                        setSuccess('');
                        setStep(2);
                    }, 1000);
                }
            } catch (fetchError: any) {
                console.error('Error fetching numbers:', fetchError);
                setError('Failed to fetch phone numbers: ' + fetchError.message);
                setSuccess('');
            } finally {
                setFetchingNumbers(false);
            }
        } catch (error: any) {
            console.error('Error validating credentials:', error);
            setError(error.message || 'Failed to validate credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleConnectNumber = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');

            if (!user) {
                throw new Error('User not authenticated');
            }

            if (!formData.phoneNumber) {
                throw new Error('Phone number is required');
            }

            if (!formData.phoneNumber.startsWith('+')) {
                throw new Error('Phone number must start with + (E.164 format)');
            }

            // Add the Twilio number with credentials (no verification needed)
            const result = await twilioNumberService.addTwilioNumber(
                user.id,
                formData.phoneNumber,
                formData.region,
                formData.twilioAccountSid,
                formData.twilioAuthToken
            );

            setSuccess('✅ Twilio number connected and verified successfully!');

            setTimeout(() => {
                onNumberAdded();
                handleClose();
            }, 1500);
        } catch (error: any) {
            console.error('Error connecting Twilio number:', error);
            setError(error.message || 'Failed to connect Twilio number');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            twilioAccountSid: '',
            twilioAuthToken: '',
            phoneNumber: '',
            region: 'us-west'
        });
        setError('');
        setSuccess('');
        setStep(1);
        setAvailableNumbers([]);
        setFetchingNumbers(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={handleClose}>
            <div
                className="bg-white dark:bg-darkbg text-slate-800 dark:text-slate-200 rounded-lg shadow-xl w-full max-w-2xl transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Connect Twilio Number</h2>
                        <span className="text-sm text-slate-400">Step {step} of 2</span>
                    </div>

                    <p className="text-sm text-slate-400 mb-4">
                        {step === 1
                            ? 'Enter your Twilio Account SID and Auth Token to authenticate. You can find these in your Twilio Console.'
                            : `Select a phone number from your Twilio account (${availableNumbers.length} number${availableNumbers.length !== 1 ? 's' : ''} available).`}
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200">
                            ❌ {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded text-green-200">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        {step === 1 ? (
                            <>
                                <div>
                                    <label htmlFor="twilioAccountSid" className="block text-sm font-medium mb-1">
                                        Twilio Account SID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="twilioAccountSid"
                                        name="twilioAccountSid"
                                        value={formData.twilioAccountSid}
                                        onChange={handleInputChange}
                                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        className="w-full bg-white dark:bg-darkbg-light border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                                    />
                                    <p className="mt-1 text-xs text-slate-400">
                                        Find this in your Twilio Console under Account Info (starts with AC)
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="twilioAuthToken" className="block text-sm font-medium mb-1">
                                        Twilio Auth Token <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        id="twilioAuthToken"
                                        name="twilioAuthToken"
                                        value={formData.twilioAuthToken}
                                        onChange={handleInputChange}
                                        placeholder="Your Auth Token"
                                        className="w-full bg-white dark:bg-darkbg-light border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                                    />
                                    <p className="mt-1 text-xs text-slate-400">
                                        Your Auth Token is displayed in your Twilio Console. Keep this secure!
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                {fetchingNumbers ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                                        <p className="text-slate-400">Fetching your Twilio phone numbers...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label htmlFor="region" className="block text-sm font-medium mb-1">
                                                Region <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="region"
                                                name="region"
                                                value={formData.region}
                                                onChange={handleInputChange}
                                                className="w-full bg-white dark:bg-darkbg-light border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                                            >
                                                <option value="us-west">US West</option>
                                                <option value="us-east">US East</option>
                                                <option value="eu-central-1">EU Central</option>
                                                <option value="ie">Ireland</option>
                                                <option value="sg">Singapore</option>
                                                <option value="au">Australia</option>
                                            </select>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Select the region closest to your call destinations
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
                                                Phone Number <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="phoneNumber"
                                                name="phoneNumber"
                                                value={formData.phoneNumber}
                                                onChange={handleInputChange}
                                                className="w-full bg-white dark:bg-darkbg-light border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                                            >
                                                <option value="">-- Select a phone number --</option>
                                                {availableNumbers.map((num) => (
                                                    <option key={num.sid} value={num.phoneNumber}>
                                                        {num.phoneNumber} {num.friendlyName ? `(${num.friendlyName})` : ''}
                                                        {num.capabilities?.voice ? ' • Voice' : ''}
                                                        {num.capabilities?.sms ? ' • SMS' : ''}
                                                        {num.capabilities?.mms ? ' • MMS' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Select a phone number from your Twilio account to connect.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-darkbg-light flex justify-between items-center rounded-b-lg">
                    <button
                        onClick={step === 1 ? handleClose : () => setStep(1)}
                        className="text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-700"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>
                    <button
                        onClick={step === 1 ? validateCredentials : handleConnectNumber}
                        disabled={loading || (step === 1 && (!formData.twilioAccountSid || !formData.twilioAuthToken)) || (step === 2 && !formData.phoneNumber)}
                        className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {loading ? (step === 1 ? 'Validating...' : 'Connecting...') : (step === 1 ? 'Validate Credentials' : 'Connect Number')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PhoneNoPage: React.FC = () => {
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [agents, setAgents] = useState<VoiceAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingPhoneNumber, setEditingPhoneNumber] = useState<PhoneNumber | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [isPurchaseModalOpen, setPurchaseModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isAddTwilioModalOpen, setAddTwilioModalOpen] = useState(false);
    const [isCallModalOpen, setCallModalOpen] = useState(false);
    const [isMakeCallModalOpen, setMakeCallModalOpen] = useState(false);
    const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<PhoneNumber | null>(null);
    const [twilioPhoneNumbers, setTwilioPhoneNumbers] = useState<any[]>([]);
    const [callHistory, setCallHistory] = useState<any[]>([]);
    const [userTwilioAccounts, setUserTwilioAccounts] = useState<any[]>([]); // Store user's Twilio accounts
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            loadPhoneNumbers();
            loadAgents();
            loadTwilioPhoneNumbers();
            loadCallHistory();
            loadUserTwilioAccounts(); // Load user's Twilio accounts
        }
    }, [user]);

    const loadUserTwilioAccounts = async () => {
        if (!user) return;
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/twilio/accounts?userId=${user.id}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUserTwilioAccounts(data.data || []);
                }
            }
        } catch (error) {
            console.error('Error loading user Twilio accounts:', error);
        }
    };

    const loadTwilioPhoneNumbers = async () => {
        if (!user) return;
        try {
            const numbers = await twilioBasicService.getPhoneNumbers(user.id);
            setTwilioPhoneNumbers(numbers);
        } catch (error) {
            console.error('Error loading Twilio phone numbers:', error);
        }
    };

    const loadCallHistory = async () => {
        if (!user) return;
        try {
            const calls = await twilioBasicService.getCalls(user.id, 20);
            setCallHistory(calls);
        } catch (error) {
            console.error('Error loading call history:', error);
            // Don't show alert to user as it might be confusing
            // Call history section will simply not be displayed if there's an error
        }
    };

    const loadPhoneNumbers = async () => {
        try {
            setLoading(true);
            if (!user) {
                throw new Error('User not authenticated');
            }
            const data = await phoneNumberService.getPhoneNumbers(user.id);
            console.log('Raw phone numbers from API:', data);

            // Map database column names to frontend property names
            const mappedData = data.map((phone: any) => {
                const mapped = {
                    ...phone,
                    createdDate: phone.created_at || phone.createdDate || phone.purchased_at,
                    agentId: phone.agent_id || phone.agentId,
                    agentName: phone.agent_name || phone.agentName,
                    countryCode: phone.country_code || phone.countryCode,
                    nextCycle: phone.next_cycle || phone.nextCycle,
                    twilioSid: phone.twilio_sid || phone.twilioSid
                };
                console.log('Mapped phone number:', mapped);
                return mapped;
            });
            setPhoneNumbers(mappedData);
        } catch (error) {
            console.error('Error loading phone numbers:', error);
            alert('Failed to load phone numbers');
        } finally {
            setLoading(false);
        }
    };

    const loadAgents = async () => {
        try {
            if (!user) {
                throw new Error('User not authenticated');
            }
            const agentData = await agentService.getAgents(user.id);
            setAgents(agentData);
        } catch (error) {
            console.error('Error loading agents:', error);
            // Don't show alert here as it might be confusing to show two alerts
        }
    };

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

    const formatDateTime = (isoString: string) => {
        if (!isoString) {
            return { date: 'N/A', time: 'N/A' };
        }
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) {
                return { date: 'Invalid Date', time: '' };
            }
            const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const timePart = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            return { date: datePart, time: timePart };
        } catch (error) {
            console.error('Error formatting date:', error, isoString);
            return { date: 'Invalid Date', time: '' };
        }
    };

    const handleToggleDropdown = (e: React.MouseEvent, numberId: string) => {
        e.stopPropagation();
        if (activeDropdown === numberId) {
            setActiveDropdown(null);
        } else {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY,
                left: rect.right + window.scrollX - 224 // w-56 is 224px
            });
            setActiveDropdown(numberId);
        }
    };

    const openEditModal = (phoneNumber: PhoneNumber) => {
        setEditingPhoneNumber(phoneNumber);
        setSelectedAgentId(phoneNumber.agentId || '');
        setEditModalOpen(true);
        setActiveDropdown(null);
    };

    const openCallModal = (phoneNumber: PhoneNumber) => {
        setSelectedPhoneNumber(phoneNumber);
        setCallModalOpen(true);
        setActiveDropdown(null);
    };

    const openMakeCallModal = (phoneNumber: any) => {
        setSelectedPhoneNumber({
            ...phoneNumber,
            phoneNumber: phoneNumber.phoneNumber || phoneNumber.number || phoneNumber.phone_number,
            agentId: phoneNumber.agentId || phoneNumber.agent_id,
            agentName: phoneNumber.agentName || phoneNumber.agent_name
        } as PhoneNumber);

        setMakeCallModalOpen(true);
        setActiveDropdown(null);
    };

    const handleMakeCall = async (from: string, to: string, agentId: string) => {
        if (!user) {
            alert('User not authenticated');
            return;
        }

        // Validate user ID format (UUID)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
            alert('Invalid user ID. Please log in again.');
            return;
        }

        // Validate phone number formats
        if (!/^\+?[1-9]\d{1,14}$/.test(from)) {
            alert('The "from" number must be a valid Twilio number in E.164 format (e.g., +1234567890)');
            return;
        }

        if (!/^\+?[1-9]\d{1,14}$/.test(to)) {
            alert('Please enter a valid phone number in E.164 format (e.g., +1234567890)');
            return;
        }

        // Validate agent ID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId)) {
            alert('Please select a valid agent');
            return;
        }

        try {
            const call = await twilioBasicService.makeCall(user.id, from, to, agentId);
            alert(`Call initiated with agent! Call SID: ${call.callSid}`);
            setMakeCallModalOpen(false);
            setCallModalOpen(false); // Close both modals
            loadCallHistory();
        } catch (error: any) {
            console.error('Error making call:', error);
            // Provide more specific error messages to the user
            let userMessage = error.message;
            if (userMessage.includes('Twilio configuration error')) {
                userMessage = 'Twilio configuration error. Please check your Twilio credentials in the settings.';
            } else if (userMessage.includes('Connection error')) {
                userMessage = 'Connection error. Please check your internet connection and try again.';
            } else if (userMessage.includes('Validation error')) {
                userMessage = 'Validation error. Please check that all fields are correctly filled.';
            }

            // Show a more detailed error message to the user
            alert(`Failed to make call: ${userMessage}

Please check that:
1. The 'from' number is a verified Twilio number in your account
2. The 'to' number is in the correct format (e.g., +1234567890)
3. You have selected an agent
4. Your Twilio credentials are valid`);
        }
    };

    const handleSaveAgentAssignment = async () => {
        if (!editingPhoneNumber) return;

        try {
            console.log('Saving agent assignment:', {
                userId: user!.id,
                phoneNumberId: editingPhoneNumber.id,
                selectedAgentId: selectedAgentId
            });

            let updateData: Partial<any> = {};

            if (!selectedAgentId) {
                // Unassigning agent
                updateData = {
                    agentId: null,
                    agentName: ''
                };
            } else {
                // Assigning agent
                const selectedAgent = agents.find(a => a.id === selectedAgentId);
                if (!selectedAgent) {
                    throw new Error('Selected agent not found');
                }
                updateData = {
                    agentId: selectedAgentId,
                    agentName: selectedAgent.name
                };
            }

            const updatedPhoneNumber = await phoneNumberService.updatePhoneNumber(user!.id, editingPhoneNumber.id, updateData);

            // Map the returned data to match frontend field names
            const mappedPhoneNumber = {
                ...updatedPhoneNumber,
                createdDate: updatedPhoneNumber.created_at || updatedPhoneNumber.createdDate,
                agentId: updatedPhoneNumber.agent_id || updatedPhoneNumber.agentId,
                agentName: updatedPhoneNumber.agent_name || updatedPhoneNumber.agentName,
                countryCode: updatedPhoneNumber.country_code || updatedPhoneNumber.countryCode,
                nextCycle: updatedPhoneNumber.next_cycle || updatedPhoneNumber.nextCycle,
                twilioSid: updatedPhoneNumber.twilio_sid || updatedPhoneNumber.twilioSid
            };

            setPhoneNumbers(phoneNumbers.map(pn =>
                pn.id === editingPhoneNumber.id ? mappedPhoneNumber : pn
            ));

            setEditModalOpen(false);
            setEditingPhoneNumber(null);
        } catch (error) {
            console.error('Error updating phone number:', error);
            alert('Failed to update phone number: ' + (error as Error).message);
        }
    };

    const handleDeleteNumber = async (numberId: string) => {
        if (window.confirm("Are you sure you want to delete this phone number?")) {
            try {
                await phoneNumberService.deletePhoneNumber(user!.id, numberId);
                setPhoneNumbers(phoneNumbers.filter(pn => pn.id !== numberId));
            } catch (error) {
                console.error('Error deleting phone number:', error);
                alert('Failed to delete phone number');
            }
        }
        setActiveDropdown(null);
    };

    // Handle redirect to Twilio for purchasing numbers
    const handleBuyNumber = () => {
        // Redirect to Twilio's phone number purchasing page
        window.open('https://www.twilio.com/console/phone-numbers/search', '_blank');
        setPurchaseModalOpen(false);
    };

    const handleCallStarted = (callId: string) => {
        console.log('Call started with ID:', callId);
        // In a real implementation, you might want to track the call or update UI
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <>
            <Header title="Phone Numbers">
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => setAddTwilioModalOpen(true)}
                        className="btn-animate bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center transition"
                    >
                        <PhoneIcon className="h-5 w-5 mr-2" />
                        <span className="hidden sm:inline">Add Twilio Number</span>
                        <span className="sm:hidden">Add Twilio</span>
                    </button>
                    <button
                        onClick={() => setImportModalOpen(true)}
                        className="btn-animate bg-white dark:bg-darkbg-light border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-darkbg text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg flex items-center transition"
                    >
                        <ImportIcon className="h-5 w-5 mr-2" />
                        <span className="hidden sm:inline">Import Number</span>
                        <span className="sm:hidden">Import</span>
                    </button>
                </div>
            </Header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-darkbg-light border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-blue-500/20">
                                <PhoneIcon className="h-6 w-6 text-blue-400" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Total Numbers</h3>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{phoneNumbers.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-darkbg-light border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-green-500/20">
                                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Active Agents</h3>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{agents.filter(a => a.status === 'Active').length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-darkbg-light border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-purple-500/20">
                                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Recent Calls</h3>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{callHistory.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Phone Numbers Table */}
                <div className="bg-white dark:bg-darkbg-light border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Your Phone Numbers</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Manage your connected phone numbers and assign voice agents</p>
                    </div>

                    {phoneNumbers.length === 0 ? (
                        <div className="text-center py-12">
                            <PhoneIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <h3 className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">No phone numbers</h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">Get started by adding a Twilio number or importing an existing one.</p>
                            <div className="mt-6">
                                <button
                                    onClick={() => setAddTwilioModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none"
                                >
                                    <PhoneIcon className="-ml-1 mr-2 h-5 w-5" />
                                    Add Twilio Number
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-100 dark:bg-slate-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Phone Number</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Provider</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Agent</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Added</th>
                                        <th scope="col" className="relative px-6 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-darkbg-light divide-y divide-slate-200 dark:divide-slate-700">
                                    {phoneNumbers.map((phoneNumber) => {
                                        const { date, time } = formatDateTime(phoneNumber.createdDate);
                                        return (
                                            <tr key={phoneNumber.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                            <PhoneIcon className="h-5 w-5 text-blue-400" />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-slate-900 dark:text-white">{phoneNumber.phoneNumber || phoneNumber.number || phoneNumber.phone_number}</div>
                                                            <div className="text-sm text-slate-600 dark:text-slate-400">{phoneNumber.region}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-slate-900 dark:text-white capitalize">{phoneNumber.provider}</div>
                                                    {phoneNumber.twilioSid && (
                                                        <div className="text-xs text-slate-400 truncate max-w-xs">{phoneNumber.twilioSid.substring(0, 10)}...</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {phoneNumber.agentId ? (
                                                        <div>
                                                            <div className="text-sm text-slate-900 dark:text-white">{phoneNumber.agentName}</div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditModal(phoneNumber);
                                                                }}
                                                                className="text-xs text-primary hover:text-primary-dark"
                                                            >
                                                                Change
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEditModal(phoneNumber);
                                                            }}
                                                            className="text-sm text-primary hover:text-primary-dark"
                                                        >
                                                            Assign Agent
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-300">
                                                        Connected
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                                    <div>{date}</div>
                                                    <div>{time}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="relative inline-block text-left">
                                                        <button
                                                            onClick={(e) => handleToggleDropdown(e, phoneNumber.id)}
                                                            className="dropdown-trigger text-slate-400 hover:text-slate-200"
                                                        >
                                                            <svg className="h-5 w-5 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* User Twilio Accounts Section */}
                {userTwilioAccounts.length > 0 && (
                    <div className="mt-8 bg-white dark:bg-darkbg-light border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Your Twilio Accounts</h2>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Manage phone numbers from your connected Twilio accounts</p>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {userTwilioAccounts.map((account) => (
                                    <div key={account.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium text-slate-900 dark:text-white">{account.name}</h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                    SID: {account.accountSid.substring(0, 10)}...{account.accountSid.substring(account.accountSid.length - 4)}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    // Redirect to Twilio Settings page to manage this account
                                                    window.location.href = '/twilio-settings';
                                                }}
                                                className="text-primary hover:text-primary-dark text-sm"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={() => window.location.href = '/twilio-settings'}
                                    className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-darkbg hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
                                >
                                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Manage Twilio Accounts
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Call History Section */}
                {callHistory.length > 0 && (
                    <div className="mt-8 bg-white dark:bg-darkbg-light border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Calls</h2>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Latest call activity from your phone numbers</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-100 dark:bg-slate-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">From</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">To</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Duration</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-darkbg-light divide-y divide-slate-200 dark:divide-slate-700">
                                    {callHistory.slice(0, 5).map((call) => {
                                        const { date, time } = formatDateTime(call.timestamp);
                                        return (
                                            <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">{call.fromNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">{call.toNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${call.status === 'completed' ? 'bg-green-900 text-green-300' :
                                                        call.status === 'failed' ? 'bg-red-900 text-red-300' :
                                                            call.status === 'busy' ? 'bg-yellow-900 text-yellow-300' :
                                                                'bg-blue-900 text-blue-300'
                                                        }`}>
                                                        {call.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                                    {call.duration > 0 ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                                    <div>{date}</div>
                                                    <div>{time}</div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {activeDropdown && (() => {
                const phoneNumber = phoneNumbers.find(p => p.id === activeDropdown);
                if (!phoneNumber) return null;
                return createPortal(
                    <div
                        className="dropdown-menu absolute w-56 rounded-md shadow-lg bg-white dark:bg-darkbg-light ring-1 ring-black ring-opacity-5 z-50 border border-slate-200 dark:border-slate-700"
                        style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
                    >
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                            <button
                                onClick={() => openMakeCallModal(phoneNumber)}
                                className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                                role="menuitem"
                            >
                                Make Call
                            </button>
                            <button
                                onClick={() => openEditModal(phoneNumber)}
                                className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                                role="menuitem"
                            >
                                Edit Agent
                            </button>
                            <button
                                onClick={() => handleDeleteNumber(phoneNumber.id)}
                                className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                                role="menuitem"
                            >
                                Delete Number
                            </button>
                        </div>
                    </div>,
                    document.body
                );
            })()}

            {/* Modals */}
            <ImportPhoneNumberModal
                isOpen={isImportModalOpen}
                onClose={() => setImportModalOpen(false)}
                user={user}
                onPhoneNumberImported={(newPhoneNumber) => {
                    // Add the new phone number to the list
                    setPhoneNumbers(prev => [...prev, newPhoneNumber]);
                }}
            />

            <ConnectTwilioNumberModal
                isOpen={isAddTwilioModalOpen}
                onClose={() => setAddTwilioModalOpen(false)}
                user={user}
                onNumberAdded={() => {
                    // Refresh the phone numbers list
                    loadPhoneNumbers();
                    loadTwilioPhoneNumbers();
                }}
            />

            {editingPhoneNumber && (
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setEditModalOpen(false);
                        setEditingPhoneNumber(null);
                    }}
                    title="Assign Voice Agent"
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Phone Number
                            </label>
                            <div className="text-slate-900 dark:text-white font-medium">
                                {editingPhoneNumber.phoneNumber || editingPhoneNumber.number || editingPhoneNumber.phone_number}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="agentSelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Select Voice Agent
                            </label>
                            <select
                                id="agentSelect"
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                                className="w-full bg-white dark:bg-darkbg border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                            >
                                <option value="">Unassign Agent</option>
                                {agents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.name} ({agent.status})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                onClick={() => {
                                    setEditModalOpen(false);
                                    setEditingPhoneNumber(null);
                                }}
                                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAgentAssignment}
                                className="px-4 py-2 bg-primary rounded-md text-white hover:bg-primary-dark"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {selectedPhoneNumber && isCallModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <CallInitiator
                                phoneNumber={selectedPhoneNumber}
                                agents={agents}
                                onCallStarted={handleCallStarted}
                                onMakeCall={handleMakeCall}
                                isInModal={true}
                                onClose={() => {
                                    setCallModalOpen(false);
                                    setSelectedPhoneNumber(null);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {selectedPhoneNumber && isMakeCallModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <CallInitiator
                                phoneNumber={selectedPhoneNumber}
                                agents={agents}
                                onCallStarted={handleCallStarted}
                                onMakeCall={handleMakeCall}
                                isInModal={true}
                                onClose={() => {
                                    setMakeCallModalOpen(false);
                                    setSelectedPhoneNumber(null);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PhoneNoPage;