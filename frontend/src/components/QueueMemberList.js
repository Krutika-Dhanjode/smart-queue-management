import React, { useState } from 'react';

const QueueMemberList = ({ members, onServe, onComplete, onSkip, onRemove, disabled }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const servingMember = members.find(m => m.status === 'SERVING');
  const waitingMembers = members.filter(m => m.status === 'WAITING');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SERVING': return 'bg-blue-100 text-blue-700';
      case 'WAITING': return 'bg-yellow-100 text-yellow-700';
      case 'SERVED': return 'bg-green-100 text-green-700';
      case 'SKIPPED': return 'bg-orange-100 text-orange-700';
      case 'REMOVED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="text-xs text-blue-600 uppercase tracking-wider mb-1">Currently Serving</div>
        {servingMember ? (
          <div>
            <div className="text-2xl font-bold text-blue-900">#{servingMember.token_number}</div>
            <div className="text-sm text-blue-700 mt-1">{servingMember.name}</div>
            <button
              onClick={() => onComplete(servingMember.id)}
              disabled={disabled}
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="text-sm text-blue-700">No one is currently being served.</div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Waiting ({waitingMembers.length})</h3>
      </div>

      {waitingMembers.length > 0 && (
        <div className="hidden md:block">
          <div className="grid grid-cols-[40px_1fr_70px_80px_200px] gap-2 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <div>#</div>
            <div>Name</div>
            <div>Token</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          {waitingMembers.map((member, index) => (
            <div key={member.id} className="border-b border-gray-100">
              <div className="grid grid-cols-[40px_1fr_70px_80px_200px] gap-2 px-3 py-3 items-center">
                <div className="text-sm font-medium text-gray-900">{index + 1}</div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{member.name}</div>
                  {member.phone && <div className="text-xs text-gray-500">{member.phone}</div>}
                </div>
                <div className="text-sm font-mono text-gray-900">#{member.token_number}</div>
                <div><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(member.status)}`}>{member.status}</span></div>
                <div className="flex gap-1 justify-end">
                  <button onClick={() => onServe(member.id)} disabled={disabled} className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">Serve</button>
                  <button onClick={() => onComplete(member.id)} disabled={disabled} className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">Done</button>
                  <button onClick={() => onSkip(member.id)} disabled={disabled} className="px-2.5 py-1 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Skip</button>
                  <button onClick={() => setConfirmRemove(member.id)} disabled={disabled} className="px-2.5 py-1 border border-red-200 text-red-600 rounded text-xs font-medium hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed">Remove</button>
                  <button onClick={() => setExpandedId(expandedId === member.id ? null : member.id)} className="p-1 hover:bg-gray-100 rounded">
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === member.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              </div>
              {expandedId === member.id && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-gray-500">Name:</span><div className="font-medium text-gray-900">{member.name}</div></div>
                    <div><span className="text-gray-500">Token:</span><div className="font-medium text-gray-900">#{member.token_number}</div></div>
                    <div><span className="text-gray-500">Serial:</span><div className="font-medium text-gray-900">{index + 1}</div></div>
                    <div><span className="text-gray-500">Contact:</span><div className="font-medium text-gray-900">{member.phone || '-'}</div></div>
                    <div><span className="text-gray-500">Email:</span><div className="font-medium text-gray-900">{member.email || '-'}</div></div>
                    <div><span className="text-gray-500">Join Time:</span><div className="font-medium text-gray-900">{new Date(member.joined_at).toLocaleTimeString()}</div></div>
                    <div><span className="text-gray-500">Status:</span><div className="font-medium text-gray-900">{member.status}</div></div>
                    <div><span className="text-gray-500">Priority:</span><div className="font-medium text-gray-900">{member.priority}</div></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {waitingMembers.length > 0 && (
        <div className="md:hidden space-y-2">
          {waitingMembers.map((member, index) => (
            <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-500">{index + 1}</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500">#{member.token_number}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(member.status)}`}>{member.status}</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => onServe(member.id)} disabled={disabled} className="flex-1 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">Serve</button>
                <button onClick={() => onComplete(member.id)} disabled={disabled} className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">Done</button>
                <button onClick={() => onSkip(member.id)} disabled={disabled} className="flex-1 py-1.5 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Skip</button>
                <button onClick={() => setConfirmRemove(member.id)} disabled={disabled} className="flex-1 py-1.5 border border-red-200 text-red-600 rounded text-xs font-medium hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed">Remove</button>
                <button onClick={() => setExpandedId(expandedId === member.id ? null : member.id)} className="p-1.5 hover:bg-gray-100 rounded">
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === member.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              {expandedId === member.id && (
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Contact:</span><span className="text-gray-900">{member.phone || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="text-gray-900">{member.email || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Join Time:</span><span className="text-gray-900">{new Date(member.joined_at).toLocaleTimeString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Priority:</span><span className="text-gray-900">{member.priority}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {waitingMembers.length === 0 && !servingMember && (
        <div className="text-center py-8 text-gray-500">
          No users are currently waiting.
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove from queue?</h3>
            <p className="text-sm text-gray-600 mb-6">This person will be removed from the active queue.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => { onRemove(confirmRemove); setConfirmRemove(null); }} className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueMemberList;
