import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const data = [
  { name: 'Active', value: 35, color: '#00E676' }, // Emerald
  { name: 'Idle', value: 15, color: '#161B22' },   // Slate (or darker)
  { name: 'Break', value: 10, color: '#FF3D00' },  // Orange
];

export default function ShiftPerformanceChart() {
  return (
    <div className="card mb-md">
       <h3 className="text-lg font-bold mb-sm" style={{ color: 'var(--color-primary)' }}>Shift Performance</h3>
       <div style={{ height: 200, width: '100%' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#161B22', borderColor: '#333', color: '#fff' }} />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
       </div>
    </div>
  );
}
