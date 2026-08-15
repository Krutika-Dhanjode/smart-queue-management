import React from 'react';

const CompletedList = ({ members }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Completed</h3>
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
              <div className="text-right text-sm">
                <div className="text-gray-900">
                  {member.served_at ? new Date(member.served_at).toLocaleTimeString() : '-'}
                </div>
                {member.service_duration && (
                  <div className="text-gray-500">
                    {Math.floor(member.service_duration / 60)}m {member.service_duration % 60}s
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No completed members yet
        </div>
      )}
    </div>
  );
};

export default CompletedList;
