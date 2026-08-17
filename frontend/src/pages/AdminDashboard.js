import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { queueAPI, analyticsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { joinQueueRoom, leaveQueueRoom, getSocket } from '../services/socket';
import QueueCreator from '../components/QueueCreator';
import QueueMemberList from '../components/QueueMemberList';
import CompletedList from '../components/CompletedList';
import RejectedList from '../components/RejectedList';
import AnalyticsPanel from '../components/AnalyticsPanel';
import QRCodeDisplay from '../components/QRCodeDisplay';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(location.state?.queue || null);
  const [selectedType, setSelectedType] = useState(null);
  const [members, setMembers] = useState([]);
  const [completedMembers, setCompletedMembers] = useState([]);
  const [rejectedMembers, setRejectedMembers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('queue');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakDuration, setBreakDuration] = useState(15);
  const [showQR, setShowQR] = useState(false);
  const [showAddSubQueue, setShowAddSubQueue] = useState(false);
  const [newSubQueueName, setNewSubQueueName] = useState('');
  const [addingSubQueue, setAddingSubQueue] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchQueues = useCallback(async () => {
    try {
      const response = await queueAPI.getAdminQueues();
      setQueues(response.data.queues);
    } catch (err) {
      console.error('Failed to fetch queues');
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!selectedType) return;
    try {
      const response = await queueAPI.getMembersByType(selectedType.id);
      setMembers(response.data.members || []);
    } catch (err) {
      console.error('Failed to fetch members');
    }
  }, [selectedType]);

  const fetchCompleted = useCallback(async () => {
    if (!selectedType) return;
    try {
      const response = await queueAPI.getCompletedMembers(selectedType.id);
      setCompletedMembers(response.data.members);
    } catch (err) {
      console.error('Failed to fetch completed members');
    }
  }, [selectedType]);

  const fetchRejected = useCallback(async () => {
    if (!selectedType) return;
    try {
      const response = await queueAPI.getRejectedMembers(selectedType.id);
      setRejectedMembers(response.data.members);
    } catch (err) {
      console.error('Failed to fetch rejected members');
    }
  }, [selectedType]);

  const fetchAnalytics = useCallback(async () => {
    if (!selectedType) return;
    try {
      const response = await analyticsAPI.getQueueAnalytics(selectedType.id);
      setAnalytics(response.data.analytics);
    } catch (err) {
      console.error('Failed to fetch analytics');
    }
  }, [selectedType]);

  useEffect(() => {
    fetchQueues().then(() => setLoading(false));
  }, [fetchQueues]);

  useEffect(() => {
    if (selectedQueue) {
      joinQueueRoom(selectedQueue.id);
      fetchMembers();

      const socket = getSocket();
      if (socket) {
        const handleUpdate = () => fetchMembers();
        const handleCompletedUpdate = () => { fetchMembers(); fetchCompleted(); };
        const handleRejectedUpdate = () => { fetchMembers(); fetchRejected(); };

        socket.on('token:generated', handleUpdate);
        socket.on('token:called', handleUpdate);
        socket.on('token:skipped', handleRejectedUpdate);
        socket.on('token:completed', handleCompletedUpdate);
        socket.on('token:removed', handleRejectedUpdate);
        socket.on('token:left', handleUpdate);
        socket.on('queue:breakStarted', () => {});
        socket.on('queue:breakEnded', () => {});
        socket.on('queue:closed', () => {});

        return () => {
          leaveQueueRoom(selectedQueue.id);
          socket.off('token:generated', handleUpdate);
          socket.off('token:called', handleUpdate);
          socket.off('token:skipped', handleRejectedUpdate);
          socket.off('token:completed', handleCompletedUpdate);
          socket.off('token:removed', handleRejectedUpdate);
          socket.off('token:left', handleUpdate);
          socket.off('queue:breakStarted');
          socket.off('queue:breakEnded');
          socket.off('queue:closed');
        };
      }
    }
  }, [selectedQueue, fetchMembers, fetchCompleted, fetchRejected]);

  useEffect(() => {
    if (activeTab === 'completed') fetchCompleted();
    if (activeTab === 'rejected') fetchRejected();
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, fetchCompleted, fetchRejected, fetchAnalytics]);

  const handleServe = async (memberId) => {
    try {
      await queueAPI.serveToken(selectedType.id, memberId);
      fetchMembers();
    } catch (err) {
      console.error('Failed to serve token');
    }
  };

  const handleComplete = async (memberId) => {
    try {
      await queueAPI.completeToken(selectedType.id, memberId);
      fetchMembers();
      fetchCompleted();
    } catch (err) {
      console.error('Failed to complete token');
    }
  };

  const handleSkip = async (memberId) => {
    try {
      await queueAPI.skipToken(selectedType.id, memberId);
      fetchMembers();
      fetchRejected();
    } catch (err) {
      console.error('Failed to skip token');
    }
  };

  const handleRemove = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await queueAPI.removeToken(selectedType.id, memberId);
        fetchMembers();
        fetchRejected();
      } catch (err) {
        console.error('Failed to remove token');
      }
    }
  };

  const handleStartBreak = async () => {
    try {
      await queueAPI.startBreak(selectedQueue.id, { durationMinutes: breakDuration });
      setShowBreakModal(false);
    } catch (err) {
      console.error('Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    try {
      await queueAPI.endBreak(selectedQueue.id);
    } catch (err) {
      console.error('Failed to end break');
    }
  };

  const handleEndQueue = async () => {
    if (window.confirm('Are you sure you want to end this queue? New users will no longer be able to join.')) {
      try {
        await queueAPI.endQueue(selectedQueue.id);
        setSelectedQueue(null);
        fetchQueues();
      } catch (err) {
        console.error('Failed to end queue');
      }
    }
  };

  const handleQueueCreated = (newQueue) => {
    setQueues([{ ...newQueue, adminCode: newQueue.adminCode }, ...queues]);
  };

  const handleAddSubQueue = async () => {
    if (!newSubQueueName.trim() || !selectedQueue) return;
    setAddingSubQueue(true);
    try {
      const response = await queueAPI.addSubQueue(selectedQueue.id, { name: newSubQueueName.trim() });
      const newType = response.data.queueType;
      const updatedTypes = [...(selectedQueue.types || []), newType];
      setSelectedQueue({ ...selectedQueue, types: updatedTypes });
      setQueues(queues.map(q => q.id === selectedQueue.id ? { ...q, types: updatedTypes } : q));
      setNewSubQueueName('');
      setShowAddSubQueue(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add sub-queue');
    } finally {
      setAddingSubQueue(false);
    }
  };

  const tabs = [
    { id: 'queue', label: 'Dashboard' },
    { id: 'completed', label: 'Done' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'analytics', label: 'Analytics' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Smart Queue Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative w-64 bg-white h-full shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Menu</h2>
            </div>
            <nav className="p-4 space-y-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">Your Queues</div>
              {queues.map((q) => (
                <button
                  key={q.id}
                  onClick={() => { setSelectedQueue(q); setSelectedType(null); setActiveTab('queue'); setSidebarOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    selectedQueue?.id === q.id ? 'bg-gray-900 text-white font-medium' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="truncate">{q.name}</div>
                  <div className={`text-xs mt-0.5 ${selectedQueue?.id === q.id ? 'text-gray-300' : 'text-gray-500'}`}>
                    {q.public_code} · {q.status}
                  </div>
                </button>
              ))}
              {queues.length === 0 && (
                <div className="text-sm text-gray-500 px-3 py-2">No queues yet</div>
              )}

              <hr className="my-3" />

              {selectedQueue && (
                <>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">Actions</div>
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                        activeTab === tab.id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <button
                    onClick={() => { setShowAddSubQueue(true); setSidebarOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    + Add Sub-queue
                  </button>
                  <button
                    onClick={() => { setShowQR(true); setSidebarOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    View QR Code
                  </button>
                  <button
                    onClick={() => { setShowBreakModal(true); setSidebarOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Break
                  </button>
                  {selectedQueue.status === 'BREAK' && (
                    <button
                      onClick={() => { handleEndBreak(); setSidebarOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-green-600 hover:bg-green-50"
                    >
                      End Break
                    </button>
                  )}
                  <button
                    onClick={() => { handleEndQueue(); setSidebarOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
                  >
                    End Queue
                  </button>
                </>
              )}

              <hr className="my-3" />
              <button
                onClick={() => { setSelectedQueue(null); setSidebarOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                + Create New Queue
              </button>
              <button
                onClick={() => { navigate('/'); setSidebarOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Home
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className="p-4">
        {!selectedQueue ? (
          <QueueCreator onQueueCreated={handleQueueCreated} onSelectQueue={setSelectedQueue} />
        ) : (
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setSelectedQueue(null)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>
                <h2 className="text-xl font-semibold text-gray-900">{selectedQueue.name}</h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedQueue.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                  selectedQueue.status === 'BREAK' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedQueue.status}
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedType(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                    !selectedType ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All
                </button>
                {selectedQueue.types?.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                      selectedType?.id === type.id ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'queue' && selectedType && (
              <QueueMemberList
                members={members}
                onServe={handleServe}
                onComplete={handleComplete}
                onSkip={handleSkip}
                onRemove={handleRemove}
              />
            )}

            {activeTab === 'queue' && !selectedType && (
              <div className="text-center py-8 text-gray-500">
                Select a sub-queue to view members
              </div>
            )}

            {activeTab === 'completed' && <CompletedList members={completedMembers} />}
            {activeTab === 'rejected' && <RejectedList members={rejectedMembers} />}
            {activeTab === 'analytics' && <AnalyticsPanel analytics={analytics} />}
          </div>
        )}
      </div>

      {showBreakModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start Break</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={breakDuration}
                onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                min={1}
                max={60}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBreakModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartBreak}
                className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Start Break
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddSubQueue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Sub-queue</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
              <input
                type="text"
                value={newSubQueueName}
                onChange={(e) => setNewSubQueueName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubQueue()}
                placeholder="e.g., OPD, Lab, Billing"
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowAddSubQueue(false); setNewSubQueueName(''); }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubQueue}
                disabled={!newSubQueueName.trim() || addingSubQueue}
                className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {addingSubQueue ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQR && selectedQueue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <QRCodeDisplay
              queue={{
                publicCode: selectedQueue.public_code,
                adminCode: selectedQueue.adminCode || 'N/A',
                joinUrl: `${window.location.origin}/join/${selectedQueue.public_code}`,
              }}
              onComplete={() => setShowQR(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
