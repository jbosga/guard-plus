import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReviewQueue, reviewObservation } from '../api';
import type { ObservationEpistemicStatus, ContentType } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState,
  ObservationEpistemicBadge, ContentTypeBadge, CollectionMethodBadge,
  Button, Select, Stat, Card,
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
    mutationFn: ({ obsId, accepted, edited_content, epistemic_status, content_type }: {
      obsId: string;
      accepted: boolean;
      edited_content?: string;
      epistemic_status?: ObservationEpistemicStatus;
      content_type?: ContentType;
    }) => reviewObservation(obsId, { accepted, edited_content, epistemic_status, content_type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-queue'] });
      qc.invalidateQueries({ queryKey: ['observations'] });
    },
  });

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError) return <Shell><ErrorState message="Failed to load review queue" /></Shell>;

  return (
    <Shell>
      <Page
        title="Review Queue"
        subtitle="AI-extracted observations awaiting human review"
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
            Each observation is reviewed individually. Accept to add to the corpus,
            edit to correct the AI output, or reject to discard entirely.
          </div>
        </div>

        {data?.total === 0 && (
          <EmptyState message="queue is empty — all AI observations have been reviewed" />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {data?.items.map((obs, i) => (
            <ReviewCard
              key={obs.id}
              obs={obs}
              index={i}
              onAccept={(overrides) => mutation.mutate({
                obsId: obs.id,
                accepted: true,
                ...overrides,
              })}
              onReject={() => mutation.mutate({ obsId: obs.id, accepted: false })}
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
  obs: {
    id: string;
    content: string;
    content_type: ContentType;
    source_modality: string;
    epistemic_distance: string;
    collection_method: string;
    epistemic_status: ObservationEpistemicStatus;
    page_ref: string | null;
    verbatim: boolean;
    source_id: string;
    source_title?: string;
  };
  index: number;
  onAccept: (overrides: { edited_content?: string; epistemic_status?: ObservationEpistemicStatus; content_type?: ContentType }) => void;
  onReject: () => void;
  busy: boolean;
}

function ReviewCard({ obs, index, onAccept, onReject, busy }: ReviewCardProps) {
  const [overrideStatus, setOverrideStatus] = useState<ObservationEpistemicStatus | ''>('');
  const [overrideType, setOverrideType] = useState<ContentType | ''>('');
  const [editingText, setEditingText] = useState(false);
  const [editedContent, setEditedContent] = useState(obs.content);

  function handleAccept() {
    onAccept({
      ...(editingText && editedContent !== obs.content ? { edited_content: editedContent } : {}),
      ...(overrideStatus ? { epistemic_status: overrideStatus } : {}),
      ...(overrideType ? { content_type: overrideType } : {}),
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
      {/* Classification axes (read-only AI suggestions) */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <ObservationEpistemicBadge status={(overrideStatus || obs.epistemic_status) as ObservationEpistemicStatus} />
        <ContentTypeBadge type={(overrideType || obs.content_type) as ContentType} />
        <CollectionMethodBadge method={obs.collection_method as import('../types').CollectionMethod} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-dim)',
          border: '1px solid var(--border-dim)',
          padding: '1px 6px', borderRadius: 20,
        }}>
          {obs.source_modality.replace(/_/g, ' ')}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--text-dim)',
          border: '1px solid var(--border-dim)',
          padding: '1px 6px', borderRadius: 20,
        }}>
          {obs.epistemic_distance}
        </span>
        {obs.page_ref && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            p.{obs.page_ref}
          </span>
        )}
        {obs.source_title && (
          <Link
            to={`/sources/${obs.source_id}`}
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
            title={obs.source_title}
          >
            ↗ {obs.source_title}
          </Link>
        )}
      </div>

      {/* Content / edit area */}
      {editingText ? (
        <textarea
          value={editedContent}
          onChange={e => setEditedContent(e.target.value)}
          rows={4}
          style={{
            width: '100%', maxWidth: 720, boxSizing: 'border-box',
            background: 'var(--bg-0)', border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
            fontFamily: obs.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
            fontSize: 13, lineHeight: 1.65, padding: '8px 10px',
            outline: 'none', resize: 'vertical',
            marginBottom: 'var(--space-3)',
          }}
        />
      ) : (
        <p
          style={{
            fontSize: 13, lineHeight: 1.65,
            fontFamily: obs.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
            maxWidth: 720,
            cursor: 'text',
          }}
          onClick={() => setEditingText(true)}
          title="Click to edit text"
        >
          {editedContent}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          options={EP_OPTIONS}
          placeholder={`keep: ${obs.epistemic_status}`}
          value={overrideStatus}
          onChange={e => setOverrideStatus(e.target.value as ObservationEpistemicStatus | '')}
          style={{ fontSize: 11, padding: '3px 8px' }}
        />
        <Select
          options={CT_OPTIONS}
          placeholder={`keep: ${obs.content_type}`}
          value={overrideType}
          onChange={e => setOverrideType(e.target.value as ContentType | '')}
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
            onClick={() => { setEditingText(false); setEditedContent(obs.content); }}
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
        <Button size="sm" variant="primary" disabled={busy} onClick={handleAccept}>
          ✓ accept
        </Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={onReject}>
          ✗ reject
        </Button>
      </div>
    </Card>
  );
}
