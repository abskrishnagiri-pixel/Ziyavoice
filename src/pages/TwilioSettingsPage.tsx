import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../utils/api';
import { twilioNumberService } from '../services/twilioNumberService';

interface TwilioConfig {
  appUrl: string;
  accountSid?: string;
  authToken?: string;
  apiKeySid?: string;
  apiKeySecret?: string;
}

interface TwilioAccount {
  id: string;
  name: string;
  accountSid: string;
  authToken: string;
  createdAt: string;
}

interface TwilioAccountNumber {
  phoneNumber: string;
  friendlyName: string;
  sid: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
}

const TwilioSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<TwilioConfig>({
    appUrl: '',
  });
  const [twilioAccounts, setTwilioAccounts] = useState<TwilioAccount[]>([]);
  const [newAccount, setNewAccount] = useState({
    name: '',
    accountSid: '',
    authToken: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedAccountForNumbers, setSelectedAccountForNumbers] = useState<TwilioAccount | null>(null);
  const [accountNumbers, setAccountNumbers] = useState<TwilioAccountNumber[]>([]);
  const [fetchingNumbers, setFetchingNumbers] = useState(false);
  const [addingNumber, setAddingNumber] = useState(false);
  const [selectedNumberToAdd, setSelectedNumberToAdd] = useState<string>('');

  useEffect(() => {
    loadConfig();
    loadTwilioAccounts();
  }, [user?.id]);

  const loadConfig = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await fetch(`${api.getApiBaseUrl()}/api/twilio/config?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.data || { appUrl: '' });
        }
      }
    } catch (err) {
      console.error('Error loading config:', err);
      setMessage('Failed to load Twilio settings');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const loadTwilioAccounts = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${api.getApiBaseUrl()}/api/twilio/accounts?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTwilioAccounts(data.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading Twilio accounts:', err);
    }
  };

  const handleSaveConfig = async () => {
    if (!user?.id || !config.appUrl.trim()) {
      setMessage('❌ Please enter a valid webhook URL');
      setMessageType('error');
      return;
    }

    // Validate URL format
    try {
      new URL(config.appUrl);
    } catch {
      setMessage('❌ Invalid URL format. Must start with http:// or https://');
      setMessageType('error');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${api.getApiBaseUrl()}/api/twilio/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          appUrl: config.appUrl,
          apiKeySid: config.apiKeySid || undefined,
          apiKeySecret: config.apiKeySecret || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Webhook URL saved successfully!');
        setMessageType('success');
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage('❌ ' + (data.message || 'Failed to save config'));
        setMessageType('error');
      }
    } catch (err) {
      setMessage('❌ Error saving configuration');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccount = async () => {
    if (!user?.id || !newAccount.name || !newAccount.accountSid || !newAccount.authToken) {
      setMessage('❌ Please fill in all account details');
      setMessageType('error');
      return;
    }

    if (!newAccount.accountSid.startsWith('AC')) {
      setMessage('❌ Account SID should start with "AC"');
      setMessageType('error');
      return;
    }

    setSaving(true);
    try {
      // First validate the credentials
      const validateResponse = await fetch(`${api.getApiBaseUrl()}/api/validate-twilio-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: newAccount.accountSid,
          authToken: newAccount.authToken,
        }),
      });

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json();
        throw new Error(errorData.message || 'Invalid Twilio credentials');
      }

      // Save the account
      const response = await fetch(`${api.getApiBaseUrl()}/api/twilio/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name: newAccount.name,
          accountSid: newAccount.accountSid,
          authToken: newAccount.authToken,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Twilio account added successfully!');
        setMessageType('success');
        setNewAccount({ name: '', accountSid: '', authToken: '' });
        setShowAddAccount(false);
        loadTwilioAccounts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage('❌ ' + (data.message || 'Failed to add account'));
        setMessageType('error');
      }
    } catch (err) {
      setMessage('❌ Error adding account: ' + (err as Error).message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!user?.id) return;

    if (!window.confirm('Are you sure you want to remove this Twilio account?')) {
      return;
    }

    try {
      const response = await fetch(`${api.getApiBaseUrl()}/api/twilio/accounts/${accountId}?userId=${user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Twilio account removed successfully!');
        setMessageType('success');
        loadTwilioAccounts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage('❌ ' + (data.message || 'Failed to remove account'));
        setMessageType('error');
      }
    } catch (err) {
      setMessage('❌ Error removing account');
      setMessageType('error');
    }
  };

  const handleTestAccount = async (account: TwilioAccount) => {
    try {
      const response = await fetch(`${api.getApiBaseUrl()}/api/validate-twilio-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: account.accountSid,
          authToken: account.authToken,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Twilio credentials are valid!');
        setMessageType('success');
      } else {
        setMessage('❌ ' + (data.message || 'Invalid Twilio credentials'));
        setMessageType('error');
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage('❌ Error testing credentials');
      setMessageType('error');
    }
  };

  const handleFetchAccountNumbers = async (account: TwilioAccount) => {
    if (!user?.id) return;

    setFetchingNumbers(true);
    setSelectedAccountForNumbers(account);
    try {
      const numbers = await twilioNumberService.fetchAccountNumbers(user.id, account.accountSid);
      setAccountNumbers(numbers);
      setMessage('✅ Fetched phone numbers successfully!');
      setMessageType('success');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage('❌ Error fetching phone numbers: ' + (err as Error).message);
      setMessageType('error');
    } finally {
      setFetchingNumbers(false);
    }
  };

  const handleAddPhoneNumber = async () => {
    if (!user?.id || !selectedAccountForNumbers || !selectedNumberToAdd) {
      setMessage('❌ Please select a phone number to add');
      setMessageType('error');
      return;
    }

    setAddingNumber(true);
    try {
      // Find the selected number details
      const selectedNumber = accountNumbers.find(num => num.phoneNumber === selectedNumberToAdd);
      if (!selectedNumber) {
        throw new Error('Selected phone number not found');
      }

      // Add the Twilio number from user's account (auto-verified)
      await twilioNumberService.addAccountNumber(
        user.id,
        selectedAccountForNumbers.accountSid,
        selectedNumber.phoneNumber,
        'us-west' // Default region, could be improved
      );

      setMessage('✅ Phone number added successfully!');
      setMessageType('success');
      setSelectedNumberToAdd('');

      // Refresh the account numbers list
      await handleFetchAccountNumbers(selectedAccountForNumbers);

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage('❌ Error adding phone number: ' + (err as Error).message);
      setMessageType('error');
    } finally {
      setAddingNumber(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-darkbg text-white min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🔧 Twilio Settings</h1>
          <p className="text-gray-400">Configure your Twilio accounts and webhook settings</p>
        </div>

        {/* Twilio Accounts Section */}
        <div className="bg-[#1E293B] rounded-lg border border-gray-700 p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold flex items-center">
              <span className="mr-3 text-2xl">📞</span>
              Twilio Accounts
            </h2>
            <button
              onClick={() => setShowAddAccount(!showAddAccount)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center transition"
            >
              <span className="mr-2">+</span>
              Add Account
            </button>
          </div>

          {/* Add Account Form */}
          {showAddAccount && (
            <div className="mb-6 p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-4">Add New Twilio Account</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Account Name</label>
                  <input
                    type="text"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="My Twilio Account"
                    className="w-full bg-[#1E293B] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Account SID</label>
                  <input
                    type="text"
                    value={newAccount.accountSid}
                    onChange={(e) => setNewAccount({ ...newAccount, accountSid: e.target.value })}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#1E293B] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Auth Token</label>
                  <input
                    type="password"
                    value={newAccount.authToken}
                    onChange={(e) => setNewAccount({ ...newAccount, authToken: e.target.value })}
                    placeholder="Your Auth Token"
                    className="w-full bg-[#1E293B] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddAccount(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddAccount}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${saving
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                  >
                    {saving ? 'Adding...' : 'Add Account'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Accounts List */}
          {twilioAccounts.length > 0 ? (
            <div className="space-y-4">
              {twilioAccounts.map((account) => (
                <div key={account.id} className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{account.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        SID: {account.accountSid.substring(0, 10)}...{account.accountSid.substring(account.accountSid.length - 4)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Added: {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleFetchAccountNumbers(account)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                      >
                        View Numbers
                      </button>
                      <button
                        onClick={() => handleTestAccount(account)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Phone Numbers Section */}
                  {selectedAccountForNumbers?.id === account.id && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h4 className="font-semibold mb-3">Phone Numbers in this Account</h4>

                      {fetchingNumbers ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-emerald-500"></div>
                        </div>
                      ) : accountNumbers.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <select
                              value={selectedNumberToAdd}
                              onChange={(e) => setSelectedNumberToAdd(e.target.value)}
                              className="flex-1 min-w-[200px] bg-[#1E293B] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            >
                              <option value="">Select a phone number to add</option>
                              {accountNumbers.map((num) => (
                                <option key={num.sid} value={num.phoneNumber}>
                                  {num.phoneNumber} {num.friendlyName ? `(${num.friendlyName})` : ''}
                                  {num.capabilities.voice && ' • Voice'}
                                  {num.capabilities.sms && ' • SMS'}
                                  {num.capabilities.mms && ' • MMS'}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleAddPhoneNumber}
                              disabled={addingNumber || !selectedNumberToAdd}
                              className={`px-4 py-2 rounded-lg font-semibold transition ${addingNumber || !selectedNumberToAdd
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                              {addingNumber ? 'Adding...' : 'Add Number'}
                            </button>
                          </div>

                          <div className="mt-4 max-h-60 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-700">
                                  <th className="text-left py-2">Phone Number</th>
                                  <th className="text-left py-2">Friendly Name</th>
                                  <th className="text-left py-2">Capabilities</th>
                                </tr>
                              </thead>
                              <tbody>
                                {accountNumbers.map((num) => (
                                  <tr key={num.sid} className="border-b border-gray-800">
                                    <td className="py-2">{num.phoneNumber}</td>
                                    <td className="py-2">{num.friendlyName || '-'}</td>
                                    <td className="py-2">
                                      <div className="flex space-x-2">
                                        {num.capabilities.voice && (
                                          <span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs">Voice</span>
                                        )}
                                        {num.capabilities.sms && (
                                          <span className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs">SMS</span>
                                        )}
                                        {num.capabilities.mms && (
                                          <span className="px-2 py-1 bg-purple-900 text-purple-300 rounded text-xs">MMS</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">No phone numbers found in this account.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No Twilio accounts added yet.</p>
              <p className="text-sm mt-2">Add your first Twilio account to start making calls.</p>
            </div>
          )}
        </div>

        {/* Main Settings Card */}
        <div className="bg-[#1E293B] rounded-lg border border-gray-700 p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center">
            <span className="mr-3 text-2xl">🌐</span>
            Webhook URL Configuration
          </h2>

          <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-200">
              <strong>📌 Important:</strong> The webhook URL is where Twilio sends callbacks about your calls (status updates, recordings, etc.)
            </p>
          </div>

          {/* Current Environment Info */}
          <div className="mb-6 p-4 bg-[#0F172A] rounded-lg border border-gray-700">
            <h3 className="font-semibold mb-3 text-sm">📍 Current Environment</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Current URL:</span>
                <code className="bg-gray-900 px-3 py-1 rounded text-emerald-400">
                  {config.appUrl || 'Not configured'}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`px-3 py-1 rounded text-xs font-semibold ${config.appUrl ? 'bg-emerald-900 text-emerald-300' : 'bg-gray-700 text-gray-300'
                  }`}>
                  {config.appUrl ? '✅ Configured' : '⚠️ Not Set'}
                </span>
              </div>
            </div>
          </div>

          {/* Webhook URL Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-3">
              Webhook URL
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              placeholder="https://yourdomain.com (without /api/twilio/webhook)"
              value={config.appUrl}
              onChange={(e) => setConfig({ ...config, appUrl: e.target.value })}
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
            <p className="text-xs text-gray-400 mt-2">
              Example: <code className="bg-gray-900 px-2 py-1 rounded">https://yourdomain.com</code>
            </p>
          </div>

          {/* Messages */}
          {message && (
            <div className={`rounded-lg p-4 mb-6 border ${messageType === 'success'
              ? 'bg-emerald-900 border-emerald-700 text-emerald-200'
              : 'bg-red-900 border-red-700 text-red-200'
              }`}>
              {message}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center ${saving
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <span className="mr-2">💾</span>
                Save Webhook URL
              </>
            )}
          </button>
        </div>

        {/* How It Works */}
        <div className="bg-[#1E293B] rounded-lg border border-gray-700 p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center">
            <span className="mr-3 text-2xl">📋</span>
            How Webhook URL Works
          </h2>

          <div className="space-y-6">
            {/* Development Setup */}
            <div className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-3 flex items-center text-yellow-400">
                <span className="mr-2">🧪</span> Development (Localhost)
              </h3>
              <ol className="space-y-2 text-sm text-gray-300 ml-6 list-decimal">
                <li>Download and run <code className="bg-gray-900 px-2 py-1 rounded">ngrok http 3000</code></li>
                <li>Copy the HTTPS URL from ngrok output (e.g., <code className="bg-gray-900 px-2 py-1 rounded">https://abc123.ngrok.io</code>)</li>
                <li>Paste it in the Webhook URL field above</li>
                <li>Click "Save Webhook URL"</li>
                <li>Twilio will send callbacks to: <code className="bg-gray-900 px-2 py-1 rounded">https://abc123.ngrok.io/api/twilio/webhook</code></li>
              </ol>
            </div>

            {/* Production Setup */}
            <div className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-3 flex items-center text-emerald-400">
                <span className="mr-2">🚀</span> Production (After Deployment)
              </h3>
              <ol className="space-y-2 text-sm text-gray-300 ml-6 list-decimal">
                <li>After deploying your app to a server, you'll have a real domain (e.g., <code className="bg-gray-900 px-2 py-1 rounded">https://yourdomain.com</code>)</li>
                <li>Come back to this page</li>
                <li>Replace the ngrok URL with your real domain</li>
                <li>Click "Save Webhook URL"</li>
                <li>Twilio will now send all callbacks to your production server</li>
              </ol>
            </div>

            {/* Callback Information */}
            <div className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-3">📨 What Twilio Sends to Your Webhook</h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p><strong>Call Status Updates:</strong> initiated, ringing, answered, completed, failed, busy, no-answer</p>
                <p><strong>Call Details:</strong> Call SID, From number, To number, Duration</p>
                <p><strong>Recordings:</strong> Recording URL when call is recorded</p>
                <p className="text-gray-400 mt-3">Your webhook endpoint (<code className="bg-gray-900 px-2 py-1 rounded">/api/twilio/webhook</code>) processes all these events and updates your database.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Details */}
        <div className="bg-[#1E293B] rounded-lg border border-gray-700 p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center">
            <span className="mr-3 text-2xl">⚙️</span>
            Technical Details
          </h2>

          <div className="space-y-6">
            {/* Webhook Endpoint */}
            <div className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-3">🔗 Webhook Endpoint</h3>
              <code className="block bg-gray-900 p-4 rounded text-emerald-400 text-sm overflow-x-auto">
                POST {config.appUrl}/api/twilio/webhook
              </code>
              <p className="text-xs text-gray-400 mt-2">
                This endpoint receives all Twilio callbacks automatically (no configuration needed on Twilio side)
              </p>
            </div>

            {/* Environment Variables */}
            <div className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-3">🔐 Environment Variables (Backend)</h3>
              <div className="bg-gray-900 p-4 rounded text-xs overflow-x-auto">
                <code className="text-blue-400">
                  VITE_API_BASE_URL=https://yourdomain.com/api<br />
                  TWILIO_WEBHOOK_URL=https://yourdomain.com/api/twilio/webhook<br />
                  NODE_ENV=production
                </code>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Update these after deploying to production
              </p>
            </div>

            {/* Frontend Configuration */}
            <div className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold mb-3">📱 Frontend Configuration</h3>
              <div className="bg-gray-900 p-4 rounded text-xs overflow-x-auto">
                <code className="text-blue-400">
                  # In your .env.production file:<br />
                  VITE_API_BASE_URL=https://yourdomain.com/api
                </code>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                The frontend uses this to make API calls to your backend
              </p>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-[#1E293B] rounded-lg border border-gray-700 p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center">
            <span className="mr-3 text-2xl">🔍</span>
            Troubleshooting
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold text-red-400 mb-2">❌ "Webhook URL not receiving callbacks"</h3>
              <ul className="list-disc ml-6 text-sm text-gray-300 space-y-1">
                <li>Make sure ngrok is running and the URL is active</li>
                <li>Check that your firewall isn't blocking Twilio IPs</li>
                <li>Verify the URL is publicly accessible (try opening it in browser)</li>
              </ul>
            </div>

            <div className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold text-red-400 mb-2">❌ "Call status not updating"</h3>
              <ul className="list-disc ml-6 text-sm text-gray-300 space-y-1">
                <li>Check server logs for webhook events: <code className="bg-gray-900 px-2 py-1 rounded text-xs">npm run server</code></li>
                <li>Verify database connection is working</li>
                <li>Make sure webhook endpoint is returning 200 status</li>
              </ul>
            </div>

            <div className="p-4 bg-[#0F172A] rounded-lg border border-gray-700">
              <h3 className="font-semibold text-red-400 mb-2">❌ "Certificate error with ngrok"</h3>
              <ul className="list-disc ml-6 text-sm text-gray-300 space-y-1">
                <li>Twilio requires HTTPS (ngrok provides this by default)</li>
                <li>Use the HTTPS URL from ngrok, not HTTP</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="mt-8 bg-emerald-900 bg-opacity-20 border border-emerald-700 rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center text-emerald-400">
            <span className="mr-2">✨</span>Quick Reference
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-2"><strong>Current Setup (What you see):</strong></p>
              <code className="bg-gray-900 px-3 py-2 rounded block text-xs text-emerald-400">
                Localhost with ngrok
              </code>
            </div>
            <div>
              <p className="text-gray-400 mb-2"><strong>Future Setup (After deployment):</strong></p>
              <code className="bg-gray-900 px-3 py-2 rounded block text-xs text-emerald-400">
                Your real domain
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwilioSettingsPage;