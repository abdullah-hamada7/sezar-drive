import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { statsService } from '../../services/stats.service';

export default function RecentActivityList() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        const res = await statsService.getDriverActivity();
        setData(res);
      } catch (err) {
        console.error('Failed to load activity:', err);
      } finally {
        setLoading(false);
      }
    }
    loadActivity();
  }, []);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return t('common.now');
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) return <div className="card h-40 flex items-center justify-center text-muted">...</div>;

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-sm" style={{ color: '#fff' }}>{t('driver_home.recent_activity')}</h3>
      <div className="flex flex-col gap-sm">
        {data.length === 0 ? (
          <div className="text-muted text-center py-md">{t('common.no_data')}</div>
        ) : (
          data.map(item => (
            <div key={item.id} className="p-sm rounded flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div>
                <div className="font-bold text-sm" style={{ color: item.status === 'CANCELLED' ? '#FF3D00' : '#fff' }}>
                  {item.type.toUpperCase()} • {item.status}
                </div>
                <div className="text-xs text-muted">{item.title}</div>
              </div>
              <div className="text-right">
                <div style={{ color: item.amount < 0 ? '#FF3D00' : '#00F5FF', fontWeight: 'bold' }}>
                  {item.amount !== null ? `${item.amount.toFixed(2)}` : '—'}
                </div>
                <div className="text-xs text-muted">{formatTime(item.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
