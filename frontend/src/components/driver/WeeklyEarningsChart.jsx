import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', earnings: 120 },
  { name: 'Tue', earnings: 210 },
  { name: 'Wed', earnings: 180 },
  { name: 'Thu', earnings: 240 },
  { name: 'Fri', earnings: 300 },
  { name: 'Sat', earnings: 350 },
  { name: 'Sun', earnings: 280 },
];

export default function WeeklyEarningsChart() {
  return (
    <div className="card mb-md">
      <h3 className="text-lg font-bold mb-sm" style={{ color: 'var(--color-primary)' }}>Weekly Earnings</h3>
      <div style={{ height: 200, width: '100%' }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#00F5FF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#161B22', borderColor: '#333', color: '#fff' }}
              itemStyle={{ color: '#00F5FF' }}
            />
            <Area type="monotone" dataKey="earnings" stroke="#00F5FF" fillOpacity={1} fill="url(#colorEarnings)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
