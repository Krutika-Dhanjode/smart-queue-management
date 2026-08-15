import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { queueAPI, predictionAPI } from '../services/api';
import { joinQueueRoom, leaveQueueRoom, onTokenCalled, onBreakStarted, onBreakEnded, onQueueClosed } from '../services/socket';

const UserDashboard = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [queueStatus, setQueueStatus] = useState('OPEN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosition = useCallback(async () => {
    try {
      const response = await queueAPI.getPosition(memberId);
      setPosition(response.data);

      if (response.data.queueType) {
        const predResponse = await predictionAPI.getWaitTime(response.data.queueType.id, {
          peopleAhead: response.data.peopleAhead || 0,
          queueLength: response.data.queueType.capacity || 100,
          activeCounters: 1,
        });
        setPrediction(predResponse.data.prediction);
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

      onTokenCalled(() => fetchPosition());
      onBreakStarted(() => setQueueStatus('BREAK'));
      onBreakEnded(() => setQueueStatus('OPEN'));
      onQueueClosed(() => setQueueStatus('CLOSED'));

      return () => {
        leaveQueueRoom(position.queueId);
      };
    }
  }, [position?.queueId, fetchPosition]);

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

  const handleSkip = async () => {
    try {
      await fetchPosition();
    } catch (err) {
      setError('Failed to update position');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Queue Status</h1>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">TOKEN</div>
            <div className="text-5xl font-bold text-gray-900">#{position?.member?.token_number}</div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Current Token</span>
            <span className="font-semibold text-gray-900">#{position?.currentServing || '-'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Your Position</span>
            <span className="font-semibold text-gray-900">{position?.position || '-'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">People Ahead</span>
            <span className="font-semibold text-gray-900">{position?.peopleAhead || 0}</span>
          </div>
          {prediction && (
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Estimated Wait</span>
              <span className="font-semibold text-gray-900">
                {prediction.lower_bound}-{prediction.upper_bound} min
              </span>
            </div>
          )}
        </div>

        <div className="text-center mb-6">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            queueStatus === 'OPEN' ? 'bg-green-100 text-green-800' :
            queueStatus === 'BREAK' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${
              queueStatus === 'OPEN' ? 'bg-green-500' :
              queueStatus === 'BREAK' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}></span>
            {queueStatus === 'OPEN' ? 'Queue Open' :
             queueStatus === 'BREAK' ? 'On Break' : 'Queue Closed'}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSkip}
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
      </div>
    </div>
  );
};

export default UserDashboard;
