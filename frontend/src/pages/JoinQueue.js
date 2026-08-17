import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { queueAPI } from '../services/api';
import { connectSocket, joinQueueRoom, leaveQueueRoom, getSocket } from '../services/socket';

const STEPS = {
  LOADING: 'LOADING',
  LANDING: 'LANDING',
  STATS: 'STATS',
  FORM: 'FORM',
  JOINING: 'JOINING',
  TOKEN: 'TOKEN',
  ERROR: 'ERROR',
};

const JoinQueue = () => {
  const { publicCode, subCode } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.LOADING);
  const [queue, setQueue] = useState(null);
  const [subQueues, setSubQueues] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [member, setMember] = useState(null);
  const [skipModal, setSkipModal] = useState(false);
  const [skipPosition, setSkipPosition] = useState('');
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [joining, setJoining] = useState(false);
  const socketRef = useRef(null);
  const refreshInterval = useRef(null);

  const fetchPublicInfo = useCallback(async () => {
    try {
      if (subCode) {
        const response = await queueAPI.getPublicSubQueueInfo(subCode);
        const data = response.data;
        setQueue(data.queue);
        setSelectedSub(data.subQueue);
        setSubQueues(data.subQueues);
        setLiveStats(data.liveStats);
        if (data.queue.status === 'CLOSED') {
          setStep(STEPS.ERROR);
          setError('This queue is closed. New users can no longer join.');
        } else if (data.subQueue.status !== 'OPEN') {
          setStep(STEPS.ERROR);
          setError('This sub-queue is not currently accepting members.');
        } else {
          setStep(STEPS.LANDING);
        }
      } else if (publicCode) {
        const response = await queueAPI.getPublicQueueInfo(publicCode);
        const data = response.data;
        setQueue(data.queue);
        setSubQueues(data.subQueues);
        if (data.queue.status === 'CLOSED') {
          setStep(STEPS.ERROR);
          setError('This queue is closed. New users can no longer join.');
        } else if (data.subQueues.length === 1) {
          setSelectedSub(data.subQueues[0]);
          setLiveStats({
            currentlyServing: data.subQueues[0].currentlyServing,
            peopleWaiting: data.subQueues[0].peopleWaiting,
            peopleAhead: data.subQueues[0].peopleWaiting,
            estimatedWaitMinutes: data.subQueues[0].estimatedWaitMinutes,
            estimatedWaitRange: `${data.subQueues[0].estimatedWaitMinutes}-${data.subQueues[0].estimatedWaitMinutes + 5}`,
          });
          setStep(STEPS.STATS);
        } else {
          setStep(STEPS.LANDING);
        }
      }
    } catch (err) {
      setStep(STEPS.ERROR);
      setError('Queue not found. Please check the code and try again.');
    }
  }, [subCode, publicCode]);

  useEffect(() => {
    fetchPublicInfo();
  }, [fetchPublicInfo]);

  useEffect(() => {
    if (member && step === STEPS.TOKEN) {
      connectSocket();
      const socket = getSocket();
      socketRef.current = socket;
      if (socket && queue) {
        joinQueueRoom(queue.id);
        const handleUpdate = () => refreshMemberStatus();
        const handleTokenCalled = (data) => {
          if (data.member?.id === member.id) {
            setMember(prev => ({ ...prev, status: 'SERVING' }));
          }
          refreshMemberStatus();
        };
        const handleTokenCompleted = (data) => {
          if (data.member?.id === member.id) {
            setMember(prev => ({ ...prev, status: 'SERVED' }));
          }
          refreshMemberStatus();
        };
        const handleTokenSkipped = (data) => {
          if (data.member?.id === member.id) {
            setMember(prev => ({ ...prev, status: 'SKIPPED' }));
          }
          refreshMemberStatus();
        };
        const handleTokenRemoved = (data) => {
          if (data.member?.id === member.id) {
            setMember(prev => ({ ...prev, status: 'REMOVED' }));
          }
          refreshMemberStatus();
        };
        const handleBreakStarted = () => {
          setQueue(prev => ({ ...prev, status: 'BREAK' }));
        };
        const handleBreakEnded = () => {
          setQueue(prev => ({ ...prev, status: 'OPEN' }));
        };
        const handleClosed = () => {
          setQueue(prev => ({ ...prev, status: 'CLOSED' }));
        };

        socket.on('token:generated', handleUpdate);
        socket.on('token:called', handleTokenCalled);
        socket.on('token:completed', handleTokenCompleted);
        socket.on('token:skipped', handleTokenSkipped);
        socket.on('token:removed', handleTokenRemoved);
        socket.on('token:left', handleUpdate);
        socket.on('queue:breakStarted', handleBreakStarted);
        socket.on('queue:breakEnded', handleBreakEnded);
        socket.on('queue:closed', handleClosed);
        socket.on('queue:statusChanged', handleUpdate);

        return () => {
          leaveQueueRoom(queue.id);
          socket.off('token:generated', handleUpdate);
          socket.off('token:called', handleTokenCalled);
          socket.off('token:completed', handleTokenCompleted);
          socket.off('token:skipped', handleTokenSkipped);
          socket.off('token:removed', handleTokenRemoved);
          socket.off('token:left', handleUpdate);
          socket.off('queue:breakStarted', handleBreakStarted);
          socket.off('queue:breakEnded', handleBreakEnded);
          socket.off('queue:closed', handleClosed);
          socket.off('queue:statusChanged', handleUpdate);
        };
      }
    }
  }, [member?.id, step, queue?.id]);

  useEffect(() => {
    if (step === STEPS.TOKEN && member) {
      refreshInterval.current = setInterval(refreshMemberStatus, 10000);
      return () => clearInterval(refreshInterval.current);
    }
  }, [step, member?.id]);

  const refreshMemberStatus = async () => {
    if (!member?.id) return;
    try {
      const response = await queueAPI.getMemberStatus(member.id);
      const data = response.data;
      setMember(prev => ({
        ...prev,
        status: data.member.status,
        token_number: data.member.token_number,
      }));
      setLiveStats(data.liveStats);
      if (data.queue?.status) {
        setQueue(prev => ({ ...prev, status: data.queue.status }));
      }
    } catch (err) {
      console.error('Failed to refresh status');
    }
  };

  const handleSelectSub = (sub) => {
    setSelectedSub(sub);
    setLiveStats({
      currentlyServing: sub.currentlyServing,
      peopleWaiting: sub.peopleWaiting,
      peopleAhead: sub.peopleWaiting,
      estimatedWaitMinutes: sub.estimatedWaitMinutes || sub.peopleWaiting * 5,
      estimatedWaitRange: `${sub.estimatedWaitMinutes || sub.peopleWaiting * 5}-${(sub.estimatedWaitMinutes || sub.peopleWaiting * 5) + 5}`,
    });
    setStep(STEPS.STATS);
  };

  const handleJoin = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Please fill in your name and phone number.');
      return;
    }
    setJoining(true);
    setError('');
    try {
      let response;
      if (subCode) {
        response = await queueAPI.joinBySubCode(subCode, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        });
      } else {
        response = await queueAPI.joinQueue(publicCode, {
          queueTypeId: selectedSub.id || selectedSub.publicCode,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        });
      }
      const memberData = response.data.member;
      setMember({
        id: memberData.id,
        token_number: memberData.token_number,
        name: memberData.name,
        phone: memberData.phone,
        email: memberData.email,
        status: memberData.status,
      });
      setStep(STEPS.TOKEN);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join queue. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      await queueAPI.leaveQueue(member.id);
      setLeaveConfirm(false);
      navigate('/');
    } catch (err) {
      setError('Failed to leave queue');
    }
  };

  const handleSkip = async () => {
    if (!skipPosition) return;
    try {
      await queueAPI.skipSelf(member.id, { targetPosition: parseInt(skipPosition) });
      setSkipModal(false);
      setSkipPosition('');
      refreshMemberStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to skip backward');
    }
  };

  if (step === STEPS.LOADING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (step === STEPS.ERROR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Queue Unavailable</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="py-2 px-6 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (step === STEPS.TOKEN && member) {
    const memberStatus = member.status;
    const position = liveStats?.position || memberStatus === 'SERVING' ? 0 : (liveStats?.peopleAhead || 0);
    const peopleAhead = liveStats?.peopleAhead || 0;
    const currentServing = liveStats?.currentlyServing;
    const estimatedWait = liveStats?.estimatedWaitMinutes || peopleAhead * 5;
    const queueStatus = queue?.status || 'OPEN';

    const getStatusConfig = () => {
      switch (memberStatus) {
        case 'SERVING': return { label: 'NOW SERVING', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500', pulse: true };
        case 'SERVED': return { label: 'SERVED', color: 'bg-green-100 text-green-800', dot: 'bg-green-500', pulse: false };
        case 'SKIPPED': return { label: 'SKIPPED', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500', pulse: false };
        case 'REMOVED': return { label: 'REMOVED', color: 'bg-red-100 text-red-800', dot: 'bg-red-500', pulse: false };
        case 'LEFT': return { label: 'LEFT QUEUE', color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500', pulse: false };
        default:
          if (queueStatus === 'BREAK') return { label: 'ON BREAK', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', pulse: true };
          if (queueStatus === 'CLOSED') return { label: 'QUEUE CLOSED', color: 'bg-red-100 text-red-800', dot: 'bg-red-500', pulse: false };
          if (peopleAhead === 0 && memberStatus === 'WAITING') return { label: 'YOU ARE NEXT', color: 'bg-green-100 text-green-800', dot: 'bg-green-500', pulse: true };
          return { label: 'WAITING', color: 'bg-green-100 text-green-800', dot: 'bg-green-500', pulse: true };
      }
    };

    const statusConfig = getStatusConfig();
    const isActive = !['SERVED', 'SKIPPED', 'REMOVED', 'LEFT'].includes(memberStatus);

    return (
      <div className="min-h-screen bg-white">
        <div className="px-4 pt-6 pb-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{queue?.name}</p>
              <p className="text-sm text-gray-600">{selectedSub?.name}</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Token</div>
              <div className="text-6xl font-bold text-gray-900 mb-2">#{member.token_number}</div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${statusConfig.dot} ${statusConfig.pulse ? 'animate-pulse' : ''}`}></span>
                {statusConfig.label}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Name</span>
                  <span className="text-sm font-medium text-gray-900">{member.name}</span>
                </div>
                {member.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Phone</span>
                    <span className="text-sm font-medium text-gray-900">{member.phone}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm font-medium text-gray-900">{member.email}</span>
                  </div>
                )}
              </div>
            </div>

            {memberStatus === 'WAITING' && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Currently Serving</div>
                  <div className="text-2xl font-bold text-gray-900">#{currentServing || '-'}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Position</div>
                  <div className="text-2xl font-bold text-gray-900">{position}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">People Ahead</div>
                  <div className="text-2xl font-bold text-gray-900">{peopleAhead}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Est. Wait</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {queueStatus === 'BREAK' ? 'Paused' :
                     peopleAhead === 0 ? 'Soon' :
                     `${estimatedWait}m`}
                  </div>
                </div>
              </div>
            )}

            {memberStatus === 'SERVING' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-center">
                <div className="text-4xl mb-2">
                  <svg className="w-12 h-12 mx-auto text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-blue-900">Please proceed to the counter</h3>
                <p className="text-sm text-blue-700 mt-1">You are being served now</p>
              </div>
            )}

            {memberStatus === 'SERVED' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
                <div className="text-4xl mb-2">
                  <svg className="w-12 h-12 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-900">You have been served!</h3>
                <p className="text-sm text-green-700 mt-1">Thank you for visiting</p>
              </div>
            )}

            {(memberStatus === 'SKIPPED' || memberStatus === 'REMOVED') && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6 text-center">
                <h3 className="text-lg font-semibold text-orange-900">
                  {memberStatus === 'SKIPPED' ? 'You have been skipped' : 'You have been removed'}
                </h3>
                <p className="text-sm text-orange-700 mt-1">Please contact the counter for assistance</p>
              </div>
            )}

            {memberStatus === 'LEFT' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900">You left the queue</h3>
                <p className="text-sm text-gray-600 mt-1">You are no longer in this queue</p>
              </div>
            )}

            {isActive && (
              <div className="space-y-3">
                {memberStatus === 'WAITING' && (
                  <button
                    onClick={() => setSkipModal(true)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Skip Backward
                  </button>
                )}
                <button
                  onClick={() => setLeaveConfirm(true)}
                  className="w-full py-3 px-4 bg-red-50 border border-red-200 rounded-xl font-medium text-red-700 hover:bg-red-100 text-sm"
                >
                  Leave Queue
                </button>
              </div>
            )}

            {!isActive && (
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 text-sm"
              >
                Go Home
              </button>
            )}
          </div>
        </div>

        {skipModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Skip Backward</h3>
              <p className="text-sm text-gray-600 mb-1">Current Position: {liveStats?.position || peopleAhead + 1}</p>
              <p className="text-sm text-gray-600 mb-4">Move to a later position (max 10 spots):</p>
              <input
                type="number"
                min={(liveStats?.position || peopleAhead + 1) + 1}
                max={(liveStats?.position || peopleAhead + 1) + 10}
                value={skipPosition}
                onChange={(e) => setSkipPosition(e.target.value)}
                placeholder="Target position"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
              <div className="flex gap-3">
                <button onClick={() => { setSkipModal(false); setSkipPosition(''); }} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleSkip} disabled={!skipPosition} className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {leaveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Leave Queue?</h3>
              <p className="text-sm text-gray-600 mb-6">Are you sure you want to leave the queue? You will lose your position.</p>
              <div className="flex gap-3">
                <button onClick={() => setLeaveConfirm(false)} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleLeave} className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                  Leave Queue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{queue?.name || 'Queue'}</h1>
            <p className="text-sm text-gray-500 mb-3">
              {queue?.date ? new Date(queue.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </p>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              queue?.status === 'OPEN' ? 'bg-green-100 text-green-800' :
              queue?.status === 'BREAK' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${
                queue?.status === 'OPEN' ? 'bg-green-500' :
                queue?.status === 'BREAK' ? 'bg-yellow-500' :
                'bg-red-500'
              } ${queue?.status === 'OPEN' ? 'animate-pulse' : ''}`}></span>
              {queue?.status === 'OPEN' ? 'Open' : queue?.status === 'BREAK' ? 'On Break' : 'Closed'}
            </div>
            <p className="text-sm text-gray-600 mt-4 max-w-sm mx-auto">
              Join the queue digitally and track your position without waiting physically.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {step === STEPS.LANDING && (
            <>
              {subQueues.length > 1 && !selectedSub && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Select Service</h3>
                  <div className="space-y-2">
                    {subQueues.map((sub) => (
                      <button
                        key={sub.publicCode}
                        onClick={() => handleSelectSub(sub)}
                        className="w-full p-4 border border-gray-200 rounded-xl text-left hover:border-gray-900 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">{sub.name}</div>
                            {sub.status !== 'OPEN' && (
                              <span className="text-xs text-red-600">Not available</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              {sub.peopleWaiting || 0} waiting
                            </div>
                            <div className="text-xs text-gray-500">
                              ~{(sub.estimatedWaitMinutes || sub.peopleWaiting * 5)} min
                            </div>
                          </div>
                        </div>
                        {sub.currentlyServing && (
                          <div className="text-xs text-gray-500 mt-1">
                            Now serving: #{sub.currentlyServing}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedSub && (
                <div className="mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-900">{selectedSub.name}</h3>
                      <button onClick={() => { setSelectedSub(null); setStep(STEPS.LANDING); }} className="text-xs text-gray-500 hover:text-gray-700">
                        Change
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900">#{liveStats?.currentlyServing || '-'}</div>
                        <div className="text-xs text-gray-500">Serving</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">{liveStats?.peopleWaiting || 0}</div>
                        <div className="text-xs text-gray-500">Waiting</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">~{liveStats?.estimatedWaitMinutes || 0}m</div>
                        <div className="text-xs text-gray-500">Est. Wait</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(selectedSub || subQueues.length <= 1) && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">Your Details</h3>
                  <input
                    type="text"
                    placeholder="Name *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={joining || !formData.name.trim() || !formData.phone.trim()}
                    className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joining ? 'Joining...' : 'Join Queue'}
                  </button>
                </div>
              )}
            </>
          )}

          {step === STEPS.STATS && selectedSub && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Currently Serving</div>
                <div className="text-4xl font-bold text-gray-900 mb-3">#{liveStats?.currentlyServing || '-'}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{liveStats?.peopleWaiting || 0}</div>
                    <div className="text-xs text-gray-500">People Waiting</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">~{liveStats?.estimatedWaitMinutes || 0}m</div>
                    <div className="text-xs text-gray-500">Est. Wait</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Queue Information</p>
                    <p className="text-xs text-gray-500 mt-1">Queue Status: <span className={`font-medium ${queue?.status === 'OPEN' ? 'text-green-600' : queue?.status === 'BREAK' ? 'text-yellow-600' : 'text-red-600'}`}>{queue?.status === 'OPEN' ? 'Open' : queue?.status === 'BREAK' ? 'On Break' : 'Closed'}</span></p>
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-medium text-gray-700">Your Details</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(STEPS.LANDING)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleJoin}
                  disabled={joining || !formData.name.trim() || !formData.phone.trim()}
                  className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining ? 'Joining...' : 'Join Queue'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinQueue;
