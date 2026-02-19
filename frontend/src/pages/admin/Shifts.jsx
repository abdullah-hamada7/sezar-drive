import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { ClipboardCheck, X, XCircle, Check, AlertCircle, Calendar, Gauge, Info } from 'lucide-react';
import { useContext } from 'react';
import { ToastContext } from '../../contexts/toastContext';
import PromptModal from '../../components/common/PromptModal';
import DetailModal from '../../components/common/DetailModal';

const STATUS_BADGES = {
  PendingVerification: 'badge-warning',
  Active: 'badge-success',
  Closed: 'badge-neutral',
};

const INSP_STATUS_BADGES = {
  pending: 'badge-warning',
  completed: 'badge-success',
  flagged: 'badge-danger'
};

export default function ShiftsPage() {
  const { t, i18n } = useTranslation();
  const { addToast } = useContext(ToastContext);
  const [shifts, setShifts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [promptData, setPromptData] = useState({ isOpen: false, shiftId: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.getShifts(params.toString());
      setShifts(res.data.shifts || []);
      setPagination(res.data || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handleUpdate = () => load();
    window.addEventListener('ws:shift_started', handleUpdate);
    window.addEventListener('ws:shift_activated', handleUpdate);
    window.addEventListener('ws:shift_closed', handleUpdate);
    return () => {
      window.removeEventListener('ws:shift_started', handleUpdate);
      window.removeEventListener('ws:shift_activated', handleUpdate);
      window.removeEventListener('ws:shift_closed', handleUpdate);
    };
  }, [load]);

  async function handleAdminClose(id) {
    setPromptData({ isOpen: true, shiftId: id });
  }

  async function onConfirmClose(reason) {
    try {
      await api.adminCloseShift(promptData.shiftId, { reason });
      addToast(t('common.success'), 'success');
      load();
    } catch (err) { addToast(err.message || t('common.error'), 'error'); }
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString(i18n.language, { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  }

  const [showInspections, setShowInspections] = useState(false);
  const [selectedShiftInspections, setSelectedShiftInspections] = useState([]);

  async function handleViewInspections(shiftId) {
    try {
      const res = await api.getInspections(`shiftId=${shiftId}`); 
      setSelectedShiftInspections(res.data || []);
      setShowInspections(true);
    } catch (err) {
      console.error(err);
      addToast(t('common.error'), 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('shifts.title')}</h1>
          <p className="page-subtitle">{t('shifts.subtitle')}</p>
        </div>
        <div className="flex gap-sm">
          {['', 'PendingVerification', 'Active', 'Closed'].map(s => (
            <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}>
              {s === '' ? t('shifts.filter.all') : s === 'PendingVerification' ? t('shifts.filter.pending') : t(`shifts.filter.${s.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner"></div></div>
      ) : (
        <div className="table-container">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>{t('shifts.table.driver')}</th>
                  <th>{t('shifts.table.vehicle')}</th>
                  <th>{t('shifts.table.status')}</th>
                  <th>{t('shifts.table.started')}</th>
                  <th>{t('shifts.table.closed')}</th>
                  <th>{t('shifts.table.reason')}</th>
                  <th>{t('shifts.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr><td colSpan={7} className="empty-state">{t('shifts.table.empty')}</td></tr>
                ) : shifts.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.driver?.name || '—'}</td>
                    <td>{s.vehicle?.plateNumber || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGES[s.status] || 'badge-neutral'}`}>{t(`common.status.${s.status.toLowerCase()}`)}</span></td>
                    <td className="text-sm">{formatDate(s.startedAt)}</td>
                    <td className="text-sm">{formatDate(s.closedAt)}</td>
                    <td className="text-sm text-muted">{s.closeReason || '—'}</td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn btn-sm btn-secondary" onClick={() => handleViewInspections(s.id)}>
                          <ClipboardCheck size={14} /> {t('shifts.actions.inspections')}
                        </button>
                        {(s.status === 'PendingVerification' || s.status === 'Active') && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleAdminClose(s.id)}>
                            <XCircle size={14} /> {t('shifts.actions.close')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}>{t('vehicles.pagination.prev')}</button>
          <span className="text-sm text-muted">{t('vehicles.pagination.info', { current: page, total: pagination.totalPages })}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}>{t('vehicles.pagination.next')}</button>
        </div>
      )}

      {showInspections && (
        <div className="modal-overlay" onClick={() => setShowInspections(false)}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{t('shifts.modal.title')}</h2>
              <button className="btn-icon" onClick={() => setShowInspections(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {selectedShiftInspections.length === 0 ? (
                <p className="text-muted text-center p-xl">{t('shifts.modal.empty')}</p>
              ) : (
                <div className="flex flex-col gap-xl">
                  {selectedShiftInspections.map(insp => (
                    <div key={insp.id} className="detail-item-group border rounded-lg p-md bg-surface-dark">
                      <div className="flex justify-between items-center mb-md pb-sm border-bottom">
                        <h3 className="text-md font-bold text-gradient">
                          {t('shifts.modal.type_title', { type: t(`common.inspection_type.${insp.type.toLowerCase()}`) })}
                        </h3>
                        <span className={`badge ${INSP_STATUS_BADGES[insp.status]}`}>
                          {t(`common.status.${insp.status.toLowerCase()}`)}
                        </span>
                      </div>

                      <div className="grid grid-3 gap-md mb-lg p-sm rounded bg-bg-tertiary">
                         <div className="flex flex-col">
                            <span className="text-xs text-muted flex items-center gap-xs"><Calendar size={12} /> {t('admin_expenses.table.date')}</span>
                            <span className="text-sm font-medium">{formatDate(insp.createdAt)}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-xs text-muted flex items-center gap-xs"><Gauge size={12} /> {t('inspection.mileage')}</span>
                            <span className="text-sm font-medium">{insp.mileage ? `${insp.mileage} KM` : '—'}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-xs text-muted flex items-center gap-xs"><Info size={12} /> ID</span>
                            <span className="text-xs text-mono font-medium">{insp.id.substring(0, 8)}...</span>
                         </div>
                      </div>
                      
                      {insp.checklistData && (
                        <div className="mb-lg">
                          <h4 className="text-xs uppercase text-muted font-bold mb-sm tracking-wider">{t('shifts.modal.checklist')}</h4>
                          <div className="grid grid-4 gap-sm">
                            {Object.entries(insp.checklistData).map(([key, val]) => (
                              <div key={key} className="flex items-center justify-between p-xs px-sm rounded border bg-bg-secondary">
                                <span className="text-xs">{t(`inspection.checklist.${key}`) || key}</span>
                                {val ? <Check size={14} className="text-success" /> : <AlertCircle size={14} className="text-danger" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {insp.notes && (
                        <div className="mb-lg">
                          <h4 className="text-xs uppercase text-muted font-bold mb-sm tracking-wider">{t('inspection.notes_label')}</h4>
                          <p className="text-sm p-sm bg-bg-tertiary rounded border">{insp.notes}</p>
                        </div>
                      )}

                      {insp.photos && insp.photos.length > 0 && (
                        <div>
                          <h4 className="text-xs uppercase text-muted font-bold mb-sm tracking-wider">{t('shifts.modal.photos')}</h4>
                          <div className="grid grid-4 gap-md">
                            {insp.photos.map(p => (
                              <div key={p.id} className="text-center group">
                                <a href={p.photoUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border group-hover:border-primary transition-all">
                                  <img 
                                    src={p.photoUrl} 
                                    alt={t(`inspection.directions.${p.direction}`)} 
                                    className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" 
                                  />
                                </a>
                                <span className="text-xs text-muted capitalize mt-xs block italic">{t(`inspection.directions.${p.direction}`)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PromptModal 
        isOpen={promptData.isOpen}
        onClose={() => setPromptData({ isOpen: false, shiftId: null })}
        onConfirm={onConfirmClose}
        title={t('shifts.actions.close')}
        message={t('shifts.modal.close_prompt')}
        placeholder={t('shifts.modal.reason_placeholder') || 'Reason for closing shift'}
      />
      
      <style>{`
        .bg-surface-dark { background: rgba(0, 0, 0, 0.1); }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); }
        .p-xs { padding: 0.25rem; }
        .px-sm { padding-left: 0.75rem; padding-right: 0.75rem; }
        .border-bottom { border-bottom: 1px solid var(--color-border); }
        .border-top { border-top: 1px solid var(--color-border); }
        @media (max-width: 640px) {
          .grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
