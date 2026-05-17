import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCases, exportCases } from '../api';
import type { CasesParams } from '../api';
import type { PresenceAbsenceUnknown, SleepWakeState, ParalysisExtent, CorroborationLevelV2, PsychometricPresence, RepeatExperiencer } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState, Pagination,
  CorroborationBadge, Badge, Button, Select,
} from '../components/ui';
import { Shell } from '../components/Shell';

const ENTITY_PRESENCE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'none', label: 'None' },
  { value: 'unknown', label: 'Unknown' },
];

const SLEEP_WAKE_OPTIONS = [
  { value: 'fully_awake', label: 'Fully awake' },
  { value: 'drowsy', label: 'Drowsy' },
  { value: 'hypnagogic', label: 'Hypnagogic' },
  { value: 'hypnopompic', label: 'Hypnopompic' },
  { value: 'asleep', label: 'Asleep' },
  { value: 'unknown', label: 'Unknown' },
];

const PARALYSIS_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'partial', label: 'Partial' },
  { value: 'full', label: 'Full' },
  { value: 'unknown', label: 'Unknown' },
];

const CORROBORATION_OPTIONS = [
  { value: 'testimony_only', label: 'Testimony only' },
  { value: 'corroborated_by_witness', label: 'Witness' },
  { value: 'corroborated_by_physical_evidence', label: 'Physical evidence' },
  { value: 'corroborated_by_both', label: 'Both' },
  { value: 'unknown', label: 'Unknown' },
];

const HYPNOSIS_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
];

const REPEAT_OPTIONS = [
  { value: 'first_experience', label: 'First experience' },
  { value: 'repeat_experiencer', label: 'Repeat experiencer' },
  { value: 'not_reported', label: 'Not reported' },
];

export function CaseList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [entityPresence, setEntityPresence] = useState<PresenceAbsenceUnknown | ''>('');
  const [sleepWake, setSleepWake] = useState<SleepWakeState | ''>('');
  const [paralysis, setParalysis] = useState<ParalysisExtent | ''>('');
  const [corroboration, setCorroboration] = useState<CorroborationLevelV2 | ''>('');
  const [hypnosis, setHypnosis] = useState<PsychometricPresence | ''>('');
  const [repeatExp, setRepeatExp] = useState<RepeatExperiencer | ''>('');
  const [exportConfirm, setExportConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  const params: CasesParams = {
    page,
    page_size: 25,
    ...(search && { q: search }),
    ...(entityPresence && { entity_presence: entityPresence }),
    ...(sleepWake && { sleep_wake_state_at_onset: sleepWake }),
    ...(paralysis && { paralysis_reported: paralysis }),
    ...(corroboration && { corroboration_level: corroboration }),
    ...(hypnosis && { hypnosis_used: hypnosis }),
    ...(repeatExp && { repeat_experiencer: repeatExp }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cases', params],
    queryFn: () => getCases(params),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, snapshotDate } = await exportCases(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cases_export_${snapshotDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
      setExportConfirm(false);
    }
  }

  function resetFilters() {
    setSearch(''); setSearchInput('');
    setEntityPresence(''); setSleepWake('');
    setParalysis(''); setCorroboration('');
    setHypnosis(''); setRepeatExp('');
    setPage(1);
  }

  const hasFilters = search || entityPresence || sleepWake || paralysis || corroboration || hypnosis || repeatExp;

  return (
    <Shell>
      <Page
        title="Cases"
        subtitle={data ? `${data.total} cases in corpus` : undefined}
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setExportConfirm(true)}
            disabled={!data || data.total === 0}
          >
            export CSV
          </Button>
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
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="search case labels…"
              style={{
                background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '5px 10px',
                fontSize: 13, outline: 'none', width: 200,
              }}
            />
            <Button size="sm" type="submit">search</Button>
          </form>

          <Select
            options={ENTITY_PRESENCE_OPTIONS}
            placeholder="entity presence"
            value={entityPresence}
            onChange={e => { setEntityPresence(e.target.value as PresenceAbsenceUnknown | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={SLEEP_WAKE_OPTIONS}
            placeholder="sleep/wake state"
            value={sleepWake}
            onChange={e => { setSleepWake(e.target.value as SleepWakeState | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={PARALYSIS_OPTIONS}
            placeholder="paralysis"
            value={paralysis}
            onChange={e => { setParalysis(e.target.value as ParalysisExtent | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={CORROBORATION_OPTIONS}
            placeholder="corroboration"
            value={corroboration}
            onChange={e => { setCorroboration(e.target.value as CorroborationLevelV2 | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={HYPNOSIS_OPTIONS}
            placeholder="hypnosis"
            value={hypnosis}
            onChange={e => { setHypnosis(e.target.value as PsychometricPresence | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={REPEAT_OPTIONS}
            placeholder="repeat experiencer"
            value={repeatExp}
            onChange={e => { setRepeatExp(e.target.value as RepeatExperiencer | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
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
                    {['Case', 'Source', 'Entities', 'Sleep/wake', 'Corroboration', 'Status', 'Added'].map(h => (
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
                    <tr>
                      <td colSpan={7}>
                        <EmptyState message="no cases match the current filters" />
                      </td>
                    </tr>
                  )}
                  {data.items.map((c, i) => (
                    <tr
                      key={c.id}
                      className="fade-in"
                      style={{
                        borderBottom: '1px solid var(--border-dim)',
                        animationDelay: `${i * 20}ms`,
                        transition: 'background var(--t-fast)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '8px 12px', maxWidth: 300 }}>
                        <Link
                          to={`/cases/${c.id}`}
                          style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'block' }}
                        >
                          <div className="truncate" style={{ fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                            {c.case_label}
                          </div>
                        </Link>
                      </td>
                      <td style={{ padding: '8px 12px', maxWidth: 220 }}>
                        {c.source_title ? (
                          <Link
                            to={`/sources/${c.source_id}`}
                            style={{ fontSize: 11, color: 'var(--text-dim)', textDecoration: 'none' }}
                            className="truncate"
                          >
                            {c.source_title}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {c.entity_presence ? (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {c.entity_presence.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {c.sleep_wake_state_at_onset ? (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {c.sleep_wake_state_at_onset.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {c.corroboration_level ? (
                          <CorroborationBadge level={c.corroboration_level} />
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {c.reviewed ? (
                          <Badge label="reviewed" color="var(--status-ok)" bg="var(--status-ok-bg)" />
                        ) : (
                          <Badge label="unreviewed" color="var(--status-warn)" bg="var(--status-warn-bg)" />
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{c.created_at.slice(0, 10)}</div>
                        {c.created_by && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, marginTop: 1 }}>
                            by {c.created_by}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              onPage={setPage}
            />
          </>
        )}
      </Page>

      {exportConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)',
            width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 'var(--space-3)' }}>
              Export cases
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 1.5 }}>
              Export <strong>{data?.total ?? 0}</strong> case{data?.total !== 1 ? 's' : ''} as CSV
              {hasFilters ? ' (active filters applied)' : ''}.
              Response headers will include the corpus snapshot date and case count.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <Button size="sm" onClick={() => setExportConfirm(false)} disabled={exporting}>
                cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleExport} disabled={exporting}>
                {exporting ? 'exporting…' : 'export'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
