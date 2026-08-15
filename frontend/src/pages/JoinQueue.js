import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { queueAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const JoinQueue = () => {
  const { publicCode } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [queueTypes, setQueueTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQueue();
  }, [publicCode]);

  const fetchQueue = async () => {
    try {
      const response = await queueAPI.getQueue(publicCode);
      setQueue(response.data.queue);
      const typesResponse = await queueAPI.getQueueWithTypes(response.data.queue.id);
      setQueueTypes(typesResponse.data.queue.types || []);
    } catch (err) {
      setError('Queue not found');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedType) {
      setError('Please select a sub-queue');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const response = await queueAPI.joinQueue(publicCode, {
        queueTypeId: selectedType,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });

      navigate(`/queue/${response.data.member.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join queue');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error && !queue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Queue Not Found</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{queue?.name}</h1>
          <p className="text-gray-600 mt-1">{queue?.date}</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Open
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Select Sub-queue</h3>
            <div className="space-y-2">
              {queueTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`w-full p-3 border rounded-lg text-left transition-colors ${
                    selectedType === type.id
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{type.name}</div>
                  {type.description && (
                    <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Your Details</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={joining || !selectedType || !formData.name || !formData.email || !formData.phone}
            className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? 'Joining...' : 'Get Token'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinQueue;
