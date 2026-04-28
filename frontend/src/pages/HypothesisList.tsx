import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getHypotheses } from '../api';
import { AddHypothesisModal } from '../components/AddHypothesisModal';
import {
  Page, Spinner, ErrorState, EmptyState, Pagination,
  HypothesisStatusBadge, Badge, Card, Button
} from '../components/ui';
import { Shell } from '../components/Shell';

const FRAMEWORK_COLORS: Record<string, string> = {
  neurological: 'var(--ct-phenomenological)',
  psychological: 'var(--ep-inferred)',
  sociocultural: 'var(--ep-asserted)',
  physical: 'var(--status-warn)',
  interdimensional: 'var(--ep-speculative)',
  information_theoretic: 'var(--status-info)',
  psychospiritual: 'var(--ep-contested)',
  unknown: 'var(--text-dim)',
};

export function HypothesisList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false); 

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hypotheses', page],
    queryFn: () => getHypotheses({ page, page_size: 25 }),
  });

  return (
    <Shell>
      <Page
        title="Hypotheses"
        subtitle="Explanatory frameworks under active investigation"
        actions={
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
          + new hypothesis
        </Button>
        }
      >
        {isLoading && <Spinner />}
        {isError && <ErrorState message="Failed to load hypotheses" />}

        {data && data.items.length === 0 && (
          <EmptyState message="no hypotheses yet — add via the API or hypothesis workspace (Chat 8)" />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {data?.items.map((hyp, i) => (
            <Card
              key={hyp.id}
              className="fade-in"
              style={{
                  padding: 'var(--space-4)',
                  animationDelay: `${i * 25}ms`,
                  cursor: 'pointer',
              }}
              onClick={() => navigate(`/hypotheses/${hyp.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge
                      label={hyp.framework.replace(/_/g, ' ')}
                      color={FRAMEWORK_COLORS[hyp.framework]}
                    />
                    <HypothesisStatusBadge status={hyp.status} />
                  </div>

                  <h3 style={{
                    fontFamily: 'var(--font-sans)', fontSize: 14,
                    fontWeight: 500, color: 'var(--text-primary)',
                    marginBottom: 'var(--space-2)',
                  }}>
                    {hyp.label}
                  </h3>

                  {/* Assumed ontologies */}
                  {hyp.assumed_ontologies && hyp.assumed_ontologies.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      {hyp.assumed_ontologies.map(o => (
                        <span key={o} style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          color: 'var(--text-dim)', border: '1px solid var(--border-dim)',
                          padding: '1px 5px', borderRadius: 2, letterSpacing: '0.04em',
                        }}>
                          {o}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Claim counts */}
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500,
                      color: 'var(--status-ok)',
                    }}>
                      {hyp.supporting_claim_count}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      supporting
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500,
                      color: hyp.anomalous_claim_count === 0 ? 'var(--status-error)' : 'var(--status-warn)',
                    }}>
                      {hyp.anomalous_claim_count}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      anomalous
                    </div>
                  </div>
                </div>
              </div>

              {/* Anti-confirmation-bias warning */}
              {hyp.anomalous_claim_count === 0 && (
                <div style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  border: '1px solid var(--status-error)',
                  borderRadius: 2,
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--status-error)', letterSpacing: '0.03em',
                }}>
                  ⚠ No anomalous claims declared — every hypothesis must account for what it cannot explain
                </div>
              )}
            </Card>
          ))}
        </div>

        {data && (
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        )}
      </Page>
      {showAdd && (
  <AddHypothesisModal onClose={() => setShowAdd(false)} />
    )}
    </Shell>
  );
}
