import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { queueAPI } from '../services/api';

const GetIntoQueue = () => {
  const [mode, setMode] = useState(null);
  const [queueCode, setQueueCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!queueCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await queueAPI.getQueue(queueCode.trim().toUpperCase());
      navigate(`/join/${response.data.queue.publicCode}`);
    } catch (err) {
      setError('Queue not found. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkOpen = async (e) => {
    e.preventDefault();
    const url = e.target.elements.queueLink.value;
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const match = url.match(/\/join\/([A-Z0-9-]+)/i);
      if (match) {
        navigate(`/join/${match[1]}`);
      } else {
        const codeMatch = url.match(/Q-[A-Z0-9]+/i);
        if (codeMatch) {
          const response = await queueAPI.getQueue(codeMatch[0].toUpperCase());
          navigate(`/join/${response.data.queue.publicCode}`);
        } else {
          setError('Invalid queue link. Please paste a valid queue URL.');
        }
      }
    } catch (err) {
      setError('Queue not found from this link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-2xl font-bold text-gray-900">Get Into Queue</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose how you want to join
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        {!mode && (
          <>
            <button
              onClick={() => setMode('code')}
              className="w-full p-6 border border-gray-200 rounded-xl hover:border-gray-900 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Enter Queue Code</h3>
                  <p className="text-sm text-gray-600">Type the queue code you received</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('scan')}
              className="w-full p-6 border border-gray-200 rounded-xl hover:border-gray-900 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Scan QR Code</h3>
                  <p className="text-sm text-gray-600">Use your camera to scan a queue QR code</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('link')}
              className="w-full p-6 border border-gray-200 rounded-xl hover:border-gray-900 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Open Queue Link</h3>
                  <p className="text-sm text-gray-600">Paste a queue link to join</p>
                </div>
              </div>
            </button>
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {mode === 'code' && (
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enter Queue Code</h3>
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={queueCode}
                  onChange={(e) => setQueueCode(e.target.value.toUpperCase())}
                  placeholder="Q-XXXXXX"
                  autoFocus
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-3 text-sm font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMode(null); setError(''); setQueueCode(''); }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !queueCode.trim()}
                  className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Find Queue'}
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === 'scan' && (
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan QR Code</h3>
            <p className="text-sm text-gray-600 mb-4">
              Point your camera at the QR code displayed at the queue location.
              The queue will open automatically.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              QR code scanning requires camera access. Alternatively, you can enter the queue code manually.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setMode(null); setError(''); }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => { setMode('code'); setError(''); }}
                className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                Enter Code Instead
              </button>
            </div>
          </div>
        )}

        {mode === 'link' && (
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Open Queue Link</h3>
            <form onSubmit={handleLinkOpen} className="space-y-4">
              <div>
                <input
                  type="url"
                  name="queueLink"
                  placeholder="https://localhost:3000/join/Q-XXXXXX"
                  autoFocus
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMode(null); setError(''); }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? 'Opening...' : 'Open Queue'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default GetIntoQueue;
