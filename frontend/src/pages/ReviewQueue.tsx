import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReviewQueue, reviewClaim } from '../api';
import type { EpistemicStatus, ClaimType } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState,
  EpistemicBadge, ClaimTypeBadge, Button, Select, Stat, Card,
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

export function ReviewQueue() {
  const [page] = useState(1);
  const [searchParams] = useSearchParams();
  const sourceId = searchParams.get('source_id') ?? undefined;
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['review-queue', page],
    queryFn: () => getReviewQueue({ page, page_size: 20, source_id: sourceId }),
  });

  const mutation = useMutation({
    mutationFn: ({ claimId, accepted, edited_text, epistemic_status, claim_type }: {
      claimId: string;
      accepted: boolean;
      edited_text?: string;
      epistemic_status?: EpistemicStatus;
      claim_type?: ClaimType;
    }) => reviewClaim(claimId, { accepted, edited_text, epistemic_status, claim_type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-queue'] });
      qc.invalidateQueries({ queryKey: ['claims'] });
    },
  });

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError) return <Shell><ErrorState message="Failed to load review queue" /></Shell>;

  return (
    <Shell>
      <Page
        title="Review Queue"
        subtitle="AI-extracted claims awaiting human review"
      >
        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-5)' }}>
          <Card style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <Stat label="Awaiting review" value={data?.total ?? 0} />
          </Card>
          <div style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 12, color: 'var(--text-dim)',
            display: 'flex', alignItems: 'center', maxWidth: 400, lineHeight: 1.6,
          }}>
            Each claim is reviewed individually. Accept to add to the corpus,
            edit to correct the AI output, or reject to discard entirely.
          </div>
        </div>

        {data?.total === 0 && (
          <EmptyState message="queue is empty — all AI claims have been reviewed" />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {data?.items.map((claim, i) => (
            <ReviewCard
              key={claim.id}
              claim={claim}
              index={i}
              onAccept={(overrides) => mutation.mutate({
                claimId: claim.id,
                accepted: true,
                ...overrides,
              })}
              onReject={() => mutation.mutate({ claimId: claim.id, accepted: false })}
              busy={mutation.isPending}
            />
          ))}
        </div>

        {data && data.total > data.items.length && (
          <div style={{
            marginTop: 'var(--space-4)',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
          }}>
            Showing {data.items.length} of {data.total}. Review these to see more.
          </div>
        )}
      </Page>
    </Shell>
  );
}

// ── Individual review card ────────────────────────────────────────────────────

interface ReviewCardProps {
  claim: {
    id: string;
    claim_text: string;
    claim_type: ClaimType;
    epistemic_status: EpistemicStatus;
    page_ref: string | null;
    verbatim: boolean;
    source_id: string;
    source_title?: string;
  };
  index: number;
  onAccept: (overrides: { edited_text?: string; epistemic_status?: EpistemicStatus; claim_type?: ClaimType }) => void;
  onReject: () => void;
  busy: boolean;
}

function ReviewCard({ claim, index, onAccept, onReject, busy }: ReviewCardProps) {
  const [overrideStatus, setOverrideStatus] = useState<EpistemicStatus | ''>('');
  const [overrideType, setOverrideType] = useState<ClaimType | ''>('');
  const [editingText, setEditingText] = useState(false);
  const [editedText, setEditedText] = useState(claim.claim_text);

  function handleAccept() {
    onAccept({
      ...(editingText && editedText !== claim.claim_text ? { edited_text: editedText } : {}),
      ...(overrideStatus ? { epistemic_status: overrideStatus } : {}),
      ...(overrideType ? { claim_type: overrideType } : {}),
    });
  }

  return (
    <Card
      className="fade-in"
      style={{
        padding: 'var(--space-4)',
        animationDelay: `${index * 30}ms`,
        borderLeft: '3px solid var(--accent)',
      }}
    >
      {/* Badges */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <EpistemicBadge status={overrideStatus || claim.epistemic_status} />
        <ClaimTypeBadge type={overrideType || claim.claim_type} />
        {claim.page_ref && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            p.{claim.page_ref}
          </span>
        )}
        {claim.source_title && (
          <Link
            to={`/sources/${claim.source_id}`}
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-dim)',
              textDecoration: 'none',
              maxWidth: 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={claim.source_title}
          >
            ↗ {claim.source_title}
          </Link>
        )}
      </div>

      {/* Text / edit area */}
      {editingText ? (
        <textarea
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          rows={4}
          style={{
            width: '100%', maxWidth: 720, boxSizing: 'border-box',
            background: 'var(--bg-0)', border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
            fontFamily: claim.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
            fontSize: 13, lineHeight: 1.65, padding: '8px 10px',
            outline: 'none', resize: 'vertical',
            marginBottom: 'var(--space-3)',
          }}
        />
      ) : (
        <p
          style={{
            fontSize: 13, lineHeight: 1.65,
            fontFamily: claim.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
            maxWidth: 720,
            cursor: 'text',
          }}
          onClick={() => setEditingText(true)}
          title="Click to edit text"
        >
          {editedText}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          options={EP_OPTIONS}
          placeholder={`keep: ${claim.epistemic_status}`}
          value={overrideStatus}
          onChange={e => setOverrideStatus(e.target.value as EpistemicStatus | '')}
          style={{ fontSize: 11, padding: '3px 8px' }}
        />
        <Select
          options={CT_OPTIONS}
          placeholder={`keep: ${claim.claim_type}`}
          value={overrideType}
          onChange={e => setOverrideType(e.target.value as ClaimType | '')}
          style={{ fontSize: 11, padding: '3px 8px' }}
        />
        {!editingText && (
          <button
            onClick={() => setEditingText(true)}
            style={{
              background: 'none', border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-dim)', padding: '3px 8px',
            }}
          >
            edit text
          </button>
        )}
        {editingText && (
          <button
            onClick={() => { setEditingText(false); setEditedText(claim.claim_text); }}
            style={{
              background: 'none', border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-dim)', padding: '3px 8px',
            }}
          >
            discard edit
          </button>
        )}
        <Button
          size="sm"
          variant="primary"
          disabled={busy}
          onClick={handleAccept}
        >
          ✓ accept
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={busy}
          onClick={onReject}
        >
          ✗ reject
        </Button>
      </div>
    </Card>
  );
}
