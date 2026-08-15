import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { queueAPI } from '../services/api';

const AdminQueueAccess = () => {
  const [publicCode, setPublicCode] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await queueAPI.joinByAdminCode({ publicCode, adminCode });
      navigate('/admin', { state: { queue: response.data.queue } });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid admin code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-2xl font-bold text-gray-900">Admin Queue Access</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter the queue code and admin code to access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Queue Code</label>
              <input
                type="text"
                value={publicCode}
                onChange={(e) => setPublicCode(e.target.value.toUpperCase())}
                placeholder="Q-XXXXXX"
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Admin Code</label>
              <input
                type="text"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                required
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
            >
              {loading ? 'Accessing...' : 'Access Queue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminQueueAccess;
