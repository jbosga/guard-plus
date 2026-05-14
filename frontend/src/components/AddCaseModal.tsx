import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSources, createCase } from '../api';
import type { ExtractionMethod } from '../types';
import { Button, Input, Select } from './ui';

interface Props {
  sourceId?: string;
  onClose: () => void;
}

const EXTRACTION_OPTIONS = [
  { value: 'manual',      label: 'Manual' },
  { value: 'ai_assisted', label: 'AI Assisted' },
  { value: 'imported',    label: 'Imported' },
];

export function AddCaseModal({ sourceId: presetSourceId, onClose }: Props) {
  const navigate = useNavigate();
  const [caseLabel, setCaseLabel] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState(presetSourceId ?? '');
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: sources } = useQuery({
    queryKey: ['sources', { source_type: 'case_report', page_size: 200 }],
    queryFn: () => getSources({ source_type: 'case_report', page_size: 200 }),
    enabled: !presetSourceId,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseLabel.trim() || !selectedSourceId) return;
    setLoading(true);
    setError('');
    try {
      const created = await createCase({
        source_id: selectedSourceId,
        case_label: caseLabel.trim(),
        extraction_method: extractionMethod,
      });
      navigate(`/cases/${created.id}`);
    } catch {
      setError('Failed to create case');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border-mid)',
        borderRadius: 4,
        width: 480,
        padding: 'var(--space-5)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 'var(--space-5)',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}>
            New Case
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Case label *"
            value={caseLabel}
            onChange={e => setCaseLabel(e.target.value)}
            required
            autoFocus
            placeholder="e.g. Strieber 1987"
          />

          {!presetSourceId && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                Source *
              </span>
              <select
                required
                value={selectedSourceId}
                onChange={e => setSelectedSourceId(e.target.value)}
                style={{
                  background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                  padding: '5px 10px', outline: 'none', fontSize: 13,
                }}
              >
                <option value="">— select a case report source —</option>
                {sources?.items.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </label>
          )}

          <Select
            label="Extraction method"
            options={EXTRACTION_OPTIONS}
            value={extractionMethod}
            onChange={e => setExtractionMethod(e.target.value as ExtractionMethod)}
          />

          {error && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--status-error)' }}>
              ✗ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" onClick={onClose}>cancel</Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !caseLabel.trim() || !selectedSourceId}
            >
              {loading ? 'creating…' : 'create case'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
