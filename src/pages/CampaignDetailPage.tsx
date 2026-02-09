import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Campaign, CampaignRecord, CampaignStatus, PhoneNumber } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { parseCSV } from '../utils/csvParser';
import * as campaignApi from '../utils/api';
import { phoneNumberService } from '../services/phoneNumberService';

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<any | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCallerPhoneModalOpen, setIsCallerPhoneModalOpen] = useState(false);
  const [callerPhone, setCallerPhone] = useState('');
  const [newRecordPhone, setNewRecordPhone] = useState('');
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [availablePhoneNumbers, setAvailablePhoneNumbers] = useState<PhoneNumber[]>([]);
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState('');

  const recordsPerPage = 10;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!id || !user?.id) throw new Error('Missing ID');

        // Fetch Campaign
        const result = await campaignApi.fetchCampaign(id, user.id);
        if (result.success) {
          setCampaign(result.data.campaign);
          setRecords(result.data.records || []);
          setTotalRecords(result.data.records?.length || 0);

          // Set initial state
          if (result.data.campaign.phone_number_id) {
            setSelectedPhoneNumberId(result.data.campaign.phone_number_id);
          }
          setCallerPhone(result.data.campaign.callerPhone || '');
          setIncludeMetadata(result.data.campaign.includeMetadata ?? true);
        }

        // Fetch Phone Numbers
        const phones = await phoneNumberService.getPhoneNumbers(user.id);
        // Filter numbers that have agents
        const numbersWithAgents = phones.filter((p: any) => p.agent_id || p.agentId);
        setAvailablePhoneNumbers(numbersWithAgents);

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id && user?.id) {
      fetchData();
    }
  }, [id, user?.id]);

  // Poll for updates
  useEffect(() => {
    if (!id || !user?.id) return;
    const interval = setInterval(async () => {
      try {
        const result = await campaignApi.fetchCampaign(id, user.id);
        if (result.success) {
          setCampaign(result.data.campaign);
          setRecords(result.data.records || []);
        }
      } catch (e) {
        console.error('Silent refresh failed', e);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id, user?.id]);

  const handleSetCallerPhone = async () => {
    try {
      const selectedPhone = availablePhoneNumbers.find(p => p.id === selectedPhoneNumberId);
      if (!selectedPhone) {
        alert('Please select a phone number');
        return;
      }

      const agentId = selectedPhone.agentId || (selectedPhone as any).agent_id;
      // We use the ID as the caller phone identifier for backend logic, 
      // but display the number. Adjust if backend expects number string.
      // Based on previous code, likely needs ID or formatted number.
      // Api.setCallerPhone usually updates the campaign with phone_number_id and agent_id

      // Custom API call if needed, or use setCallerPhone
      // Assuming setCallerPhone updates phone_number_id
      await campaignApi.setCallerPhone(id!, user!.id, selectedPhone.id, agentId);

      // Refresh
      const result = await campaignApi.fetchCampaign(id!, user!.id);
      setCampaign(result.data.campaign);
      setIsCallerPhoneModalOpen(false);
    } catch (err: any) {
      alert('Failed to set caller phone: ' + err.message);
    }
  };

  const handleStartCampaign = async () => {
    // Check if phone number is set
    if (!campaign.phone_number_id) {
      alert('Please set a caller phone number before starting the campaign. Click "Set Caller Phone" button.');
      setIsCallerPhoneModalOpen(true);
      return;
    }

    if (!window.confirm('Start campaign? Calls will be made to all pending contacts.')) return;

    try {
      await campaignApi.startCampaign(id!, user!.id);

      // Refresh campaign data immediately
      const result = await campaignApi.fetchCampaign(id!, user!.id);
      if (result.success) {
        setCampaign(result.data.campaign);
        setRecords(result.data.records || []);
      }

      alert('Campaign started successfully! Calls are being made.');
    } catch (err: any) {
      console.error('Failed to start campaign:', err);
      alert('Failed to start campaign: ' + err.message);
    }
  };

  const handleStopCampaign = async () => {
    if (!window.confirm('Stop campaign? This will pause all pending calls.')) return;

    try {
      await campaignApi.stopCampaign(id!, user!.id);

      // Refresh campaign data immediately
      const result = await campaignApi.fetchCampaign(id!, user!.id);
      if (result.success) {
        setCampaign(result.data.campaign);
        setRecords(result.data.records || []);
      }

      alert('Campaign stopped successfully.');
    } catch (err: any) {
      console.error('Failed to stop campaign:', err);
      alert('Failed to stop campaign: ' + err.message);
    }
  };

  const handleRestartCampaign = async () => {
    if (!window.confirm('Restart campaign? This will resume making calls to pending contacts.')) return;

    try {
      await campaignApi.startCampaign(id!, user!.id);

      // Refresh campaign data immediately
      const result = await campaignApi.fetchCampaign(id!, user!.id);
      if (result.success) {
        setCampaign(result.data.campaign);
        setRecords(result.data.records || []);
      }

      alert('Campaign restarted successfully! Calls are being made.');
    } catch (err: any) {
      console.error('Failed to restart campaign:', err);
      alert('Failed to restart campaign: ' + err.message);
    }
  };

  // ... Import/Add Record handlers remain similar ...
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Simple CSV parse: phone,name
      const lines = text.split('\n').filter(line => line.trim());
      const data = lines.map(line => {
        const parts = line.split(',');
        return { phone_number: parts[0].trim(), name: parts[1]?.trim() || '' };
      });

      await campaignApi.importRecords(id!, user!.id, data);
      alert('Imported ' + data.length + ' records');
      // Trigger refresh
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    }
  };

  const handleAddRecord = async () => {
    if (!newRecordPhone) return;
    try {
      await campaignApi.addRecord(id!, user!.id, newRecordPhone);
      setNewRecordPhone('');
      setIsAddRecordModalOpen(false);
    } catch (err: any) {
      alert('Add failed: ' + err.message);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      if (!id || !user?.id) {
        throw new Error('Missing campaign ID or user ID');
      }

      await campaignApi.deleteRecord(id, recordId, user.id);

      // Refresh campaign data
      const result = await campaignApi.fetchCampaign(id, user.id);
      if (result.success) {
        setRecords(result.data.records || []);
      }
    } catch (err: any) {
      console.error('Failed to delete record', err);
      alert(`Failed to delete record: ${err.message}`);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!window.confirm(`Are you sure you want to delete campaign "${campaign?.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      if (!id || !user?.id) {
        throw new Error('Missing campaign ID or user ID');
      }

      await campaignApi.deleteCampaign(id, user.id);
      alert('Campaign deleted successfully');
      navigate('/campaigns');
    } catch (err: any) {
      console.error('Failed to delete campaign', err);
      alert(`Failed to delete campaign: ${err.message}`);
    }
  };

  if (loading) return <div className="text-center p-10 text-white">Loading...</div>;
  if (!campaign) return <div className="text-center p-10 text-white">Campaign not found</div>;

  const currentPhone = availablePhoneNumbers.find(p => p.id === campaign.phone_number_id);
  const displayPhone = currentPhone ? (currentPhone.number || (currentPhone as any).phone_number) : 'Not Set';
  const displayAgent = currentPhone ? (currentPhone.agentName || (currentPhone as any).agent_name) : 'None';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button onClick={() => navigate('/campaigns')} className="mr-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white flex items-center transition-colors">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Campaigns - List
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-slide-down">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Campaign: {campaign.name}</h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => document.getElementById('csv-file-input')?.click()}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center transition shadow-sm btn-animate"
          >
            <span className="mr-2">+</span> Import
          </button>
          <input
            type="file"
            id="csv-file-input"
            accept=".csv"
            className="hidden"
            onChange={handleImportCSV}
          />

          <button
            onClick={() => setIsAddRecordModalOpen(true)}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center transition shadow-sm btn-animate"
          >
            <span className="mr-2">+</span> Add Record
          </button>

          {/* Conditional Campaign Control Buttons */}
          {campaign.status === 'running' ? (
            <button
              onClick={handleStopCampaign}
              className="px-4 py-2 rounded-lg font-medium flex items-center bg-red-500 hover:bg-red-600 text-white shadow-md transition btn-animate"
              title="Stop campaign"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Stop
            </button>
          ) : campaign.status === 'paused' ? (
            <button
              onClick={handleRestartCampaign}
              className="px-4 py-2 rounded-lg font-medium flex items-center bg-blue-500 hover:bg-blue-600 text-white shadow-md transition btn-animate"
              title="Restart campaign"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restart
            </button>
          ) : (
            <button
              onClick={handleStartCampaign}
              disabled={campaign.status === 'completed'}
              className={`px-4 py-2 rounded-lg font-medium flex items-center shadow-md transition btn-animate ${campaign.status === 'completed'
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-gray-400 cursor-not-allowed shadow-none'
                : !campaign.phone_number_id
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white animate-pulse'
                  : 'bg-primary hover:bg-primary-dark text-white'
                }`}
              title={!campaign.phone_number_id ? 'Set caller phone first' : 'Start campaign'}
            >
              {!campaign.phone_number_id ? (
                <>⚠️ Set Phone First</>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start
                </>
              )}
            </button>
          )}


          <button
            onClick={handleDeleteCampaign}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-lg font-medium flex items-center transition btn-animate"
            title="Delete Campaign"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Caller Card */}
      <div className="bg-white dark:bg-darkbg-light rounded-lg p-6 mb-6 border border-slate-200 dark:border-gray-700 shadow-sm card-animate">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">CALLER</div>
            <div className="flex items-center gap-4">
              {displayPhone !== 'Not Set' ? (
                <div className="flex flex-col">
                  <span className="text-xl font-mono text-slate-800 dark:text-white">{displayPhone}</span>
                  <span className="text-sm text-slate-500 dark:text-gray-400">Agent: {displayAgent}</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsCallerPhoneModalOpen(true)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-primary text-primary rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 btn-animate"
                >
                  Set Caller Phone
                </button>
              )}
              {displayPhone !== 'Not Set' && (
                <button
                  onClick={() => setIsCallerPhoneModalOpen(true)}
                  className="text-xs text-slate-500 dark:text-gray-400 underline hover:text-slate-700 dark:hover:text-gray-300"
                >
                  Change
                </button>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">STATUS</div>
            <span className={`px-3 py-1 rounded text-sm font-medium border ${campaign.status === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' :
              campaign.status === 'completed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' :
                'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-700'
              }`}>
              {campaign.status || 'idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center mb-8">
        <button
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeMetadata ? 'bg-primary' : 'bg-slate-300 dark:bg-gray-700'}`}
          onClick={() => setIncludeMetadata(!includeMetadata)}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeMetadata ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="ml-3 text-sm text-slate-600 dark:text-gray-300">Include extra metadata in agent prompt <a href="#" className="text-blue-500 dark:text-blue-400 hover:underline">Learn more</a></span>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-darkbg-light rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm card-animate">
        <div className="grid grid-cols-[1fr_1fr_auto] p-4 border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-sm font-medium text-slate-500 dark:text-gray-400">Phone</div>
          <div className="text-sm font-medium text-slate-500 dark:text-gray-400">Call Status</div>
          <div className="text-sm font-medium text-slate-500 dark:text-gray-400 text-right">Actions</div>
        </div>

        {records.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 dark:text-gray-500 mb-4">No campaign record found</p>
            <button
              onClick={() => setIsAddRecordModalOpen(true)}
              className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition btn-animate"
            >
              + Add Record
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-gray-800">
            {records.map((record) => (
              <div key={record.id} className="grid grid-cols-[1fr_1fr_auto] p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="font-mono text-slate-700 dark:text-gray-300">{record.phone}</div>
                <div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${record.callStatus === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900' :
                    record.callStatus === 'calling' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900' :
                      record.callStatus === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900' :
                        'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700'
                    }`}>
                    {record.callStatus || 'Pending'}
                  </span>
                  {record.callStatus === 'completed' && record.recordingUrl && (
                    <a href={record.recordingUrl} target="_blank" className="ml-3 text-xs text-blue-500 hover:underline">Recording</a>
                  )}
                </div>
                <div className="text-right">
                  <button
                    className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition"
                    onClick={() => handleDeleteRecord(record.id)}
                    title="Delete record"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isCallerPhoneModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-darkbg-light p-6 rounded-lg w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-700 card-animate">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Set Caller Phone</h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-600 dark:text-gray-400 mb-2">Select Number</label>
              <select
                value={selectedPhoneNumberId}
                onChange={(e) => setSelectedPhoneNumberId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-gray-600 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Select Number --</option>
                {availablePhoneNumbers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.number || (p as any).phone_number} ({(p as any).agent_name || (p as any).agentName || 'No Agent'})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-gray-500 mt-2">Only showing numbers with assigned agents.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsCallerPhoneModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white transition">Cancel</button>
              <button onClick={handleSetCallerPhone} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition shadow-md">Save</button>
            </div>
          </div>
        </div>
      )}

      {isAddRecordModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-darkbg-light p-6 rounded-lg w-full max-w-md shadow-2xl border border-slate-200 dark:border-gray-700 card-animate">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Add Record</h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-600 dark:text-gray-400 mb-2">Phone Number</label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-gray-600 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="+1234567890"
                value={newRecordPhone}
                onChange={(e) => setNewRecordPhone(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAddRecordModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-gray-300 hover:text-slate-800 dark:hover:text-white transition">Cancel</button>
              <button onClick={handleAddRecord} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition shadow-md">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetailPage;

