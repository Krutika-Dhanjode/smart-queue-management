import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { queueAPI } from '../services/api';
import { joinQueueRoom, leaveQueueRoom, getSocket } from '../services/socket';

const UserDashboard = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [queueStatus, setQueueStatus] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosition = useCallback(async () => {
    try {
      const response = await queueAPI.getPosition(memberId);
      setPosition(response.data);
      if (response.data.member?.status === 'SERVED') {
        setQueueStatus('SERVED');
      } else if (response.data.member?.status === 'LEFT' || response.data.member?.status === 'REMOVED' || response.data.member?.status === 'SKIPPED') {
        setQueueStatus(response.data.member.status);
      }
    } catch (err) {
      setError('Failed to load queue position');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  useEffect(() => {
    if (position?.queueId) {
      joinQueueRoom(position.queueId);
      const socket = getSocket();

      if (socket) {
        const handleUpdate = () => fetchPosition();
        const handleBreakStarted = () => setQueueStatus('BREAK');
        const handleBreakEnded = () => setQueueStatus('OPEN');
        const handleClosed = () => setQueueStatus('CLOSED');
        const handleTokenCalled = (data) => {
          if (data.member?.id === memberId) {
            setQueueStatus('SERVING');
          }
          fetchPosition();
        };
        const handleTokenCompleted = (data) => {
          if (data.member?.id === memberId) {
            setQueueStatus('SERVED');
          }
          fetchPosition();
        };
        const handleTokenSkipped = (data) => {
          if (data.member?.id === memberId) {
            setQueueStatus('SKIPPED');
          }
          fetchPosition();
        };
        const handleTokenRemoved = (data) => {
          if (data.member?.id === memberId) {
            setQueueStatus('REMOVED');
          }
          fetchPosition();
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
          leaveQueueRoom(position.queueId);
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
  }, [position?.queueId, memberId, fetchPosition]);

  const handleLeave = async () => {
    if (window.confirm('Are you sure you want to leave the queue?')) {
      try {
        await queueAPI.leaveQueue(memberId);
        navigate('/');
      } catch (err) {
        setError('Failed to leave queue');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Queue data not found'}</p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">Go Home</button>
        </div>
      </div>
    );
  }

  const member = position.member;
  const tokenNumber = member?.token_number;
  const currentServing = position.currentServing;
  const peopleAhead = position.peopleAhead || 0;
  const pos = position.position || peopleAhead + 1;
  const status = queueStatus;

  const getStatusConfig = () => {
    switch (status) {
      case 'BREAK':
        return { label: 'ON BREAK', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' };
      case 'CLOSED':
        return { label: 'CLOSED', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
      case 'SERVED':
        return { label: 'SERVED', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' };
      case 'SERVING':
        return { label: 'NOW SERVING', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' };
      case 'SKIPPED':
        return { label: 'SKIPPED', color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' };
      case 'REMOVED':
        return { label: 'REMOVED', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' };
      case 'LEFT':
        return { label: 'LEFT QUEUE', color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' };
      default:
        return { label: 'OPEN', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' };
    }
  };

  const statusConfig = getStatusConfig();
  const estimatedWait = Math.max(0, peopleAhead * 5);

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Queue Status</h1>
          <p className="text-sm text-gray-600 mt-1">{position.queueType?.name}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">YOUR TOKEN</div>
            <div className="text-5xl font-bold text-gray-900">#{tokenNumber}</div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Current Serving</span>
            <span className="font-semibold text-gray-900">#{currentServing || '-'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Your Position</span>
            <span className="font-semibold text-gray-900">{pos}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">People Ahead</span>
            <span className="font-semibold text-gray-900">{peopleAhead}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Estimated Wait</span>
            <span className="font-semibold text-gray-900">
              {status === 'SERVING' ? 'Being served now' :
               status === 'BREAK' ? 'Waiting for break to end' :
               peopleAhead === 0 ? 'You are next!' :
               `${estimatedWait}-${estimatedWait + 5} min`}
            </span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${statusConfig.color}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${statusConfig.dot}`}></span>
            {statusConfig.label}
          </div>
        </div>

        {status !== 'SERVED' && status !== 'REMOVED' && status !== 'LEFT' && status !== 'SKIPPED' && (
          <div className="space-y-3">
            <button
              onClick={() => fetchPosition()}
              className="w-full py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh Position
            </button>
            <button
              onClick={handleLeave}
              className="w-full py-3 px-4 bg-red-50 border border-red-200 rounded-lg font-medium text-red-700 hover:bg-red-100"
            >
              Leave Queue
            </button>
          </div>
        )}

        {(status === 'SERVED' || status === 'REMOVED' || status === 'LEFT' || status === 'SKIPPED') && (
          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="py-3 px-6 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
            >
              Go Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
