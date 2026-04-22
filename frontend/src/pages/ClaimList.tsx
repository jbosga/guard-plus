import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClaims, updateClaim } from '../api';
import type { EpistemicStatus, ClaimType } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState, Pagination,
  EpistemicBadge, ClaimTypeBadge, Button, Select,
} from '../components/ui';
import { Shell } from '../components/Shell';

const EP_OPTIONS: { value: EpistemicStatus; label: string }[] = [
  { value: 'asserted', label: 'Asserted' },
  { value: 'observed', label: 'Observed' },
  { value: 'inferred', label: 'Inferred' },
  { value: 'speculative', label: 'Speculative' },
  { value: 'contested', label: 'Contested' },
  { value: 'retracted', label: 'Retracted' },
];

const CT_OPTIONS: { value: ClaimType; label: string }[] = [
  { value: 'phenomenological', label: 'Phenomenological' },
  { value: 'causal', label: 'Causal' },
  { value: 'correlational', label: 'Correlational' },
  { value: 'definitional', label: 'Definitional' },
  { value: 'methodological', label: 'Methodological' },
];

export function ClaimList() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [epistemicStatus, setEpistemicStatus] = useState<EpistemicStatus | ''>('');
  const [claimType, setClaimType] = useState<ClaimType | ''>('');
  const [aiExtracted, setAiExtracted] = useState<'' | 'true' | 'false'>('');
  const [unreviewed, setUnreviewed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const qc = useQueryClient();

  const params = {
    page,
    page_size: 50,
    ...(search && { search }),
    ...(epistemicStatus && { epistemic_status: epistemicStatus }),
    ...(claimType && { claim_type: claimType }),
    ...(aiExtracted !== '' && { ai_extracted: aiExtracted === 'true' }),
    ...(unreviewed && { unreviewed: true }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['claims', params],
    queryFn: () => getClaims(params),
  });

  const mutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; claim_text?: string; epistemic_status?: EpistemicStatus; claim_type?: ClaimType }) =>
      updateClaim(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['claims'] });
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
    setEpistemicStatus(''); setClaimType('');
    setAiExtracted(''); setUnreviewed(false);
    setPage(1);
  }

  const hasFilters = search || epistemicStatus || claimType || aiExtracted || unreviewed;

  return (
    <Shell>
      <Page
        title="Claims"
        subtitle={data ? `${data.total} claims in corpus` : undefined}
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
              placeholder="search claim text…"
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
            onChange={e => { setEpistemicStatus(e.target.value as EpistemicStatus | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={CT_OPTIONS}
            placeholder="all types"
            value={claimType}
            onChange={e => { setClaimType(e.target.value as ClaimType | ''); setPage(1); }}
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
        {isError && <ErrorState message="Failed to load claims" />}

        {data && (
          <>
            {data.items.length === 0 && (
              <EmptyState message="no claims match the current filters" />
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data.items.map((claim, i) =>
                editingId === claim.id ? (
                  <ClaimEditRow
                    key={claim.id}
                    claim={claim}
                    index={i}
                    busy={mutation.isPending}
                    onSave={(payload) => mutation.mutate({ id: claim.id, ...payload })}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    key={claim.id}
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
                      <EpistemicBadge status={claim.epistemic_status} />
                      <ClaimTypeBadge type={claim.claim_type} />
                      {claim.page_ref && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10,
                          color: 'var(--text-dim)',
                        }}>
                          p.{claim.page_ref}
                        </span>
                      )}
                      {claim.ai_extracted && !claim.reviewed_at && (
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
                          onClick={() => setEditingId(claim.id)}
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
                          to={`/sources/${claim.source_id}`}
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: 10,
                            color: 'var(--text-dim)',
                          }}
                        >
                          → source
                        </Link>
                      </div>
                    </div>

                    {/* Claim text */}
                    <p style={{
                      fontSize: 13,
                      fontFamily: claim.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
                      color: 'var(--text-primary)',
                      lineHeight: 1.65,
                      maxWidth: 860,
                    }}>
                      {claim.claim_text}
                    </p>

                    {/* Tags */}
                    {claim.tags.length > 0 && (
                      <div style={{
                        display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap',
                        marginTop: 'var(--space-2)',
                      }}>
                        {claim.tags.map(tag => (
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

interface ClaimEditRowProps {
  claim: {
    id: string;
    claim_text: string;
    epistemic_status: EpistemicStatus;
    claim_type: ClaimType;
    verbatim: boolean;
    page_ref: string | null;
    source_id: string;
  };
  index: number;
  busy: boolean;
  onSave: (payload: { claim_text: string; epistemic_status: EpistemicStatus; claim_type: ClaimType }) => void;
  onCancel: () => void;
}

function ClaimEditRow({ claim, index, busy, onSave, onCancel }: ClaimEditRowProps) {
  const [text, setText] = useState(claim.claim_text);
  const [epistemicStatus, setEpistemicStatus] = useState<EpistemicStatus>(claim.epistemic_status);
  const [claimType, setClaimType] = useState<ClaimType>(claim.claim_type);

  return (
    <div
      className="fade-in"
      style={{
        padding: 'var(--space-4) 0',
        borderBottom: '1px solid var(--border-dim)',
        animationDelay: `${index * 15}ms`,
      }}
    >
      {/* Selects row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        marginBottom: 'var(--space-3)', flexWrap: 'wrap',
      }}>
        <Select
          options={EP_OPTIONS}
          value={epistemicStatus}
          onChange={e => setEpistemicStatus(e.target.value as EpistemicStatus)}
          style={{ fontSize: 11 }}
        />
        <Select
          options={CT_OPTIONS}
          value={claimType}
          onChange={e => setClaimType(e.target.value as ClaimType)}
          style={{ fontSize: 11 }}
        />
        {claim.page_ref && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            p.{claim.page_ref}
          </span>
        )}
        <Link
          to={`/sources/${claim.source_id}`}
          style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}
        >
          → source
        </Link>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        style={{
          width: '100%', maxWidth: 860, boxSizing: 'border-box',
          background: 'var(--bg-0)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
          fontFamily: claim.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: 13, lineHeight: 1.65, padding: '8px 10px',
          outline: 'none', resize: 'vertical',
        }}
      />

      {/* Save / cancel */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
        <Button
          size="sm"
          variant="primary"
          disabled={busy || !text.trim()}
          onClick={() => onSave({ claim_text: text.trim(), epistemic_status: epistemicStatus, claim_type: claimType })}
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
