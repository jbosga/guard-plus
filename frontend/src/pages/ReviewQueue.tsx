import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReviewQueue, reviewObservation, getHypothesisReviewQueue, reviewHypothesis } from '../api';
import type {
  ObservationEpistemicStatus, ContentType,
  HypothesisType, HypothesisFramework, ConfidenceLevel,
} from '../types';
import {
  Page, Spinner, ErrorState, EmptyState,
  ObservationEpistemicBadge, ContentTypeBadge, CollectionMethodBadge,
  HypothesisTypeBadge, FrameworkStatusBadge, ConfidenceBadge,
  Button, Select, Stat, Card,
} from '../components/ui';
import { Shell } from '../components/Shell';

// ── Option lists ──────────────────────────────────────────────────────────────

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

const HYP_TYPE_OPTIONS: { value: HypothesisType; label: string }[] = [
  { value: 'causal',         label: 'Causal' },
  { value: 'correlational',  label: 'Correlational' },
  { value: 'mechanistic',    label: 'Mechanistic' },
  { value: 'taxonomic',      label: 'Taxonomic' },
  { value: 'predictive',     label: 'Predictive' },
];

const FRAMEWORK_OPTIONS: { value: HypothesisFramework; label: string }[] = [
  { value: 'neurological',        label: 'Neurological' },
  { value: 'psychological',       label: 'Psychological' },
  { value: 'sociocultural',       label: 'Sociocultural' },
  { value: 'physical',            label: 'Physical' },
  { value: 'interdimensional',    label: 'Interdimensional' },
  { value: 'information_theoretic', label: 'Information-theoretic' },
  { value: 'psychospiritual',     label: 'Psychospiritual' },
  { value: 'unknown',             label: 'Unknown' },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: 'speculative', label: 'Speculative' },
  { value: 'plausible',   label: 'Plausible' },
  { value: 'supported',   label: 'Supported' },
  { value: 'contested',   label: 'Contested' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export function ReviewQueue() {
  const [searchParams] = useSearchParams();
  const sourceId = searchParams.get('source_id') ?? undefined;
  const qc = useQueryClient();

  const obsQuery = useQuery({
    queryKey: ['review-queue', sourceId],
    queryFn: () => getReviewQueue({ page: 1, page_size: 20, source_id: sourceId }),
  });

  const hypQuery = useQuery({
    queryKey: ['hypothesis-review-queue', sourceId],
    queryFn: () => getHypothesisReviewQueue({ page: 1, page_size: 20, source_id: sourceId }),
  });

  const obsMutation = useMutation({
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

  const hypMutation = useMutation({
    mutationFn: ({ hypId, ...payload }: { hypId: string; accepted: boolean; edited_label?: string; edited_description?: string; hypothesis_type?: HypothesisType; framework?: HypothesisFramework; confidence_level?: ConfidenceLevel }) =>
      reviewHypothesis(hypId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hypothesis-review-queue'] });
      qc.invalidateQueries({ queryKey: ['hypotheses'] });
    },
  });

  const isLoading = obsQuery.isLoading || hypQuery.isLoading;
  const isError = obsQuery.isError || hypQuery.isError;

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError) return <Shell><ErrorState message="Failed to load review queue" /></Shell>;

  const totalObs = obsQuery.data?.total ?? 0;
  const totalHyp = hypQuery.data?.total ?? 0;
  const totalPending = totalObs + totalHyp;

  return (
    <Shell>
      <Page
        title="Review Queue"
        subtitle="AI-extracted observations and hypotheses awaiting human review"
      >
        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-5)' }}>
          <Card style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <Stat label="Awaiting review" value={totalPending} />
          </Card>
          <Card style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', gap: 'var(--space-5)' }}>
            <Stat label="Observations" value={totalObs} />
            <Stat label="Hypotheses" value={totalHyp} />
          </Card>
          <div style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 12, color: 'var(--text-dim)',
            display: 'flex', alignItems: 'center', maxWidth: 400, lineHeight: 1.6,
          }}>
            Accept to add to the corpus, edit to correct AI output, or reject to discard.
          </div>
        </div>

        {totalPending === 0 && (
          <EmptyState message="queue is empty — all AI-extracted items have been reviewed" />
        )}

        {/* Observations section */}
        {totalObs > 0 && (
          <section style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-dim)',
              marginBottom: 'var(--space-3)',
            }}>
              Observations — {totalObs}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {obsQuery.data?.items.map((obs, i) => (
                <ObservationReviewCard
                  key={obs.id}
                  obs={obs}
                  index={i}
                  onAccept={(overrides) => obsMutation.mutate({ obsId: obs.id, accepted: true, ...overrides })}
                  onReject={() => obsMutation.mutate({ obsId: obs.id, accepted: false })}
                  busy={obsMutation.isPending}
                />
              ))}
            </div>
            {totalObs > (obsQuery.data?.items.length ?? 0) && (
              <div style={{ marginTop: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                Showing {obsQuery.data?.items.length} of {totalObs}. Review these to see more.
              </div>
            )}
          </section>
        )}

        {/* Hypotheses section */}
        {totalHyp > 0 && (
          <section>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-dim)',
              marginBottom: 'var(--space-3)',
            }}>
              Hypotheses — {totalHyp}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {hypQuery.data?.items.map((hyp, i) => (
                <HypothesisReviewCard
                  key={hyp.id}
                  hyp={hyp}
                  index={i}
                  onAccept={(overrides) => hypMutation.mutate({ hypId: hyp.id, accepted: true, ...overrides })}
                  onReject={() => hypMutation.mutate({ hypId: hyp.id, accepted: false })}
                  busy={hypMutation.isPending}
                />
              ))}
            </div>
            {totalHyp > (hypQuery.data?.items.length ?? 0) && (
              <div style={{ marginTop: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                Showing {hypQuery.data?.items.length} of {totalHyp}. Review these to see more.
              </div>
            )}
          </section>
        )}
      </Page>
    </Shell>
  );
}

// ── Observation review card ───────────────────────────────────────────────────

interface ObservationReviewCardProps {
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

function ObservationReviewCard({ obs, index, onAccept, onReject, busy }: ObservationReviewCardProps) {
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

// ── Hypothesis review card ────────────────────────────────────────────────────

interface HypothesisReviewCardProps {
  hyp: {
    id: string;
    label: string;
    hypothesis_type: HypothesisType;
    framework: HypothesisFramework;
    confidence_level: ConfidenceLevel;
    source_id: string | null;
    source_title?: string;
  };
  index: number;
  onAccept: (overrides: { edited_label?: string; edited_description?: string; hypothesis_type?: HypothesisType; framework?: HypothesisFramework; confidence_level?: ConfidenceLevel }) => void;
  onReject: () => void;
  busy: boolean;
}

function HypothesisReviewCard({ hyp, index, onAccept, onReject, busy }: HypothesisReviewCardProps) {
  const [overrideType, setOverrideType] = useState<HypothesisType | ''>('');
  const [overrideFramework, setOverrideFramework] = useState<HypothesisFramework | ''>('');
  const [overrideConfidence, setOverrideConfidence] = useState<ConfidenceLevel | ''>('');
  const [editingLabel, setEditingLabel] = useState(false);
  const [editedLabel, setEditedLabel] = useState(hyp.label);

  function handleAccept() {
    onAccept({
      ...(editingLabel && editedLabel !== hyp.label ? { edited_label: editedLabel } : {}),
      ...(overrideType ? { hypothesis_type: overrideType } : {}),
      ...(overrideFramework ? { framework: overrideFramework } : {}),
      ...(overrideConfidence ? { confidence_level: overrideConfidence } : {}),
    });
  }

  return (
    <Card
      className="fade-in"
      style={{
        padding: 'var(--space-4)',
        animationDelay: `${index * 30}ms`,
        borderLeft: '3px solid var(--color-purple, #9b59b6)',
      }}
    >
      {/* Badge row */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <HypothesisTypeBadge type={(overrideType || hyp.hypothesis_type) as HypothesisType} />
        <FrameworkStatusBadge status={(overrideFramework || hyp.framework) as import('../types').FrameworkStatus} />
        <ConfidenceBadge level={(overrideConfidence || hyp.confidence_level) as ConfidenceLevel} />
        {hyp.source_title && hyp.source_id && (
          <Link
            to={`/sources/${hyp.source_id}`}
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
            title={hyp.source_title}
          >
            ↗ {hyp.source_title}
          </Link>
        )}
      </div>

      {/* Label / edit area */}
      {editingLabel ? (
        <input
          value={editedLabel}
          onChange={e => setEditedLabel(e.target.value)}
          style={{
            width: '100%', maxWidth: 720, boxSizing: 'border-box',
            background: 'var(--bg-0)', border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
            padding: '6px 10px', outline: 'none',
            marginBottom: 'var(--space-3)',
          }}
        />
      ) : (
        <p
          style={{
            fontSize: 14, fontWeight: 600, lineHeight: 1.5,
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
            maxWidth: 720,
            cursor: 'text',
          }}
          onClick={() => setEditingLabel(true)}
          title="Click to edit label"
        >
          {editedLabel}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          options={HYP_TYPE_OPTIONS}
          placeholder={`keep: ${hyp.hypothesis_type}`}
          value={overrideType}
          onChange={e => setOverrideType(e.target.value as HypothesisType | '')}
          style={{ fontSize: 11, padding: '3px 8px' }}
        />
        <Select
          options={FRAMEWORK_OPTIONS}
          placeholder={`keep: ${hyp.framework}`}
          value={overrideFramework}
          onChange={e => setOverrideFramework(e.target.value as HypothesisFramework | '')}
          style={{ fontSize: 11, padding: '3px 8px' }}
        />
        <Select
          options={CONFIDENCE_OPTIONS}
          placeholder={`keep: ${hyp.confidence_level}`}
          value={overrideConfidence}
          onChange={e => setOverrideConfidence(e.target.value as ConfidenceLevel | '')}
          style={{ fontSize: 11, padding: '3px 8px' }}
        />
        {!editingLabel && (
          <button
            onClick={() => setEditingLabel(true)}
            style={{
              background: 'none', border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-dim)', padding: '3px 8px',
            }}
          >
            edit label
          </button>
        )}
        {editingLabel && (
          <button
            onClick={() => { setEditingLabel(false); setEditedLabel(hyp.label); }}
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
