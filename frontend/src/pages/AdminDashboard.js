import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { queueAPI, analyticsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { connectSocket, joinQueueRoom, leaveQueueRoom, getSocket } from '../services/socket';
import QueueMemberList from '../components/QueueMemberList';
import RejectedList from '../components/RejectedList';
import AnalyticsPanel from '../components/AnalyticsPanel';
import QRCodeDisplay from '../components/QRCodeDisplay';
import QueueCreator from '../components/QueueCreator';

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
  const [queueStarted, setQueueStarted] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(null);
  const [showSubQR, setShowSubQR] = useState(null);

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
      console.error('Failed to fetch completed');
    }
  }, [selectedType]);

  const fetchRejected = useCallback(async () => {
    if (!selectedType) return;
    try {
      const response = await queueAPI.getRejectedMembers(selectedType.id);
      setRejectedMembers(response.data.members);
    } catch (err) {
      console.error('Failed to fetch rejected');
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
      connectSocket();
      joinQueueRoom(selectedQueue.id);
      fetchMembers();

      const socket = getSocket();
      if (socket) {
        const handleUpdate = () => { fetchMembers(); };
        const handleCompletedUpdate = () => { fetchMembers(); fetchCompleted(); };
        const handleRejectedUpdate = () => { fetchMembers(); fetchRejected(); };
        const handleQueueStatus = (data) => {
          if (data.queueId === selectedQueue.id || data.queue?.id === selectedQueue.id) {
            fetchQueues();
          }
        };

        socket.on('token:generated', handleUpdate);
        socket.on('token:called', handleUpdate);
        socket.on('token:skipped', handleRejectedUpdate);
        socket.on('token:completed', handleCompletedUpdate);
        socket.on('token:removed', handleRejectedUpdate);
        socket.on('token:undone', handleUpdate);
        socket.on('token:left', handleUpdate);
        socket.on('queue:breakStarted', handleQueueStatus);
        socket.on('queue:breakEnded', handleQueueStatus);
        socket.on('queue:closed', handleQueueStatus);
        socket.on('queue:statusChanged', handleQueueStatus);

        return () => {
          leaveQueueRoom(selectedQueue.id);
          socket.off('token:generated', handleUpdate);
          socket.off('token:called', handleUpdate);
          socket.off('token:skipped', handleRejectedUpdate);
          socket.off('token:completed', handleCompletedUpdate);
          socket.off('token:removed', handleRejectedUpdate);
          socket.off('token:undone', handleUpdate);
          socket.off('token:left', handleUpdate);
          socket.off('queue:breakStarted', handleQueueStatus);
          socket.off('queue:breakEnded', handleQueueStatus);
          socket.off('queue:closed', handleQueueStatus);
          socket.off('queue:statusChanged', handleQueueStatus);
        };
      }
    }
  }, [selectedQueue, fetchMembers, fetchCompleted, fetchRejected, fetchQueues]);

  useEffect(() => {
    if (activeTab === 'completed') fetchCompleted();
    if (activeTab === 'rejected') fetchRejected();
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, fetchCompleted, fetchRejected, fetchAnalytics]);

  useEffect(() => {
    if (selectedQueue && selectedQueue.types && selectedQueue.types.length > 0 && !selectedType) {
      setSelectedType(selectedQueue.types[0]);
    }
  }, [selectedQueue, selectedType]);

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
      const member = members.find(m => m.id === memberId);
      if (member && member.status === 'WAITING') {
        await queueAPI.serveToken(selectedType.id, memberId);
      }
      await queueAPI.completeToken(selectedType.id, memberId);
      fetchMembers();
      fetchCompleted();
    } catch (err) {
      console.error('Failed to complete token');
    }
  };

  const handleUndoServe = async (memberId) => {
    try {
      await queueAPI.undoServe(selectedType.id, memberId);
      fetchMembers();
      fetchCompleted();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to undo');
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
    try {
      await queueAPI.removeToken(selectedType.id, memberId);
      fetchMembers();
      fetchRejected();
    } catch (err) {
      console.error('Failed to remove member');
    }
  };

  const handleStartBreak = async () => {
    try {
      await queueAPI.startBreak(selectedQueue.id, { durationMinutes: breakDuration });
      setShowBreakModal(false);
      fetchQueues();
    } catch (err) {
      console.error('Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    try {
      await queueAPI.endBreak(selectedQueue.id);
      fetchQueues();
    } catch (err) {
      console.error('Failed to end break');
    }
  };

  const handleEndQueue = async () => {
    if (window.confirm('End this queue? New users will no longer be able to join.')) {
      try {
        await queueAPI.endQueue(selectedQueue.id);
        fetchQueues();
        setSelectedQueue(null);
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

  const servingCount = members.filter(m => m.status === 'SERVING').length;
  const waitingCount = members.filter(m => m.status === 'WAITING').length;
  const currentServing = members.find(m => m.status === 'SERVING');
  const queueStatus = selectedQueue?.status || 'OPEN';

  const getWaitingMembers = () => members.filter(m => m.status === 'WAITING');
  const getServingMembers = () => members.filter(m => m.status === 'SERVING');
  const getSkippedMembers = () => rejectedMembers.filter(m => m.status === 'SKIPPED');
  const getRemovedMembers = () => rejectedMembers.filter(m => m.status === 'REMOVED');

  const getStatusConfig = () => {
    switch (queueStatus) {
      case 'OPEN': return { label: 'OPEN', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' };
      case 'BREAK': return { label: 'ON BREAK', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' };
      case 'CLOSED': return { label: 'CLOSED', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
      case 'FULL': return { label: 'FULL', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
      default: return { label: queueStatus, color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' };
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

  if (!selectedQueue) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Smart Queue Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">Logout</button>
            </div>
          </div>
        </nav>
        <div className="p-4">
          <QueueCreator onQueueCreated={handleQueueCreated} onSelectQueue={setSelectedQueue} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Smart Queue Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">Logout</button>
          </div>
        </div>
      </nav>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black opacity-50" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative w-64 bg-white h-full shadow-lg overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Menu</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="p-4 space-y-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">Your Organisations</div>
              {queues.map((q) => (
                <button key={q.id} onClick={() => { setSelectedQueue(q); setSelectedType(null); setActiveTab('queue'); setSidebarOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedQueue?.id === q.id ? 'bg-gray-900 text-white font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <div className="truncate">{q.name}</div>
                  <div className={`text-xs mt-0.5 ${selectedQueue?.id === q.id ? 'text-gray-300' : 'text-gray-500'}`}>{q.public_code} · {q.status}</div>
                </button>
              ))}
              {queues.length === 0 && <div className="text-sm text-gray-500 px-3 py-2">No organisations yet</div>}
              <hr className="my-3" />
              {selectedQueue && (
                <>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">Actions</div>
                  {tabs.map((tab) => (
                    <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeTab === tab.id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'}`}>{tab.label}</button>
                  ))}
                  <button onClick={() => { setShowAddSubQueue(true); setSidebarOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50">+ Add Sub-queue</button>
                  <button onClick={() => { setShowQR(true); setSidebarOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50">View QR Code</button>
                  <button onClick={() => { setShowBreakModal(true); setSidebarOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Break</button>
                  {selectedQueue.status === 'BREAK' && <button onClick={() => { handleEndBreak(); setSidebarOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-green-600 hover:bg-green-50">End Break</button>}
                  <button onClick={() => { handleEndQueue(); setSidebarOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">End Queue</button>
                </>
              )}
              <hr className="my-3" />
              <button onClick={() => { setSelectedQueue(null); setSidebarOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50">+ Create New Organisation</button>
              <button onClick={() => { navigate('/'); setSidebarOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50">Home</button>
            </nav>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="mb-4">
          <button onClick={() => setSelectedQueue(null)} className="text-gray-600 hover:text-gray-900 text-sm mb-2">← Back</button>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xl font-semibold text-gray-900">{selectedQueue.name}</h2>
            {(() => { const s = getStatusConfig(); return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}><span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.dot}`}></span>{s.label}</span>; })()}
          </div>
          {selectedType && (
            <div className="text-sm text-gray-600 mb-3">{selectedType.name}</div>
          )}
        </div>

        {!queueStarted && activeTab === 'queue' && selectedType && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Queue not started yet</h3>
              <p className="text-xs text-gray-500">Click Start Queue to begin serving and enable prediction times</p>
            </div>
            <button onClick={() => setQueueStarted(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap">
              Start Queue
            </button>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {selectedQueue.types?.map((type) => (
            <div key={type.id} className="flex items-center gap-1">
              <button onClick={() => { setSelectedType(type); setActiveTab('queue'); }}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${selectedType?.id === type.id ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{type.name}</button>
              <button onClick={() => setShowSubQR(type)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700" title="QR Code & Link">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              </button>
            </div>
          ))}
        </div>

        {activeTab === 'queue' && selectedType && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <button onClick={() => setShowCounterModal('waiting')} className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <div className="text-xs text-gray-500 mb-1">Waiting</div>
                <div className="text-xl font-bold text-gray-900">{waitingCount}</div>
              </button>
              <button onClick={() => setShowCounterModal('serving')} className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <div className="text-xs text-gray-500 mb-1">Serving</div>
                <div className="text-xl font-bold text-blue-600">{servingCount}</div>
              </button>
              <button onClick={() => setShowCounterModal('served')} className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <div className="text-xs text-gray-500 mb-1">Served Today</div>
                <div className="text-xl font-bold text-green-600">{completedMembers.length || '-'}</div>
              </button>
              <button onClick={() => setShowCounterModal('skipped')} className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <div className="text-xs text-gray-500 mb-1">Skipped</div>
                <div className="text-xl font-bold text-orange-600">{rejectedMembers.filter(m => m.status === 'SKIPPED').length || '-'}</div>
              </button>
              <button onClick={() => setShowCounterModal('removed')} className="bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-gray-400 transition-colors cursor-pointer">
                <div className="text-xs text-gray-500 mb-1">Removed</div>
                <div className="text-xl font-bold text-red-600">{rejectedMembers.filter(m => m.status === 'REMOVED').length || '-'}</div>
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Token</div>
              {currentServing ? (
                <div className="text-2xl font-bold text-gray-900">#{currentServing.token_number}</div>
              ) : (
                <div className="text-sm text-gray-500">-</div>
              )}
            </div>

            <QueueMemberList
              members={members}
              onServe={handleServe}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onRemove={handleRemove}
              disabled={!queueStarted}
            />
          </>
        )}

        {activeTab === 'queue' && !selectedType && (
          <div className="text-center py-8 text-gray-500">Select a sub-queue to view members</div>
        )}

        {activeTab === 'completed' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Served Members</h3>
            </div>
            {completedMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No served members yet</div>
            ) : (
              <div className="space-y-2">
                {completedMembers.map((m) => (
                  <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{m.name || 'Anonymous'} <span className="text-gray-400">#{m.token_number}</span></div>
                        <div className="text-xs text-gray-500">{m.email || m.phone || '-'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600">Served</span>
                      <button onClick={() => handleUndoServe(m.id)}
                        className="text-xs text-orange-600 hover:text-orange-800 border border-orange-200 px-2 py-1 rounded hover:bg-orange-50 transition-colors">
                        Undo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'rejected' && <RejectedList members={rejectedMembers} />}
        {activeTab === 'analytics' && <AnalyticsPanel analytics={analytics} />}
      </div>

      {showCounterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {showCounterModal === 'waiting' && `Waiting (${waitingCount})`}
                {showCounterModal === 'serving' && `Serving (${servingCount})`}
                {showCounterModal === 'served' && `Served Today (${completedMembers.length})`}
                {showCounterModal === 'skipped' && `Skipped (${getSkippedMembers().length})`}
                {showCounterModal === 'removed' && `Removed (${getRemovedMembers().length})`}
              </h3>
              <button onClick={() => setShowCounterModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-2">
              {showCounterModal === 'waiting' && getWaitingMembers().map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-700">{m.token_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{m.name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500 truncate">{m.email || m.phone || '-'}</div>
                  </div>
                </div>
              ))}
              {showCounterModal === 'serving' && getServingMembers().map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">{m.token_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{m.name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500 truncate">{m.email || m.phone || '-'}</div>
                  </div>
                </div>
              ))}
              {showCounterModal === 'served' && completedMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                  <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-700">{m.token_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{m.name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500 truncate">{m.email || m.phone || '-'}</div>
                  </div>
                </div>
              ))}
              {showCounterModal === 'skipped' && getSkippedMembers().map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 bg-orange-50 rounded-lg">
                  <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center text-xs font-medium text-orange-700">{m.token_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{m.name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500 truncate">{m.email || m.phone || '-'}</div>
                  </div>
                </div>
              ))}
              {showCounterModal === 'removed' && getRemovedMembers().map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                  <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-xs font-medium text-red-700">{m.token_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{m.name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-500 truncate">{m.email || m.phone || '-'}</div>
                  </div>
                </div>
              ))}
              {((showCounterModal === 'waiting' && getWaitingMembers().length === 0) ||
                (showCounterModal === 'serving' && getServingMembers().length === 0) ||
                (showCounterModal === 'served' && completedMembers.length === 0) ||
                (showCounterModal === 'skipped' && getSkippedMembers().length === 0) ||
                (showCounterModal === 'removed' && getRemovedMembers().length === 0)) && (
                <div className="text-center py-4 text-gray-500 text-sm">No members</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showBreakModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start Break</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" value={breakDuration} onChange={(e) => setBreakDuration(parseInt(e.target.value))} min={1} max={60}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowBreakModal(false)} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleStartBreak} className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Start Break</button>
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
              <input type="text" value={newSubQueueName} onChange={(e) => setNewSubQueueName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubQueue()}
                placeholder="e.g., OPD, Lab, Billing" autoFocus className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowAddSubQueue(false); setNewSubQueueName(''); }} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddSubQueue} disabled={!newSubQueueName.trim() || addingSubQueue} className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">{addingSubQueue ? 'Adding...' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {showQR && selectedQueue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <QRCodeDisplay queue={selectedQueue} onComplete={() => setShowQR(false)} />
          </div>
        </div>
      )}

      {showSubQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{showSubQR.name}</h3>
              <button onClick={() => setShowSubQR(null)} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/join-sub/${showSubQR.public_code}`}
                alt={`QR for ${showSubQR.name}`}
                className="w-48 h-48"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-xs text-gray-500 mb-1">Join Link</div>
              <div className="text-sm text-gray-900 break-all font-mono">{window.location.origin}/join-sub/{showSubQR.public_code}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-xs text-gray-500 mb-1">Code</div>
              <div className="text-lg font-bold text-gray-900 font-mono">{showSubQR.public_code}</div>
            </div>
            <button onClick={() => {
              navigator.clipboard?.writeText(`${window.location.origin}/join-sub/${showSubQR.public_code}`);
              alert('Link copied!');
            }} className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Copy Link</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
