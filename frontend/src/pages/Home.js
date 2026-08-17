import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { queueAPI } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

const getBaseUrl = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return window.location.origin;
  }
  return `${window.location.protocol}//${host}:${window.location.port || (window.location.protocol === 'https:' ? '443' : '3000')}`;
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queues, setQueues] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [networkIP, setNetworkIP] = useState('');

  useEffect(() => {
    if (user) {
      fetchQueues();
    }
    detectIP();
  }, [user]);

  const detectIP = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      setNetworkIP(data.ip);
    } catch {
      setNetworkIP(window.location.hostname);
    }
  };

  const getJoinUrl = (code) => {
    const base = networkIP ? `${window.location.protocol}//${networkIP}:3000` : getBaseUrl();
    return `${base}/join-sub/${code}`;
  };

  const fetchQueues = async () => {
    try {
      const response = await queueAPI.getAdminQueues();
      setQueues(response.data.queues || []);
    } catch (err) {
      console.error('Failed to fetch queues');
    }
  };

  const handleCreateQueue = () => {
    if (user) {
      navigate('/admin');
    } else {
      navigate('/register');
    }
  };

  const copyLink = (code) => {
    navigator.clipboard.writeText(getJoinUrl(code));
    alert('Link copied!');
  };

  return (
    <div className="min-h-screen bg-white flex">
      {user && (
        <>
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-3 left-3 z-40 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 md:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {sidebarOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div className="fixed inset-0 bg-black opacity-50" onClick={() => setSidebarOpen(false)}></div>
              <div className="relative w-80 bg-white h-full shadow-lg overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="font-semibold text-gray-900">Your Queues</h2>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <button
                    onClick={() => { navigate('/admin'); setSidebarOpen(false); }}
                    className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
                  >
                    + Create New Queue
                  </button>
                  {queues.map((q) => (
                    <div key={q.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{q.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            q.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                            q.status === 'BREAK' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>{q.status}</span>
                        </div>
                        <button
                          onClick={() => setSelectedQR(q)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View QR"
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Queue:</span>
                          <span className="font-mono text-gray-900">{q.public_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Admin:</span>
                          <span className="font-mono text-gray-900">{q.admin_code_hash ? '••••••••' : 'N/A'}</span>
                        </div>
                      </div>
                      {q.types && q.types.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-500 mb-1">Sub-queues:</div>
                          {q.types.map((t) => (
                            <div key={t.id} className="flex justify-between items-center text-xs py-1">
                              <span className="text-gray-700">{t.name}</span>
                              <div className="flex gap-1 items-center">
                                <span className="font-mono text-gray-500">{t.public_code}</span>
                                <button onClick={() => copyLink(t.public_code)} className="text-gray-400 hover:text-gray-700" title="Copy link">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => { navigate(`/join-sub/${t.public_code}`); setSidebarOpen(false); }}
                                  className="text-blue-500 hover:text-blue-700"
                                  title="Open Queue"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => { navigate('/admin', { state: { queue: q } }); setSidebarOpen(false); }}
                        className="w-full mt-2 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50"
                      >
                        Admin Dashboard
                      </button>
                    </div>
                  ))}
                  {queues.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No queues yet. Create one!</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="hidden md:block w-72 border-r border-gray-200 h-screen overflow-y-auto flex-shrink-0">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 mb-3">Your Queues</h2>
              <button
                onClick={() => navigate('/admin')}
                className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                + Create New Queue
              </button>
            </div>
            <div className="p-4 space-y-3">
              {queues.map((q) => (
                <div key={q.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{q.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        q.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                        q.status === 'BREAK' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{q.status}</span>
                    </div>
                    <button
                      onClick={() => setSelectedQR(q)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="View QR"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </button>
                  </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Code:</span>
                          <span className="font-mono text-gray-900">{q.public_code}</span>
                        </div>
                      </div>
                  {q.types && q.types.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Sub-queues:</div>
                      {q.types.map((t) => (
                        <div key={t.id} className="flex justify-between items-center text-xs py-1">
                          <span className="text-gray-700">{t.name}</span>
                          <div className="flex gap-1 items-center">
                            <span className="font-mono text-gray-500">{t.public_code}</span>
                            <button onClick={() => copyLink(t.public_code)} className="text-gray-400 hover:text-gray-700" title="Copy link">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </button>
                            <button
                              onClick={() => navigate(`/join-sub/${t.public_code}`)}
                              className="text-blue-500 hover:text-blue-700"
                              title="Open Queue"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/admin', { state: { queue: q } })}
                    className="w-full mt-2 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    Admin Dashboard
                  </button>
                </div>
              ))}
              {queues.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No queues yet</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex-1">
        <nav className="border-b border-gray-200 px-4 py-3">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">Smart Queue</h1>
            <div className="flex gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Hi, {user.name}</span>
                  <button
                    onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.reload(); }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <Link to="/login" className="px-4 py-2 text-gray-700 text-sm font-medium hover:text-gray-900">Login</Link>
                  <Link to="/register" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Register</Link>
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Smart Queue Management</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join a digital queue, track your position in real time, and reduce unnecessary waiting.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <button
              onClick={handleCreateQueue}
              className="block p-8 border border-gray-200 rounded-xl hover:border-gray-900 transition-colors text-left w-full"
            >
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Queue</h3>
              <p className="text-gray-600 text-sm">Create and manage digital queues for your organization</p>
            </button>

            <Link to="/admin-access" className="block p-8 border border-gray-200 rounded-xl hover:border-gray-900 transition-colors">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Queue</h3>
              <p className="text-gray-600 text-sm">Access queue management with admin code</p>
            </Link>

            <Link to="/get-into-queue" className="block p-8 border border-gray-200 rounded-xl hover:border-gray-900 transition-colors">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Into Queue</h3>
              <p className="text-gray-600 text-sm">Scan QR code or enter queue code to join</p>
            </Link>
          </div>
        </main>
      </div>

      {selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedQR(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{selectedQR.name}</h3>
            {selectedQR.types && selectedQR.types.length > 0 ? (
              <div className="space-y-4">
                {selectedQR.types.map((t) => {
                  const joinUrl = getJoinUrl(t.public_code);
                  return (
                    <div key={t.id} className="border border-gray-200 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 text-sm mb-2">{t.name}</h4>
                      <div className="flex justify-center mb-2">
                        <QRCodeSVG value={joinUrl} size={160} level="H" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Code:</span>
                          <span className="font-mono text-gray-900">{t.public_code}</span>
                        </div>
                      </div>
                      <div className="mt-2 bg-gray-50 rounded-lg p-2">
                        <div className="text-xs text-gray-500 mb-1">Scan or open this link:</div>
                        <div className="text-xs font-mono text-gray-900 break-all">{joinUrl}</div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { navigator.clipboard.writeText(joinUrl); alert('Link copied!'); }}
                          className="flex-1 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => navigate(`/join-sub/${t.public_code}`)}
                          className="flex-1 py-1.5 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No sub-queues</div>
            )}
            <button
              onClick={() => setSelectedQR(null)}
              className="w-full mt-4 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
