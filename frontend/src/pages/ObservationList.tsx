import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getObservations, updateObservation } from '../api';
import type { ObservationEpistemicStatus, ContentType } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState, Pagination,
  ObservationEpistemicBadge, ContentTypeBadge, CollectionMethodBadge,
  Button, Select,
} from '../components/ui';
import { Shell } from '../components/Shell';

const EP_OPTIONS: { value: ObservationEpistemicStatus; label: string }[] = [
  { value: 'reported',     label: 'Reported' },
  { value: 'corroborated', label: 'Corroborated' },
  { value: 'contested',    label: 'Contested' },
  { value: 'artefactual',  label: 'Artefactual' },
  { value: 'retracted',    label: 'Retracted' },
];

const CT_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'experiential',      label: 'Experiential' },
  { value: 'behavioral',        label: 'Behavioral' },
  { value: 'physiological',     label: 'Physiological' },
  { value: 'environmental',     label: 'Environmental' },
  { value: 'testimonial',       label: 'Testimonial' },
  { value: 'documentary_trace', label: 'Documentary trace' },
];

const ED_OPTIONS = [
  { value: 'direct',      label: 'Direct' },
  { value: 'summarized',  label: 'Summarized' },
  { value: 'aggregated',  label: 'Aggregated' },
  { value: 'derived',     label: 'Derived' },
];

const CM_OPTIONS = [
  { value: 'spontaneous_report',    label: 'Spontaneous report' },
  { value: 'structured_interview',  label: 'Structured interview' },
  { value: 'hypnotic_regression',   label: 'Hypnotic regression' },
  { value: 'questionnaire',         label: 'Questionnaire' },
  { value: 'clinical_assessment',   label: 'Clinical assessment' },
  { value: 'passive_recording',     label: 'Passive recording' },
  { value: 'investigator_inference',label: 'Investigator inference' },
];

export function ObservationList() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [epistemicStatus, setEpistemicStatus] = useState<ObservationEpistemicStatus | ''>('');
  const [contentType, setContentType] = useState<ContentType | ''>('');
  const [epistemicDistance, setEpistemicDistance] = useState('');
  const [collectionMethod, setCollectionMethod] = useState('');
  const [aiExtracted, setAiExtracted] = useState<'' | 'true' | 'false'>('');
  const [unreviewed, setUnreviewed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const qc = useQueryClient();

  const params = {
    page,
    page_size: 50,
    ...(search && { search }),
    ...(epistemicStatus && { epistemic_status: epistemicStatus }),
    ...(contentType && { content_type: contentType }),
    ...(epistemicDistance && { epistemic_distance: epistemicDistance }),
    ...(collectionMethod && { collection_method: collectionMethod }),
    ...(aiExtracted !== '' && { ai_extracted: aiExtracted === 'true' }),
    ...(unreviewed && { unreviewed: true }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['observations', params],
    queryFn: () => getObservations(params),
  });

  const mutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; epistemic_status?: ObservationEpistemicStatus; content_type?: ContentType }) =>
      updateObservation(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['observations'] });
      setEditingId(null);
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function reset() {
    setSearch(''); setSearchInput('');
    setEpistemicStatus(''); setContentType('');
    setEpistemicDistance(''); setCollectionMethod('');
    setAiExtracted(''); setUnreviewed(false);
    setPage(1);
  }

  const hasFilters = search || epistemicStatus || contentType || epistemicDistance || collectionMethod || aiExtracted || unreviewed;

  return (
    <Shell>
      <Page
        title="Observations"
        subtitle={data ? `${data.total} observations in corpus` : undefined}
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
            options={CT_OPTIONS}
            placeholder="all content types"
            value={contentType}
            onChange={e => { setContentType(e.target.value as ContentType | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={ED_OPTIONS}
            placeholder="all distances"
            value={epistemicDistance}
            onChange={e => { setEpistemicDistance(e.target.value); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={CM_OPTIONS}
            placeholder="all methods"
            value={collectionMethod}
            onChange={e => { setCollectionMethod(e.target.value); setPage(1); }}
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
                      <ContentTypeBadge type={obs.content_type} />
                      <CollectionMethodBadge method={obs.collection_method} />
                      {obs.epistemic_distance === 'aggregated' && obs.sample_n != null && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          color: 'var(--text-dim)',
                          border: '1px solid var(--border-dim)',
                          padding: '1px 6px', borderRadius: 20,
                        }}>
                          n={obs.sample_n}
                        </span>
                      )}
                      {obs.page_ref && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                          p.{obs.page_ref}
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
                        <Link
                          to={`/sources/${obs.source_id}`}
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}
                        >
                          → source
                        </Link>
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

                    {/* Source title */}
                    {obs.source_title && (
                      <div style={{
                        marginTop: 'var(--space-1)',
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--text-dim)',
                      }}>
                        {obs.source_title}
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
    </Shell>
  );
}

// ── Inline edit row ───────────────────────────────────────────────────────────

interface ObsEditRowProps {
  obs: {
    id: string;
    content: string;
    epistemic_status: ObservationEpistemicStatus;
    content_type: ContentType;
    verbatim: boolean;
    page_ref: string | null;
    source_id: string;
  };
  index: number;
  busy: boolean;
  onSave: (payload: { epistemic_status: ObservationEpistemicStatus; content_type: ContentType }) => void;
  onCancel: () => void;
}

function ObsEditRow({ obs, index, busy, onSave, onCancel }: ObsEditRowProps) {
  const [epistemicStatus, setEpistemicStatus] = useState<ObservationEpistemicStatus>(obs.epistemic_status);
  const [contentType, setContentType] = useState<ContentType>(obs.content_type);

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
        <Select
          options={CT_OPTIONS}
          value={contentType}
          onChange={e => setContentType(e.target.value as ContentType)}
          style={{ fontSize: 11 }}
        />
        {obs.page_ref && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            p.{obs.page_ref}
          </span>
        )}
        <Link
          to={`/sources/${obs.source_id}`}
          style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}
        >
          → source
        </Link>
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
          onClick={() => onSave({ epistemic_status: epistemicStatus, content_type: contentType })}
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
