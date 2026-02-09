import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface CallInitiatorProps {
  phoneNumber: any;  // This is the Twilio "from" number
  agents: any[];
  onCallStarted: (callId: string) => void;
  onMakeCall: (from: string, to: string, agentId: string) => void;
  isInModal?: boolean;
  onClose?: () => void; // Add onClose prop for modal
}

const CallInitiator: React.FC<CallInitiatorProps> = ({
  phoneNumber,
  agents,
  onCallStarted,
  onMakeCall,
  isInModal = false,
  onClose
}) => {
  const [toNumber, setToNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const { user } = useAuth();

  // Validate that the phoneNumber (from number) is in a valid format
  useEffect(() => {
    if (phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      setCallStatus('Warning: The "from" number may not be in the correct format. It should be a valid Twilio number in E.164 format (e.g., +1234567890).');
    }
  }, [phoneNumber]);

  const startCall = async () => {
    if (!user) {
      setCallStatus('You must be logged in to make calls');
      return;
    }

    // Validate user ID format (UUID)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      setCallStatus('Invalid user ID. Please log in again.');
      return;
    }

    if (!toNumber.trim()) {
      setCallStatus('Please enter a phone number to call');
      return;
    }

    // Clean up the phone number (remove spaces)
    const cleanedNumber = toNumber.replace(/\s/g, '');

    // Validate phone number format
    if (!/^\+?[1-9]\d{1,14}$/.test(cleanedNumber)) {
      setCallStatus('Please enter a valid phone number (e.g., +1 1234567890)');
      return;
    }

    // Get agent ID from phone number
    const agentId = phoneNumber?.agentId || phoneNumber?.agent_id;
    if (!agentId) {
      setCallStatus('No agent assigned to this phone number. Please assign an agent first.');
      return;
    }

    // Validate agent ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId)) {
      setCallStatus('Invalid agent ID. Please reassign an agent to this phone number.');
      return;
    }

    setIsCalling(true);
    setCallStatus('Initiating call...');

    try {
      // Get from number string
      const fromNumber = typeof phoneNumber === 'object'
        ? (phoneNumber.number || phoneNumber.phoneNumber || phoneNumber.phone_number)
        : phoneNumber;

      await onMakeCall(fromNumber, cleanedNumber, agentId);
      setCallStatus('Call initiated successfully!');
      // Reset form after successful call
      setToNumber('');
    } catch (error: any) {
      console.error('Error starting call:', error);
      // Provide more specific error messages to the user
      let userMessage = error.message;
      if (userMessage.includes('Twilio configuration error')) {
        userMessage = 'Twilio configuration error. Please check your Twilio credentials in the settings.';
      } else if (userMessage.includes('Connection error')) {
        userMessage = 'Connection error. Please check your internet connection and try again.';
      } else if (userMessage.includes('Validation error')) {
        userMessage = 'Validation error. Please check that all fields are correctly filled.';
      }
      setCallStatus('Failed to initiate call: ' + userMessage);
    } finally {
      setIsCalling(false);
    }
  };

  const content = (
    <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-md">
      {isInModal && (
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Start AI Call</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {!isInModal && (
        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold mb-4">Start AI Call</h3>
        </div>
      )}
      <div className="px-6 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">From Number (Twilio)</label>
          <input
            type="text"
            value={phoneNumber?.phoneNumber || phoneNumber?.number || phoneNumber || ''}
            readOnly
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Agent</label>
          <input
            type="text"
            value={phoneNumber?.agentName || phoneNumber?.agent_name || 'No Agent Assigned'}
            readOnly
            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Using the agent assigned to this phone number
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">To Number</label>
          <div className="flex gap-2">
            <select
              value={toNumber.startsWith('+') ? toNumber.substring(0, toNumber.indexOf(' ') > 0 ? toNumber.indexOf(' ') : 3) : '+1'}
              onChange={(e) => {
                const countryCode = e.target.value;
                const numberPart = toNumber.replace(/^\+\d+\s*/, '');
                setToNumber(countryCode + (numberPart ? ' ' + numberPart : ''));
                setCallStatus('');
              }}
              className="w-32 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-darkbg text-slate-900 dark:text-white"
            >
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+91">🇮🇳 +91</option>
              <option value="+61">🇦🇺 +61</option>
              <option value="+86">🇨🇳 +86</option>
              <option value="+81">🇯🇵 +81</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+39">🇮🇹 +39</option>
              <option value="+34">🇪🇸 +34</option>
              <option value="+7">🇷🇺 +7</option>
              <option value="+55">🇧🇷 +55</option>
              <option value="+52">🇲🇽 +52</option>
              <option value="+27">🇿🇦 +27</option>
              <option value="+82">🇰🇷 +82</option>
            </select>
            <input
              type="text"
              value={toNumber.replace(/^\+\d+\s*/, '')}
              onChange={(e) => {
                const countryCode = toNumber.startsWith('+') ? toNumber.substring(0, toNumber.indexOf(' ') > 0 ? toNumber.indexOf(' ') : 3) : '+1';
                setToNumber(countryCode + ' ' + e.target.value.replace(/[^\d]/g, ''));
                setCallStatus('');
              }}
              placeholder="1234567890"
              className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-darkbg text-slate-900 dark:text-white"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Select country code and enter phone number
          </p>
        </div>

        <button
          onClick={startCall}
          disabled={isCalling}
          className={`w-full py-2 px-4 rounded-md font-semibold ${isCalling
            ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed'
            : 'bg-primary hover:bg-primary-dark text-white'
            }`}
        >
          {isCalling ? 'Calling...' : 'Start AI Call'}
        </button>
        {callStatus && (
          <div className={`mt-4 p-3 rounded-md ${callStatus.includes('Failed') || callStatus.includes('error')
            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            }`}>
            <p className="text-sm">{callStatus}</p>
          </div>
        )}
      </div>
    </div>
  );

  // If we're in a modal, wrap the content in modal structure
  if (isInModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-xl max-w-md w-full mx-4">
          {content}
        </div>
      </div>
    );
  }

  // Otherwise, just return the content (for inline display)
  return content;
};

export default CallInitiator;