import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserDetails, setServiceLimit, updateBillingStatus, Admin, ServiceLimit } from '../utils/adminApi';
import { getApiBaseUrl } from '../utils/api';

const AdminUserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [user, setUser] = useState<any>(null);
  const [limits, setLimits] = useState<any>({});
  const [usage, setUsage] = useState<any[]>([]);
  const [billing, setBilling] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');

  // Form states for service limits
  const [editingService, setEditingService] = useState<string | null>(null);
  const [limitForm, setLimitForm] = useState({
    monthlyLimit: '',
    dailyLimit: '',
    isEnabled: true
  });

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    if (!adminData) {
      navigate('/admin/login');
      return;
    }

    setAdmin(JSON.parse(adminData));
    fetchUserDetails();
  }, [userId, navigate]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const data = await getUserDetails(userId!);
      setUser(data.user);
      setLimits(data.limits);
      setUsage(data.usage);
      setBilling(data.billing);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditService = (serviceName: string) => {
    setEditingService(serviceName);
    const limit = limits[serviceName];
    setLimitForm({
      monthlyLimit: limit?.monthly_limit ?? '',
      dailyLimit: limit?.daily_limit ?? '',
      isEnabled: limit?.is_enabled ?? true
    });
  };

  const handleSaveLimit = async (serviceName: string) => {
    try {
      await setServiceLimit(
        userId!,
        serviceName,
        limitForm.monthlyLimit ? parseFloat(limitForm.monthlyLimit) : null,
        limitForm.dailyLimit ? parseFloat(limitForm.dailyLimit) : null,
        limitForm.isEnabled,
        admin!.id
      );

      setSuccessMessage(`${serviceName} limits updated successfully`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setEditingService(null);
      await fetchUserDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateBillingStatus = async (billingId: string, status: string) => {
    try {
      await updateBillingStatus(billingId, status, '', admin!.id);
      setSuccessMessage('Billing status updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      await fetchUserDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getServiceUsage = (serviceName: string) => {
    const serviceUsage = usage.find(u => u.service_name === serviceName);
    return serviceUsage ? serviceUsage.total_usage : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">User not found</div>
      </div>
    );
  }

  const handleAddCredits = async () => {
    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/admin/wallet/add-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: parseFloat(creditAmount),
          description: creditDescription,
          adminId: admin!.id
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Successfully added $${creditAmount} to user wallet`);
        // Refresh user data
        fetchUserDetails();
        setCreditAmount('');
        setCreditDescription('');
      }
    } catch (error) {
      console.error('Error adding credits:', error);
    }
  };

  // In the JSX:
  <div className="bg-white rounded-lg shadow p-6 mb-6">
    <h3 className="text-lg font-semibold mb-4">Wallet Management</h3>
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Current Balance</label>
      <div className="text-3xl font-bold text-emerald-600">
        ${user.wallet_balance || '0.00'}
      </div>
    </div>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Add Credits</label>
        <input
          type="number"
          step="0.01"
          value={creditAmount}
          onChange={(e) => setCreditAmount(e.target.value)}
          placeholder="Amount ($)"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <input
          type="text"
          value={creditDescription}
          onChange={(e) => setCreditDescription(e.target.value)}
          placeholder="Reason for credit adjustment"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <button
        onClick={handleAddCredits}
        className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
      >
        Add Credits
      </button>
    </div>
  </div>
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="text-blue-400 hover:text-blue-300 mb-2 flex items-center gap-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-white">User Details</h1>
              <p className="text-gray-400 text-sm">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
            <p className="text-green-400">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* User Info Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">User ID</p>
              <p className="text-white font-medium font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Joined</p>
              <p className="text-white font-medium">{formatDate(user.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Service Limits */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Service Limits & Usage</h2>
          <div className="space-y-6">
            {['elevenlabs', 'gemini', 'deepgram'].map((serviceName) => {
              const limit = limits[serviceName] || {};
              const currentUsage = getServiceUsage(serviceName);
              const isEditing = editingService === serviceName;

              return (
                <div key={serviceName} className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white capitalize mb-1">{serviceName}</h3>
                      <p className="text-gray-400 text-sm">Current Usage (This Month): {formatNumber(currentUsage)}</p>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => handleEditService(serviceName)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                      >
                        Edit Limits
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Monthly Limit (leave empty for unlimited)
                          </label>
                          <input
                            type="number"
                            value={limitForm.monthlyLimit}
                            onChange={(e) => setLimitForm({ ...limitForm, monthlyLimit: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 10000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Daily Limit (leave empty for unlimited)
                          </label>
                          <input
                            type="number"
                            value={limitForm.dailyLimit}
                            onChange={(e) => setLimitForm({ ...limitForm, dailyLimit: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 1000"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`enabled-${serviceName}`}
                          checked={limitForm.isEnabled}
                          onChange={(e) => setLimitForm({ ...limitForm, isEnabled: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-500 bg-gray-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor={`enabled-${serviceName}`} className="text-sm text-gray-300">
                          Limit enforcement enabled
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveLimit(serviceName)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingService(null)}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Monthly Limit</p>
                        <p className="text-white font-medium">
                          {limit.monthly_limit ? formatNumber(limit.monthly_limit) : 'Unlimited'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Daily Limit</p>
                        <p className="text-white font-medium">
                          {limit.daily_limit ? formatNumber(limit.daily_limit) : 'Unlimited'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Status</p>
                        <p className={`font-medium ${limit.is_enabled !== false ? 'text-green-400' : 'text-red-400'}`}>
                          {limit.is_enabled !== false ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Billing History</h2>
          </div>

          {billing.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No billing records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">ElevenLabs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gemini</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Deepgram</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Platform Fee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {billing.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {formatDate(bill.billing_period_start)} - {formatDate(bill.billing_period_end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(bill.elevenlabs_usage)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(bill.gemini_usage)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(bill.deepgram_usage)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(bill.platform_fee)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        {formatCurrency(bill.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${bill.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                          bill.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            bill.status === 'overdue' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                          }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {bill.status === 'pending' && (
                          <select
                            onChange={(e) => handleUpdateBillingStatus(bill.id, e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                            defaultValue=""
                          >
                            <option value="" disabled>Update status...</option>
                            <option value="paid">Mark as Paid</option>
                            <option value="overdue">Mark as Overdue</option>
                            <option value="cancelled">Cancel</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetailPage;
