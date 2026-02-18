import React from 'react';

const mockTrips = [
  { id: 1, type: 'Trip', status: 'Completed', amount: 45.50, time: '2 hours ago', location: 'Airport -> Downtown' },
  { id: 2, type: 'Shift', status: 'Closed', amount: null, time: 'Yesterday', location: '8 hours active' },
  { id: 3, type: 'Trip', status: 'Cancelled', amount: 0, time: 'Yesterday', location: 'Mall -> Suburbs' },
];

export default function RecentActivityList() {
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-sm" style={{ color: '#fff' }}>Recent Activity</h3>
      <div className="flex flex-col gap-sm">
        {mockTrips.map(item => (
          <div key={item.id} className="p-sm rounded flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
             <div>
                <div className="font-bold text-sm" style={{ color: item.status === 'Cancelled' ? '#FF3D00' : '#fff' }}>
                    {item.type} • {item.status}
                </div>
                <div className="text-xs text-muted">{item.location}</div>
             </div>
             <div className="text-right">
                <div style={{ color: '#00F5FF', fontWeight: 'bold' }}>
                    {item.amount ? `$${item.amount.toFixed(2)}` : '—'}
                </div>
                <div className="text-xs text-muted">{item.time}</div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
