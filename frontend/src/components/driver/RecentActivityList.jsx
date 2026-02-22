import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { statsService } from '../../services/stats.service';

export default function RecentActivityList() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        setError(null);
        const res = await statsService.getDriverActivity();
        const result = res.data || res;
        setData(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error('Failed to load activity:', err);
        setError(t('errors.fetch_failed') || 'Failed to load activity');
      } finally {
        setLoading(false);
      }
    }
    loadActivity();
  }, [t]);

  const formatTime = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';

    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return t('common.now') || 'Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) return (
    <div className="card h-40 flex flex-col items-center justify-center gap-sm">
      <div className="spinner"></div>
      <div className="text-muted text-sm">{t('common.loading')}</div>
    </div>
  );

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-sm" style={{ color: '#fff' }}>{t('driver_home.recent_activity')}</h3>
      <div className="flex flex-col gap-sm">
        {error ? (
          <div className="text-danger text-center py-md bg-danger-bg rounded border border-danger">
            <div className="text-sm font-bold">{error}</div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-muted text-center py-md bg-white/5 rounded border border-dashed border-white/10">
            {t('common.no_data') || 'No recent activity'}
          </div>
        ) : (
          data.map((item, idx) => (
            <div key={item.id || idx} className="p-sm rounded flex justify-between items-center transition-all hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div>
                <div className="font-bold text-sm" style={{ color: item.status === 'CANCELLED' ? '#FF3D00' : '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {(item.type || 'activity').toUpperCase()}
                  <span className="opacity-40 text-[10px]">•</span>
                  <span className="opacity-80 text-[11px]">{item.status || '...'}</span>
                </div>
                <div className="text-xs text-muted truncate max-w-[180px]">{item.title || '—'}</div>
              </div>
              <div className="text-right">
                <div style={{ color: (Number(item.amount) || 0) < 0 ? '#FF3D00' : '#00F5FF', fontWeight: 'bold' }}>
                  {item.amount !== null && item.amount !== undefined ? Number(item.amount).toFixed(2) : '—'}
                </div>
                <div className="text-xs text-muted font-mono">{formatTime(item.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
