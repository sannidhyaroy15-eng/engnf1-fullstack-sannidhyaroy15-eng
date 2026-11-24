import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { api, extractErrorMessage } from '../../services/api';
import { Alert } from '../../components/ui/Alert';
import { DownloadCloud, FileText, Sparkles, Upload } from 'lucide-react';
import { ImportStatsResponse } from '../../types';

interface TicketImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SAMPLE_FEED_JSON = JSON.stringify(
  {
    tickets: [
      {
        externalId: 'EXT-1002',
        subject: 'Updated: Unauthorized charge on monthly invoice #9401',
        body: 'Follow-up regarding charge dispute and payment receipt revision.',
      },
      {
        externalId: 'EXT-1009',
        subject: 'Updated: Broken link on refund terms documentation',
        body: 'Re-evaluating page error and broken redirect for billing payment.',
      },
      {
        externalId: 'EXT-9901',
        subject: 'Urgent: production down on secondary redis cluster',
        body: 'Crash and error 500 when accessing cached session tokens.',
      },
      {
        externalId: 'EXT-9902',
        subject: 'Customer locked out of sign in portal',
        body: '2FA verification prompt failing repeatedly. User locked out.',
      },
      {
        externalId: 'EXT-9903',
        subject: 'Sensors delivery package damaged during transit',
        body: 'Courier tracking shows package arrived with broken enclosure probe.',
      },
    ],
  },
  null,
  2
);

export const TicketImportModal: React.FC<TicketImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [jsonText, setJsonText] = useState(SAMPLE_FEED_JSON);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ImportStatsResponse | null>(null);

  const handleImport = async () => {
    setError(null);
    setStats(null);
    setIsImporting(true);

    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.tickets || !Array.isArray(parsed.tickets)) {
        throw new Error('Payload must contain a "tickets" array of items.');
      }

      const res = await api.tickets.importTickets(parsed.tickets);
      setStats(res);
      onSuccess();
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Idempotent Ticket Feed Import"
      description="POST /api/tickets/import — Supports automated feed deduplication and human-override protection"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        {stats && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1.5">
            <div className="font-bold text-sm text-emerald-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Import Execution Completed</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
              <div className="p-2 rounded bg-white/80 border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">Total Feed</span>
                <span className="font-bold text-slate-800 text-sm">{stats.total}</span>
              </div>
              <div className="p-2 rounded bg-white/80 border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">New Imported</span>
                <span className="font-bold text-emerald-700 text-sm">{stats.importedCount}</span>
              </div>
              <div className="p-2 rounded bg-white/80 border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">Updated</span>
                <span className="font-bold text-blue-700 text-sm">{stats.updatedCount}</span>
              </div>
              <div className="p-2 rounded bg-white/80 border border-emerald-100">
                <span className="text-slate-500 block text-[10px]">Protected Overrides</span>
                <span className="font-bold text-amber-700 text-sm">{stats.skippedOverrideCount}</span>
              </div>
            </div>
            <p className="text-[11px] text-emerald-700 pt-1">
              Human-overridden categories were safely preserved against automated re-classification.
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">JSON Ingestion Payload</label>
            <button
              type="button"
              onClick={() => setJsonText(SAMPLE_FEED_JSON)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset Sample Feed
            </button>
          </div>
          <textarea
            rows={8}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50 text-slate-800"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm disabled:opacity-60 transition-colors flex items-center gap-1.5"
          >
            {isImporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Execute Import Feed</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
