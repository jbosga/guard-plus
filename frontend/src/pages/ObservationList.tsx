import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getObservations, updateObservation, deleteObservation } from '../api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { ObservationEpistemicStatus, ObservationSourceType } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState, Pagination,
  ObservationEpistemicBadge,
  Button, Select,
} from '../components/ui';
import { Shell } from '../components/Shell';
import { AddObservationModal } from '../components/AddObservationModal';

const EP_OPTIONS: { value: ObservationEpistemicStatus; label: string }[] = [
  { value: 'reported',     label: 'Reported' },
  { value: 'corroborated', label: 'Corroborated' },
  { value: 'contested',    label: 'Contested' },
  { value: 'artefactual',  label: 'Artefactual' },
  { value: 'retracted',    label: 'Retracted' },
];

const SOURCE_TYPE_OPTIONS: { value: ObservationSourceType; label: string }[] = [
  { value: 'literature',      label: 'Literature' },
  { value: 'corpus_derived',  label: 'Corpus-derived' },
];

export function ObservationList() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [epistemicStatus, setEpistemicStatus] = useState<ObservationEpistemicStatus | ''>('');
  const [observationSourceType, setObservationSourceType] = useState<ObservationSourceType | ''>('');
  const [aiExtracted, setAiExtracted] = useState<'' | 'true' | 'false'>('');
  const [unreviewed, setUnreviewed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const qc = useQueryClient();
  const currentUser = useCurrentUser();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const params = {
    page,
    page_size: 50,
    ...(search && { search }),
    ...(epistemicStatus && { epistemic_status: epistemicStatus }),
    ...(observationSourceType && { observation_source_type: observationSourceType }),
    ...(aiExtracted !== '' && { ai_extracted: aiExtracted === 'true' }),
    ...(unreviewed && { unreviewed: true }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['observations', params],
    queryFn: () => getObservations(params),
  });

  const mutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; epistemic_status?: ObservationEpistemicStatus }) =>
      updateObservation(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['observations'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteObservation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['observations'] });
      setConfirmDeleteId(null);
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function reset() {
    setSearch(''); setSearchInput('');
    setEpistemicStatus(''); setObservationSourceType('');
    setAiExtracted(''); setUnreviewed(false);
    setPage(1);
  }

  const hasFilters = search || epistemicStatus || observationSourceType || aiExtracted || unreviewed;

  return (
    <Shell>
      <Page
        title="Observations"
        subtitle={data ? `${data.total} observations in corpus` : undefined}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            + add observation
          </Button>
        }
      >
        {/* Filter bar */}
        <div style={{
          display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end',
          marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--border-dim)',
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="search observation text…"
              style={{
                background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '5px 10px',
                fontSize: 13, outline: 'none', width: 220,
              }}
            />
            <Button size="sm" type="submit">search</Button>
          </form>

          <Select
            options={EP_OPTIONS}
            placeholder="all epistemic"
            value={epistemicStatus}
            onChange={e => { setEpistemicStatus(e.target.value as ObservationEpistemicStatus | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={SOURCE_TYPE_OPTIONS}
            placeholder="all source types"
            value={observationSourceType}
            onChange={e => { setObservationSourceType(e.target.value as ObservationSourceType | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={[
              { value: 'true', label: 'AI extracted' },
              { value: 'false', label: 'Manual' },
            ]}
            placeholder="all origins"
            value={aiExtracted}
            onChange={e => { setAiExtracted(e.target.value as '' | 'true' | 'false'); setPage(1); }}
            style={{ fontSize: 11 }}
          />

          <label style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: unreviewed ? 'var(--status-warn)' : 'var(--text-dim)',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={unreviewed}
              onChange={e => { setUnreviewed(e.target.checked); setPage(1); }}
              style={{ accentColor: 'var(--status-warn)' }}
            />
            unreviewed only
          </label>

          {hasFilters && (
            <Button size="sm" onClick={reset} style={{ color: 'var(--text-dim)' }}>
              × clear
            </Button>
          )}
        </div>

        {isLoading && <Spinner />}
        {isError && <ErrorState message="Failed to load observations" />}

        {data && (
          <>
            {data.items.length === 0 && (
              <EmptyState message="no observations match the current filters" />
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.items.map((obs, i) =>
                editingId === obs.id ? (
                  <ObsEditRow
                    key={obs.id}
                    obs={obs}
                    index={i}
                    busy={mutation.isPending}
                    onSave={(payload) => mutation.mutate({ id: obs.id, ...payload })}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    key={obs.id}
                    className="fade-in"
                    style={{
                      padding: 'var(--space-4) 0',
                      borderBottom: '1px solid var(--border-dim)',
                      animationDelay: `${i * 15}ms`,
                    }}
                  >
                    {/* Top row: badges + source link */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      marginBottom: 'var(--space-2)', flexWrap: 'wrap',
                    }}>
                      <ObservationEpistemicBadge status={obs.epistemic_status} />

                      {obs.observation_source_type === 'corpus_derived' && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          color: 'var(--accent)',
                          border: '1px solid var(--accent)44',
                          padding: '1px 7px', borderRadius: 20,
                        }}>
                          corpus-derived
                        </span>
                      )}

                      {obs.staleness_flag && (
                        <span
                          title={`Computed against ${obs.case_count_at_snapshot} cases; corpus may have grown since ${obs.corpus_snapshot_date}`}
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: 10,
                            color: 'var(--status-warn)',
                            background: 'var(--status-warn-bg)',
                            border: '1px solid var(--status-warn)44',
                            padding: '1px 7px', borderRadius: 20,
                            cursor: 'help',
                          }}
                        >
                          ⚠ stale
                        </span>
                      )}

                      {obs.page_ref && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                          p.{obs.page_ref}
                        </span>
                      )}

                      {obs.authored_by && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                          {obs.authored_by}
                        </span>
                      )}

                      {obs.created_by && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                          added by {obs.created_by}
                        </span>
                      )}

                      {obs.ai_extracted && !obs.reviewed_at && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          color: 'var(--status-warn)',
                          background: 'var(--status-warn-bg)',
                          border: '1px solid var(--status-warn)44',
                          padding: '1px 7px', borderRadius: 20,
                        }}>
                          unreviewed
                        </span>
                      )}

                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <button
                          onClick={() => setEditingId(obs.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: 'var(--font-mono)', fontSize: 10,
                            color: 'var(--text-dim)', padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                        >
                          edit
                        </button>
                        {currentUser?.is_superuser && (
                          confirmDeleteId === obs.id ? (
                            <>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--status-error)' }}>delete?</span>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '2px 4px' }}
                              >no</button>
                              <button
                                onClick={() => deleteMutation.mutate(obs.id)}
                                disabled={deleteMutation.isPending}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--status-error)', padding: '2px 4px' }}
                              >yes</button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(obs.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '2px 6px' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-error)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                            >
                              delete
                            </button>
                          )
                        )}
                        {obs.source_id && (
                          <Link
                            to={`/sources/${obs.source_id}`}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}
                          >
                            → source
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <p style={{
                      fontSize: 13,
                      fontFamily: obs.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.65,
                      maxWidth: 860,
                    }}>
                      {obs.content}
                    </p>

                    {/* Source title or corpus-derived provenance */}
                    {obs.source_title && (
                      <div style={{
                        marginTop: 'var(--space-1)',
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--text-dim)',
                      }}>
                        {obs.source_title}
                      </div>
                    )}
                    {obs.observation_source_type === 'corpus_derived' && obs.analysis_tool && (
                      <div style={{
                        marginTop: 'var(--space-1)',
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--text-dim)',
                      }}>
                        {obs.analysis_tool} · {obs.corpus_snapshot_date} · n={obs.case_count_at_snapshot}
                      </div>
                    )}

                    {/* Tags */}
                    {obs.tags.length > 0 && (
                      <div style={{
                        display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap',
                        marginTop: 'var(--space-2)',
                      }}>
                        {obs.tags.map(tag => (
                          <span key={tag.id} style={{
                            fontFamily: 'var(--font-mono)', fontSize: 9,
                            color: 'var(--text-dim)',
                            border: '1px solid var(--border-dim)',
                            padding: '1px 5px', borderRadius: 2,
                            letterSpacing: '0.04em',
                          }}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </>
        )}
      </Page>

      {showAdd && (
        <AddObservationModal
          defaultSourceType="corpus_derived"
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ['observations'] });
          }}
        />
      )}
    </Shell>
  );
}

// ── Inline edit row ───────────────────────────────────────────────────────────

interface ObsEditRowProps {
  obs: {
    id: string;
    content: string;
    epistemic_status: ObservationEpistemicStatus;
    verbatim: boolean;
    page_ref: string | null;
    source_id: string | null;
  };
  index: number;
  busy: boolean;
  onSave: (payload: { epistemic_status: ObservationEpistemicStatus }) => void;
  onCancel: () => void;
}

function ObsEditRow({ obs, index, busy, onSave, onCancel }: ObsEditRowProps) {
  const [epistemicStatus, setEpistemicStatus] = useState<ObservationEpistemicStatus>(obs.epistemic_status);

  return (
    <div
      className="fade-in"
      style={{
        padding: 'var(--space-4) 0',
        borderBottom: '1px solid var(--border-dim)',
        animationDelay: `${index * 15}ms`,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        marginBottom: 'var(--space-3)', flexWrap: 'wrap',
      }}>
        <Select
          options={EP_OPTIONS}
          value={epistemicStatus}
          onChange={e => setEpistemicStatus(e.target.value as ObservationEpistemicStatus)}
          style={{ fontSize: 11 }}
        />
        {obs.page_ref && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            p.{obs.page_ref}
          </span>
        )}
        {obs.source_id && (
          <Link
            to={`/sources/${obs.source_id}`}
            style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}
          >
            → source
          </Link>
        )}
      </div>

      <p style={{
        fontSize: 13,
        fontFamily: obs.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
        color: 'var(--text-primary)',
        lineHeight: 1.65,
        maxWidth: 860,
        marginBottom: 'var(--space-3)',
      }}>
        {obs.content}
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button
          size="sm"
          variant="primary"
          disabled={busy}
          onClick={() => onSave({ epistemic_status: epistemicStatus })}
        >
          save
        </Button>
        <Button size="sm" onClick={onCancel} disabled={busy}>
          cancel
        </Button>
      </div>
    </div>
  );
}
