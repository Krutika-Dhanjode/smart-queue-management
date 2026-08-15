import React, { useState } from 'react';

const QueueMemberList = ({ members, onServe, onComplete, onSkip, onRemove }) => {
  const [expandedId, setExpandedId] = useState(null);

  const activeMembers = members.filter(m => m.status === 'WAITING' || m.status === 'SERVING');
  const waitingMembers = activeMembers.filter(m => m.status === 'WAITING');
  const servingMember = activeMembers.find(m => m.status === 'SERVING');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Active Queue</h3>
        <span className="text-sm text-gray-500">{activeMembers.length} members</span>
      </div>

      {servingMember && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-600 mb-1">NOW SERVING</div>
              <div className="font-semibold text-green-900">#{servingMember.token_number} - {servingMember.name}</div>
            </div>
            <button
              onClick={() => onComplete(servingMember.id)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {waitingMembers.map((member, index) => (
          <div
            key={member.id}
            className="bg-white border border-gray-200 rounded-xl p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                <div>
                  <div className="font-medium text-gray-900">#{member.token_number}</div>
                  <div className="text-sm text-gray-600">{member.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onServe(member.id)}
                  className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
                >
                  Serve
                </button>
                <button
                  onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {expandedId === member.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 text-gray-900">{member.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2 text-gray-900">{member.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Joined:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(member.joined_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <span className="ml-2 text-gray-900">{member.priority}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSkip(member.id)}
                    className="flex-1 py-1.5 px-3 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => onRemove(member.id)}
                    className="flex-1 py-1.5 px-3 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {activeMembers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No active members in queue
        </div>
      )}
    </div>
  );
};

export default QueueMemberList;
