import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFrameworks } from '../api';
import { AddFrameworkModal } from '../components/AddFrameworkModal';
import {
  Page, Spinner, ErrorState, EmptyState, Pagination,
  FrameworkStatusBadge, ConfidenceBadge, Badge, Card, Button,
} from '../components/ui';
import { Shell } from '../components/Shell';

const FRAMEWORK_COLORS: Record<string, string> = {
  neurological:         'var(--ct-phenomenological)',
  psychological:        'var(--ep-inferred)',
  sociocultural:        'var(--ep-asserted)',
  physical:             'var(--status-warn)',
  interdimensional:     'var(--ep-speculative)',
  information_theoretic:'var(--status-info)',
  psychospiritual:      'var(--ep-contested)',
  unknown:              'var(--text-dim)',
};

export function FrameworkList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['frameworks', page],
    queryFn: () => getFrameworks({ page, page_size: 25 }),
  });

  return (
    <Shell>
      <Page
        title="Frameworks"
        subtitle="Explanatory frameworks for the alien abduction experience"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            + new framework
          </Button>
        }
      >
        {isLoading && <Spinner />}
        {isError && <ErrorState message="Failed to load frameworks" />}

        {data && data.items.length === 0 && (
          <EmptyState message="no frameworks yet — add one with the button above" />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {data?.items.map((fw, i) => (
            <Card
              key={fw.id}
              className="fade-in"
              style={{
                padding: 'var(--space-4)',
                animationDelay: `${i * 25}ms`,
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/frameworks/${fw.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge
                      label={fw.framework_type.replace(/_/g, ' ')}
                      color={FRAMEWORK_COLORS[fw.framework_type]}
                    />
                    <FrameworkStatusBadge status={fw.status} />
                    <ConfidenceBadge level={fw.confidence_level} />
                  </div>

                  <h3 style={{
                    fontFamily: 'var(--font-sans)', fontSize: 14,
                    fontWeight: 500, color: 'var(--text-primary)',
                    marginBottom: 'var(--space-2)',
                  }}>
                    {fw.label}
                  </h3>

                  {fw.assumed_ontologies && fw.assumed_ontologies.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      {fw.assumed_ontologies.map(o => (
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

                {/* Hypothesis counts */}
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500,
                      color: 'var(--status-ok)',
                    }}>
                      {fw.core_hypothesis_count}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      core
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500,
                      color: 'var(--status-warn)',
                    }}>
                      {fw.anomalous_hypothesis_count}
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
              {fw.created_by && (
                <div style={{ marginTop: 'var(--space-2)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                  added by {fw.created_by}
                </div>
              )}
            </Card>
          ))}
        </div>

        {data && (
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        )}
      </Page>

      {showAdd && <AddFrameworkModal onClose={() => setShowAdd(false)} />}
    </Shell>
  );
}
