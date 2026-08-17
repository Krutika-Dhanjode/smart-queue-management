import React, { useState } from 'react';
import { queueAPI } from '../services/api';
import QRCodeDisplay from './QRCodeDisplay';

const QueueCreator = ({ onQueueCreated, onSelectQueue }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    capacity: 100,
  });
  const [subQueues, setSubQueues] = useState([]);
  const [newSubQueue, setNewSubQueue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdQueue, setCreatedQueue] = useState(null);

  const handleAddSubQueue = () => {
    if (newSubQueue.trim()) {
      setSubQueues([...subQueues, { name: newSubQueue.trim(), description: '' }]);
      setNewSubQueue('');
    }
  };

  const handleRemoveSubQueue = (index) => {
    setSubQueues(subQueues.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await queueAPI.create({
        name: formData.name,
        date: formData.date,
        capacity: formData.capacity,
        subQueues,
      });
      setCreatedQueue(response.data.queue);
      onQueueCreated(response.data.queue);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create queue');
    } finally {
      setLoading(false);
    }
  };

  if (step === 3 && createdQueue) {
    return (
      <QRCodeDisplay
        queue={createdQueue}
        onComplete={() => { setStep(1); setCreatedQueue(null); }}
        onGoToAdmin={() => onSelectQueue(createdQueue)}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Organisation</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Smart Hospital, City Clinic"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </div>
            <button
              onClick={() => formData.name && setStep(2)}
              disabled={!formData.name}
              className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              Next: Add Services
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubQueue}
                onChange={(e) => setNewSubQueue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubQueue()}
                placeholder="Service name (e.g., OPD, Lab, Billing)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
              <button
                onClick={handleAddSubQueue}
                className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300"
              >
                Add
              </button>
            </div>

            {subQueues.length > 0 && (
              <div className="space-y-2">
                {subQueues.map((sq, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-900">{sq.name}</span>
                    <button
                      onClick={() => handleRemoveSubQueue(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Organisation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueCreator;
