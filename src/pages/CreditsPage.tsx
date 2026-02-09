import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/api';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  service: string | null;
  description: string | null;
  createdAt: string;
  metadata?: any;
}

interface UsageStat {
  service: string;
  totalUnits: number;
  totalCost: number;
  usageCount: number;
}

interface Pricing {
  service_type: string;
  cost_per_unit: number;
  unit_type: string;
  description: string;
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

const CreditsPage: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);


  useEffect(() => {
    if (user?.id) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const apiUrl = getApiBaseUrl();

      // Fetch balance
      const balanceRes = await fetch(`${apiUrl}/api/wallet/balance/${user.id}`);
      const balanceData = await balanceRes.json();
      if (balanceData.success) {
        setBalance(balanceData.balance);
      }

      // Fetch transactions
      const txRes = await fetch(`${apiUrl}/api/wallet/transactions/${user.id}?limit=50`);
      const txData = await txRes.json();
      if (txData.success) {
        setTransactions(txData.transactions);
      }

      // Fetch usage stats
      const statsRes = await fetch(`${apiUrl}/api/wallet/usage-stats/${user.id}`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        setUsageStats(statsData.stats);
      }

      // Fetch pricing
      const pricingRes = await fetch(`${apiUrl}/api/wallet/pricing`);
      const pricingData = await pricingRes.json();
      if (pricingData.success) {
        setPricing(pricingData.pricing);
      }

      setError('');
    } catch (err: any) {
      console.error('Error fetching wallet data:', err);
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'elevenlabs':
        return '🔊';
      case 'deepgram':
        return '🎤';
      case 'gemini':
        return '🤖';
      case 'sarvam':
        return '🗣️';
      case 'twilio':
        return '📞';
      default:
        return '💰';
    }
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case 'elevenlabs':
        return 'from-blue-500 to-blue-600';
      case 'deepgram':
        return 'from-orange-500 to-orange-600';
      case 'gemini':
        return 'from-purple-500 to-purple-600';
      case 'sarvam':
        return 'from-green-500 to-green-600';
      case 'twilio':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Header title="Wallet & Usage">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Contact admin to add credits
        </div>
      </Header>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-8 shadow-xl card-animate">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-emerald-100 text-sm mb-2">Current Balance</div>
            <div className="text-5xl font-bold text-white mb-2">
              {formatCurrency(balance)}
            </div>
            <div className="text-emerald-100 text-sm">
              Available for API usage
            </div>
          </div>
          <div className="text-6xl opacity-20">💰</div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="card-animate" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
          Usage by Service
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {usageStats.length > 0 ? (
            usageStats.map((stat, index) => (
              <div
                key={stat.service}
                className="bg-white dark:bg-darkbg-light rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                style={{ animationDelay: `${0.15 + index * 0.05}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium capitalize text-slate-800 dark:text-white">
                    {stat.service}
                  </h3>
                  <div className={`text-3xl w-12 h-12 rounded-full bg-gradient-to-br ${getServiceColor(stat.service)} flex items-center justify-center`}>
                    {getServiceIcon(stat.service)}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Spent</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(stat.totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Usage Count</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {stat.usageCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Units</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {stat.totalUnits.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-12 text-slate-500 dark:text-slate-400">
              No usage data yet. Start making calls to see your usage statistics.
            </div>
          )}
        </div>
      </div>

      {/* Pricing Information */}
      <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-6 card-animate" style={{ animationDelay: '0.3s' }}>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
          Service Pricing
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Cost Per Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Unit Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {pricing.map((p) => (
                <tr key={p.service_type} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="mr-2">{getServiceIcon(p.service_type)}</span>
                      <span className="capitalize font-medium text-slate-900 dark:text-white">
                        {p.service_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {formatCurrency(p.cost_per_unit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize text-slate-600 dark:text-slate-400">
                    {p.unit_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {p.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-6 card-animate" style={{ animationDelay: '0.4s' }}>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
          Transaction History
        </h2>
        <div className="overflow-x-auto">
          {transactions.length > 0 ? (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Balance After
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${tx.type === 'credit'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {tx.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm capitalize text-slate-700 dark:text-slate-300">
                      {tx.service ? (
                        <span className="flex items-center">
                          <span className="mr-2">{getServiceIcon(tx.service)}</span>
                          {tx.service}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap font-semibold ${tx.type === 'credit'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                      }`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                      {formatCurrency(tx.balanceAfter)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {tx.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No transactions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditsPage;