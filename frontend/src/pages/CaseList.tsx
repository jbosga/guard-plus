import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCases, exportCases } from '../api';
import type {
  PresenceAbsenceUnknown, SleepWakeState, ParalysisExtent,
  CorroborationLevelV2, PsychometricPresence, RepeatExperiencer,
} from '../types';
import {
  Page, Spinner, ErrorState, EmptyState, Pagination,
  Badge, CorroborationBadge, Button, Select, Card,
} from '../components/ui';
import { Shell } from '../components/Shell';
import { AddCaseModal } from '../components/AddCaseModal';

const PRESENCE_OPTIONS = [
  { value: 'yes',     label: 'Yes' },
  { value: 'none',    label: 'None' },
  { value: 'unknown', label: 'Unknown' },
];

const SLEEP_WAKE_OPTIONS = [
  { value: 'fully_awake',  label: 'Fully awake' },
  { value: 'drowsy',       label: 'Drowsy' },
  { value: 'hypnagogic',   label: 'Hypnagogic' },
  { value: 'hypnopompic',  label: 'Hypnopompic' },
  { value: 'asleep',       label: 'Asleep' },
  { value: 'unknown',      label: 'Unknown' },
];

const PARALYSIS_OPTIONS = [
  { value: 'none',    label: 'None' },
  { value: 'partial', label: 'Partial' },
  { value: 'full',    label: 'Full' },
  { value: 'unknown', label: 'Unknown' },
];

const CORR_OPTIONS = [
  { value: 'testimony_only',                    label: 'Testimony only' },
  { value: 'corroborated_by_witness',           label: '+ Witness' },
  { value: 'corroborated_by_physical_evidence', label: '+ Physical evidence' },
  { value: 'corroborated_by_both',              label: '+ Both' },
  { value: 'unknown',                           label: 'Unknown' },
];

const HYPNOSIS_OPTIONS = [
  { value: 'yes',     label: 'Yes' },
  { value: 'no',      label: 'No' },
  { value: 'unknown', label: 'Unknown' },
];

const REPEAT_OPTIONS = [
  { value: 'first_experience',   label: 'First experience' },
  { value: 'repeat_experiencer', label: 'Repeat experiencer' },
  { value: 'not_reported',       label: 'Not reported' },
];

function EntityPresenceDot({ value }: { value: PresenceAbsenceUnknown | null }) {
  if (!value || value === 'unknown') return <span style={{ color: 'var(--text-dim)' }}>—</span>;
  const color = value === 'yes' ? 'var(--status-ok)' : 'var(--text-dim)';
  return (
    <span style={{ color, fontSize: 11, fontWeight: 500 }}>
      {value === 'yes' ? 'yes' : 'none'}
    </span>
  );
}

export function CaseList() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [entityPresence, setEntityPresence] = useState<PresenceAbsenceUnknown | ''>('');
  const [sleepWake, setSleepWake] = useState<SleepWakeState | ''>('');
  const [paralysis, setParalysis] = useState<ParalysisExtent | ''>('');
  const [corroboration, setCorroboration] = useState<CorroborationLevelV2 | ''>('');
  const [hypnosis, setHypnosis] = useState<PsychometricPresence | ''>('');
  const [repeatExperiencer, setRepeatExperiencer] = useState<RepeatExperiencer | ''>('');
  const [showAdd, setShowAdd] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const params = {
    page,
    page_size: 30,
    ...(q && { q }),
    ...(entityPresence && { entity_presence: entityPresence }),
    ...(sleepWake && { sleep_wake_state_at_onset: sleepWake }),
    ...(paralysis && { paralysis_reported: paralysis }),
    ...(corroboration && { corroboration_level: corroboration }),
    ...(hypnosis && { hypnosis_used: hypnosis }),
    ...(repeatExperiencer && { repeat_experiencer: repeatExperiencer }),
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cases', params],
    queryFn: () => getCases(params),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(qInput);
    setPage(1);
  }

  function resetFilters() {
    setQ(''); setQInput('');
    setEntityPresence(''); setSleepWake(''); setParalysis('');
    setCorroboration(''); setHypnosis(''); setRepeatExperiencer('');
    setPage(1);
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const { blob, caseCount, snapshotDate } = await exportCases(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cases_export_${snapshotDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportConfirm(false);
    } finally {
      setExportLoading(false);
    }
  }

  const hasFilters = q || entityPresence || sleepWake || paralysis || corroboration || hypnosis || repeatExperiencer;

  return (
    <Shell>
      <Page
        title="Cases"
        subtitle={data ? `${data.total} case records in corpus` : undefined}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button size="sm" onClick={() => setShowExportConfirm(true)}>↓ export CSV</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>+ add case</Button>
          </div>
        }
      >
        {/* Filters */}
        <div style={{
          display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap',
          marginBottom: 'var(--space-4)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--border-dim)',
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              placeholder="search labels, notes…"
              style={{
                background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '5px 10px',
                fontSize: 13, outline: 'none', width: 200,
              }}
            />
            <Button size="sm" type="submit">search</Button>
          </form>

          <Select options={PRESENCE_OPTIONS} placeholder="entity presence"
            value={entityPresence}
            onChange={e => { setEntityPresence(e.target.value as PresenceAbsenceUnknown | ''); setPage(1); }}
            style={{ fontSize: 11 }} />
          <Select options={SLEEP_WAKE_OPTIONS} placeholder="sleep/wake state"
            value={sleepWake}
            onChange={e => { setSleepWake(e.target.value as SleepWakeState | ''); setPage(1); }}
            style={{ fontSize: 11 }} />
          <Select options={PARALYSIS_OPTIONS} placeholder="paralysis"
            value={paralysis}
            onChange={e => { setParalysis(e.target.value as ParalysisExtent | ''); setPage(1); }}
            style={{ fontSize: 11 }} />
          <Select options={CORR_OPTIONS} placeholder="corroboration"
            value={corroboration}
            onChange={e => { setCorroboration(e.target.value as CorroborationLevelV2 | ''); setPage(1); }}
            style={{ fontSize: 11 }} />
          <Select options={HYPNOSIS_OPTIONS} placeholder="hypnosis used"
            value={hypnosis}
            onChange={e => { setHypnosis(e.target.value as PsychometricPresence | ''); setPage(1); }}
            style={{ fontSize: 11 }} />
          <Select options={REPEAT_OPTIONS} placeholder="repeat experiencer"
            value={repeatExperiencer}
            onChange={e => { setRepeatExperiencer(e.target.value as RepeatExperiencer | ''); setPage(1); }}
            style={{ fontSize: 11 }} />

          {hasFilters && (
            <Button size="sm" onClick={resetFilters} style={{ color: 'var(--text-dim)' }}>
              × clear
            </Button>
          )}
        </div>

        {isLoading && <Spinner />}
        {isError && <ErrorState message="Failed to load cases" />}

        {data && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontFamily: 'var(--font-mono)', fontSize: 12,
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    {['Case label', 'Source', 'Entities', 'Sleep/wake', 'Corroboration', 'Reviewed', 'Added'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '6px 12px',
                        fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr><td colSpan={7}><EmptyState message="no cases match the current filters" /></td></tr>
                  )}
                  {data.items.map((c, i) => (
                    <tr
                      key={c.id}
                      className="fade-in"
                      style={{
                        borderBottom: '1px solid var(--border-dim)',
                        animationDelay: `${i * 15}ms`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-0)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '8px 12px', maxWidth: 300 }}>
                        <Link
                          to={`/cases/${c.id}`}
                          style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                        >
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                            {c.case_label}
                          </div>
                          {!c.reviewed && (
                            <span style={{
                              fontSize: 9, color: 'var(--status-warn)',
                              background: 'var(--status-warn-bg)',
                              border: '1px solid var(--status-warn)44',
                              padding: '1px 5px', borderRadius: 10,
                              marginTop: 2, display: 'inline-block',
                            }}>
                              unreviewed
                            </span>
                          )}
                        </Link>
                      </td>
                      <td style={{ padding: '8px 12px', maxWidth: 200 }}>
                        {c.source_title ? (
                          <Link
                            to={`/sources/${c.source_id}`}
                            style={{
                              fontSize: 11, color: 'var(--text-secondary)',
                              textDecoration: 'none', display: 'block',
                            }}
                            className="truncate"
                          >
                            {c.source_title}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <EntityPresenceDot value={c.entity_presence} />
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {c.sleep_wake_state_at_onset ? (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {c.sleep_wake_state_at_onset.replace(/_/g, ' ')}
                          </span>
                        ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {c.corroboration_level
                          ? <CorroborationBadge level={c.corroboration_level} />
                          : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {c.reviewed ? (
                          <Badge label="reviewed" color="var(--status-ok)" bg="var(--status-ok-bg)" />
                        ) : (
                          <Badge label="pending" color="var(--text-dim)" bg="var(--bg-2)" />
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {c.created_at.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </>
        )}
      </Page>

      {showAdd && (
        <AddCaseModal
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Export confirmation modal */}
      {showExportConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={e => e.target === e.currentTarget && setShowExportConfirm(false)}>
          <Card style={{ padding: 'var(--space-5)', width: 400 }}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Export case corpus
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Export {hasFilters ? 'filtered' : 'all'} cases as CSV.
                {data && ` ${data.total} case${data.total !== 1 ? 's' : ''} will be included.`}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
                Response headers will include snapshot date and case count for provenance tracking.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <Button size="sm" onClick={() => setShowExportConfirm(false)}>cancel</Button>
              <Button size="sm" variant="primary" disabled={exportLoading} onClick={handleExport}>
                {exportLoading ? 'exporting…' : '↓ download CSV'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Shell>
  );
}
