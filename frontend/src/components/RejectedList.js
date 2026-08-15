import React from 'react';

const RejectedList = ({ members }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Rejected / Skipped</h3>
        <span className="text-sm text-gray-500">{members.length} members</span>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-white border border-gray-200 rounded-xl p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">#{member.token_number} - {member.name}</div>
                <div className="text-sm text-gray-600">
                  {member.email || member.phone || '-'}
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                  member.status === 'SKIPPED' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {member.status}
                </span>
                <div className="text-sm text-gray-500 mt-1">
                  {member.updated_at ? new Date(member.updated_at).toLocaleTimeString() : '-'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No rejected members
        </div>
      )}
    </div>
  );
};

export default RejectedList;
