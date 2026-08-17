import React from 'react';

const AnalyticsPanel = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading analytics...
      </div>
    );
  }

  const stats = [
    { label: 'Total Joined', value: analytics.total_joined || 0, color: 'text-gray-900' },
    { label: 'Currently Waiting', value: analytics.currently_waiting || 0, color: 'text-blue-600' },
    { label: 'Served', value: analytics.served || 0, color: 'text-green-600' },
    { label: 'Skipped', value: analytics.skipped || 0, color: 'text-yellow-600' },
    { label: 'Removed', value: analytics.removed || 0, color: 'text-red-600' },
  ];

  const timeStats = [
    { label: 'Avg Wait Time', value: `${Math.round(analytics.avg_waiting_time || 0)}s` },
    { label: 'Avg Service Time', value: `${Math.round(analytics.avg_service_time || 0)}s` },
    { label: 'Max Wait Time', value: `${Math.round(analytics.max_waiting_time || 0)}s` },
  ];

  return (
    <div className="space-y-6">
      <h3 className="font-medium text-gray-900">Analytics</h3>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-3">Time Statistics</h4>
        <div className="space-y-3">
          {timeStats.map((stat) => (
            <div key={stat.label} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{stat.label}</span>
              <span className="font-medium text-gray-900">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {analytics.total_joined > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3">Completion Rate</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: `${((analytics.served || 0) / analytics.total_joined) * 100}%` }}
              ></div>
            </div>
            <span className="font-medium text-gray-900">
              {Math.round(((analytics.served || 0) / analytics.total_joined) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPanel;
