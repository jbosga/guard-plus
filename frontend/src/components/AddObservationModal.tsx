import React, { useState } from 'react';
import { createObservation } from '../api';
import type { ObservationEpistemicStatus, ObservationSourceType, CasesIncluded } from '../types';
import { Button, Input, Select } from './ui';

interface Props {
  sourceId?: string;
  defaultSourceType?: ObservationSourceType;
  onClose: () => void;
  onCreated: () => void;
}

const EPISTEMIC_OPTIONS = [
  { value: 'reported',     label: 'Reported' },
  { value: 'corroborated', label: 'Corroborated' },
  { value: 'contested',    label: 'Contested' },
  { value: 'artefactual',  label: 'Artefactual' },
  { value: 'retracted',    label: 'Retracted' },
];

const CASES_INCLUDED_OPTIONS = [
  { value: 'all',             label: 'All cases' },
  { value: 'filtered_subset', label: 'Filtered subset' },
];

const labelStyle: React.CSSProperties = {
  fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
};

export function AddObservationModal({ sourceId, defaultSourceType = 'literature', onClose, onCreated }: Props) {
  const [sourceType, setSourceType] = useState<ObservationSourceType>(defaultSourceType);
  const locked = sourceId != null;

  const [content, setContent] = useState('');
  const [epistemicStatus, setEpistemicStatus] = useState<ObservationEpistemicStatus>('reported');
  const [authoredBy, setAuthoredBy] = useState(() => localStorage.getItem('username') ?? '');
  const [verbatim, setVerbatim] = useState(false);
  const [pageRef, setPageRef] = useState('');

  // corpus-derived fields
  const [queryDefinition, setQueryDefinition] = useState('');
  const [analysisTool, setAnalysisTool] = useState('');
  const [snapshotDate, setSnapshotDate] = useState('');
  const [caseCount, setCaseCount] = useState('');
  const [casesIncluded, setCasesIncluded] = useState<CasesIncluded>('all');
  const [filterDescription, setFilterDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCorpusDerived = sourceType === 'corpus_derived';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    if (isCorpusDerived && (!queryDefinition.trim() || !snapshotDate || !caseCount)) return;

    setLoading(true);
    setError('');
    try {
      await createObservation({
        observation_source_type: sourceType,
        content: content.trim(),
        epistemic_status: epistemicStatus,
        authored_by: authoredBy.trim() || undefined,
        ...(isCorpusDerived
          ? {
              source_id: undefined,
              query_definition: queryDefinition.trim(),
              analysis_tool: analysisTool.trim() || undefined,
              corpus_snapshot_date: snapshotDate,
              case_count_at_snapshot: parseInt(caseCount, 10),
              cases_included: casesIncluded,
              case_filter_description: casesIncluded === 'filtered_subset' ? filterDescription.trim() || undefined : undefined,
            }
          : {
              source_id: sourceId,
              verbatim,
              page_ref: pageRef.trim() || undefined,
            }
        ),
      });
      onCreated();
    } catch {
      setError('Failed to create observation');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = content.trim() &&
    (!isCorpusDerived || (queryDefinition.trim() && snapshotDate && caseCount));

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
        width: 620,
        maxHeight: '90vh',
        overflow: 'auto',
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
            Add Observation
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Source type toggle — hidden when sourceId is pre-filled (context is unambiguous) */}
        {!locked && <div style={{
          display: 'flex', gap: 2, marginBottom: 'var(--space-5)',
          border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)',
          overflow: 'hidden', width: 'fit-content',
        }}>
          {(['literature', 'corpus_derived'] as ObservationSourceType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setSourceType(t)}
              style={{
                background: sourceType === t ? 'var(--accent)' : 'transparent',
                color: sourceType === t ? '#fff' : 'var(--text-dim)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                letterSpacing: '0.06em', padding: '5px 14px',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t === 'literature' ? 'Literature' : 'Corpus-derived'}
            </button>
          ))}
        </div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Content */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={labelStyle}>Content *</span>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              autoFocus
              required
              style={{
                background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '6px 10px',
                fontSize: 13, outline: 'none', resize: 'vertical',
                fontFamily: verbatim && !isCorpusDerived ? 'var(--font-mono)' : 'var(--font-sans)',
              }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Select
              label="Epistemic status"
              options={EPISTEMIC_OPTIONS}
              value={epistemicStatus}
              onChange={e => setEpistemicStatus(e.target.value as ObservationEpistemicStatus)}
            />
            <Input
              label="Authored by"
              value={authoredBy}
              onChange={e => setAuthoredBy(e.target.value)}
              placeholder="researcher name"
            />
          </div>

          {/* Literature-only fields */}
          {!isCorpusDerived && (
            <>
              <Input
                label="Page ref"
                value={pageRef}
                onChange={e => setPageRef(e.target.value)}
                placeholder="42"
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={verbatim}
                  onChange={e => setVerbatim(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                  verbatim quote
                </span>
              </label>
            </>
          )}

          {/* Corpus-derived fields */}
          {isCorpusDerived && (
            <div style={{
              padding: 'var(--space-4)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
            }}>
              <span style={labelStyle}>Corpus-derived provenance</span>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={labelStyle}>Query / procedure *</span>
                <textarea
                  value={queryDefinition}
                  onChange={e => setQueryDefinition(e.target.value)}
                  rows={3}
                  required
                  placeholder="Describe the code or procedure used to produce this result…"
                  style={{
                    background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '6px 10px',
                    fontSize: 13, outline: 'none', resize: 'vertical',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <Input
                  label="Analysis tool"
                  value={analysisTool}
                  onChange={e => setAnalysisTool(e.target.value)}
                  placeholder="Python/pandas"
                />
                <Input
                  label="Snapshot date *"
                  type="date"
                  value={snapshotDate}
                  onChange={e => setSnapshotDate(e.target.value)}
                />
                <Input
                  label="Case count at snapshot *"
                  type="number"
                  min="0"
                  value={caseCount}
                  onChange={e => setCaseCount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <Select
                label="Cases included"
                options={CASES_INCLUDED_OPTIONS}
                value={casesIncluded}
                onChange={e => setCasesIncluded(e.target.value as CasesIncluded)}
              />

              {casesIncluded === 'filtered_subset' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={labelStyle}>Filter description</span>
                  <textarea
                    value={filterDescription}
                    onChange={e => setFilterDescription(e.target.value)}
                    rows={2}
                    placeholder="Describe the filters applied to the case corpus…"
                    style={{
                      background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '6px 10px',
                      fontSize: 13, outline: 'none', resize: 'vertical',
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {error && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--status-error)' }}>
              ✗ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" onClick={onClose}>cancel</Button>
            <Button type="submit" variant="primary" disabled={loading || !canSubmit}>
              {loading ? 'saving…' : 'add observation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
