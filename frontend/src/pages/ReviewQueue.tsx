import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReviewQueue, reviewObservation, getCaseReviewQueue, reviewCase } from '../api';
import type { ObservationEpistemicStatus, CaseRead } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState,
  ObservationEpistemicBadge,
  Button, Select, Stat, Card,
} from '../components/ui';
import { Shell } from '../components/Shell';

// Feature flags — flip to true when hypothesis review pipeline is active
const ENABLE_HYPOTHESIS_REVIEW = false;

const EP_OPTIONS: { value: ObservationEpistemicStatus; label: string }[] = [
  { value: 'reported',     label: 'Reported' },
  { value: 'corroborated', label: 'Corroborated' },
  { value: 'contested',    label: 'Contested' },
  { value: 'artefactual',  label: 'Artefactual' },
  { value: 'retracted',    label: 'Retracted' },
];

type ReviewTab = 'cases' | 'observations';

export function ReviewQueue() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ReviewTab>('cases');
  const [obsPage, setObsPage] = useState(1);

  const caseQuery = useQuery({
    queryKey: ['case-review-queue'],
    queryFn: () => getCaseReviewQueue(),
  });

  const obsQuery = useQuery({
    queryKey: ['review-queue', 'observations', obsPage],
    queryFn: () => getReviewQueue({ page: obsPage, page_size: 20 }),
    enabled: activeTab === 'observations',
  });

  const caseMutation = useMutation({
    mutationFn: ({ caseId, accepted }: { caseId: string; accepted: boolean }) =>
      reviewCase(caseId, { accepted }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-review-queue'] });
      qc.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  const obsMutation = useMutation({
    mutationFn: ({ obsId, accepted, edited_content, epistemic_status }: {
      obsId: string;
      accepted: boolean;
      edited_content?: string;
      epistemic_status?: ObservationEpistemicStatus;
    }) => reviewObservation(obsId, { accepted, edited_content, epistemic_status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-queue'] });
      qc.invalidateQueries({ queryKey: ['observations'] });
    },
  });

  function handleTabChange(tab: ReviewTab) {
    setActiveTab(tab);
    setObsPage(1);
  }

  const isLoading =
    caseQuery.isLoading ||
    (activeTab === 'observations' && obsQuery.isLoading);
  const isError =
    caseQuery.isError ||
    (activeTab === 'observations' && obsQuery.isError);

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError) return <Shell><ErrorState message="Failed to load review queue" /></Shell>;

  const totalCases = caseQuery.data?.length ?? 0;
  const totalObs = obsQuery.data?.total ?? 0;
  const totalActive = activeTab === 'cases' ? totalCases : totalObs;

  const subtitles: Record<ReviewTab, string> = {
    cases: 'AI-extracted case drafts awaiting human review',
    observations: 'AI-extracted observations from all sources awaiting review',
  };

  return (
    <Shell>
      <Page title="Review Queue" subtitle={subtitles[activeTab]}>
        {/* Tab bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-dim)',
          marginBottom: 'var(--space-5)',
        }}>
          {(['cases', 'observations'] as ReviewTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 16px',
                fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'var(--t-fast)',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
          {ENABLE_HYPOTHESIS_REVIEW && (
            <button style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px', fontSize: 13, fontWeight: 400,
              color: 'var(--text-secondary)',
              borderBottom: '2px solid transparent', marginBottom: -1,
            }}>
              Hypotheses
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-5)' }}>
          <Card style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <Stat label="Awaiting review" value={totalActive} />
          </Card>
          <div style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: 12, color: 'var(--text-dim)',
            display: 'flex', alignItems: 'center', maxWidth: 400, lineHeight: 1.6,
          }}>
            Accept to add to the corpus, edit to correct AI output, or reject to discard.
          </div>
        </div>

        {totalActive === 0 && (
          <EmptyState message="queue is empty — all AI-extracted items have been reviewed" />
        )}

        {/* Cases tab */}
        {activeTab === 'cases' && totalCases > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {caseQuery.data!.map((c, i) => (
              <CaseReviewCard
                key={c.id}
                kase={c}
                index={i}
                onAccept={() => caseMutation.mutate({ caseId: c.id, accepted: true })}
                onReject={() => caseMutation.mutate({ caseId: c.id, accepted: false })}
                busy={caseMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Observations tab */}
        {activeTab === 'observations' && totalObs > 0 && (
          <section>
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
      </Page>
    </Shell>
  );
}

// ── Case review card ──────────────────────────────────────────────────────────

function CaseReviewCard({ kase, index, onAccept, onReject, busy }: {
  kase: CaseRead; index: number;
  onAccept: () => void; onReject: () => void; busy: boolean;
}) {
  const fields: [string, string | number | null | undefined][] = [
    ['Entity presence', kase.entity_presence],
    ['Sleep/wake state', kase.sleep_wake_state_at_onset],
    ['Paralysis', kase.paralysis_reported],
    ['Corroboration', kase.corroboration_level],
    ['Hypnosis used', kase.hypnosis_used],
    ['Repeat experiencer', kase.repeat_experiencer],
    ['Age at event', kase.experiencer_age_at_event],
    ['Sex', kase.experiencer_sex],
    ['Nationality', kase.experiencer_nationality],
    ['Missing time', kase.missing_time_reported],
  ];
  const nonNullFields = fields.filter(([, v]) => v !== null && v !== undefined);

  return (
    <Card className="fade-in" style={{ padding: 'var(--space-4)', animationDelay: `${index * 30}ms`, borderLeft: '3px solid var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {kase.case_label}
        </span>
        {kase.source_id && (
          <Link
            to={`/sources/${kase.source_id}`}
            style={{
              marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-dim)', textDecoration: 'none',
              maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            ↗ {kase.source_title ?? kase.source_id}
          </Link>
        )}
      </div>

      {nonNullFields.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {nonNullFields.map(([label, value]) => (
            <span key={label} style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)',
              border: '1px solid var(--border-dim)', borderRadius: 20, padding: '2px 8px',
            }}>
              {label}: <strong>{String(value).replace(/_/g, ' ')}</strong>
            </span>
          ))}
        </div>
      )}

      {kase.notes && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-3)', fontStyle: 'italic', maxWidth: 720 }}>
          {kase.notes}
        </p>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        <Link to={`/cases/${kase.id}`} style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)',
          textDecoration: 'none', border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-sm)', padding: '3px 8px',
        }}>
          open for editing
        </Link>
        <Button size="sm" variant="primary" disabled={busy} onClick={onAccept}>✓ accept</Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={onReject}>✗ reject</Button>
      </div>
    </Card>
  );
}

// ── Observation review card ───────────────────────────────────────────────────

function ObservationReviewCard({ obs, index, onAccept, onReject, busy }: {
  obs: {
    id: string; content: string;
    epistemic_status: ObservationEpistemicStatus;
    page_ref: string | null; verbatim: boolean;
    source_id: string | null; source_title?: string;
  };
  index: number;
  onAccept: (overrides: { edited_content?: string; epistemic_status?: ObservationEpistemicStatus }) => void;
  onReject: () => void;
  busy: boolean;
}) {
  const [overrideStatus, setOverrideStatus] = useState<ObservationEpistemicStatus | ''>('');
  const [editingText, setEditingText] = useState(false);
  const [editedContent, setEditedContent] = useState(obs.content);

  function handleAccept() {
    onAccept({
      ...(editingText && editedContent !== obs.content ? { edited_content: editedContent } : {}),
      ...(overrideStatus ? { epistemic_status: overrideStatus } : {}),
    });
  }

  return (
    <Card className="fade-in" style={{ padding: 'var(--space-4)', animationDelay: `${index * 30}ms`, borderLeft: '3px solid var(--accent)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <ObservationEpistemicBadge status={(overrideStatus || obs.epistemic_status) as ObservationEpistemicStatus} />
        {obs.page_ref && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            p.{obs.page_ref}
          </span>
        )}
        {obs.source_title && obs.source_id && (
          <Link to={`/sources/${obs.source_id}`} style={{
            marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-dim)', textDecoration: 'none',
            maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={obs.source_title}>
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
            outline: 'none', resize: 'vertical', marginBottom: 'var(--space-3)',
          }}
        />
      ) : (
        <p
          style={{
            fontSize: 13, lineHeight: 1.65,
            fontFamily: obs.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
            color: 'var(--text-primary)', marginBottom: 'var(--space-4)',
            maxWidth: 720, cursor: 'text',
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
        {!editingText ? (
          <button onClick={() => setEditingText(true)} style={{
            background: 'none', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-dim)', padding: '3px 8px',
          }}>
            edit text
          </button>
        ) : (
          <button onClick={() => { setEditingText(false); setEditedContent(obs.content); }} style={{
            background: 'none', border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--text-dim)', padding: '3px 8px',
          }}>
            discard edit
          </button>
        )}
        <Button size="sm" variant="primary" disabled={busy} onClick={handleAccept}>✓ accept</Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={onReject}>✗ reject</Button>
        <Link to={`/observations/${obs.id}`} style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          open for editing →
        </Link>
      </div>
    </Card>
  );
}
