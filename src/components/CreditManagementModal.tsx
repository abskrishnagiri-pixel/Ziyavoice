import React, { useState, useEffect } from 'react';
import { addCredits } from '../utils/adminApi';

interface CreditManagementModalProps {
    userId: string;
    userEmail: string;
    currentBalance: number;
    onClose: () => void;
    onSuccess: () => void;
}

const CreditManagementModal: React.FC<CreditManagementModalProps> = ({
    userId,
    userEmail,
    currentBalance,
    onClose,
    onSuccess
}) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount greater than 0');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const admin = JSON.parse(localStorage.getItem('admin') || '{}');
            await addCredits(userId, amountNum, description || 'Admin credit adjustment', admin.id);

            setSuccess(`Successfully added $${amountNum.toFixed(2)} to ${userEmail}`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to add credits');
        } finally {
            setLoading(false);
        }
    };

    // Quick amount buttons
    const quickAmounts = [5, 10, 25, 50, 100];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Add Credits</h2>
                        <p className="text-gray-400 text-sm">{userEmail}</p>
                        <p className="text-emerald-400 text-sm mt-1">
                            Current Balance: ${currentBalance.toFixed(4)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Error/Success Messages */}
                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-500 rounded-lg text-emerald-300 text-sm">
                        {success}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Quick Amount Buttons */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Quick Add
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {quickAmounts.map((quickAmount) => (
                                <button
                                    key={quickAmount}
                                    type="button"
                                    onClick={() => setAmount(quickAmount.toString())}
                                    className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${amount === quickAmount.toString()
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    ${quickAmount}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Amount */}
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                            Amount (USD)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                $
                            </span>
                            <input
                                type="number"
                                id="amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                step="0.01"
                                min="0.01"
                                required
                                className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            placeholder="e.g., Monthly credit package"
                        />
                    </div>

                    {/* Preview */}
                    {amount && parseFloat(amount) > 0 && (
                        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-400">Current Balance:</span>
                                <span className="text-white font-semibold">${currentBalance.toFixed(4)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-gray-400">Adding:</span>
                                <span className="text-emerald-400 font-semibold">+${parseFloat(amount).toFixed(2)}</span>
                            </div>
                            <div className="border-t border-gray-600 my-2"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-300 font-medium">New Balance:</span>
                                <span className="text-emerald-400 font-bold text-lg">
                                    ${(currentBalance + parseFloat(amount)).toFixed(4)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount || parseFloat(amount) <= 0}
                            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add Credits
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreditManagementModal;
