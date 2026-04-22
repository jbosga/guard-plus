import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSource, getSourceClaims, triggerIngest } from '../api';
import { AddClaimModal } from '../components/AddClaimModal';
import {
  Page, Spinner, ErrorState, EmptyState,
  SourceTypeBadge, ProvenanceBadge, IngestionDot,
  EpistemicBadge, ClaimTypeBadge,
  Button, Card, Stat, SectionHeader,
} from '../components/ui';
import { Shell } from '../components/Shell';

export function SourceDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [ingestError, setIngestError] = useState('');
  const [showAddClaim, setShowAddClaim] = useState(false);

  const { data: source, isLoading, isError } = useQuery({
    queryKey: ['source', id],
    queryFn: () => getSource(id!),
    enabled: !!id,
  });

  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ['source-claims', id],
    queryFn: () => getSourceClaims(id!),
    enabled: !!id,
  });

  const ingestMutation = useMutation({
    mutationFn: (method: 'ai' | 'manual') => triggerIngest(id!, method),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['source', id] });
      setIngestError('');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setIngestError(msg ?? 'Ingestion failed');
    },
  });

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError || !source) return <Shell><ErrorState message="Source not found" /></Shell>;

  const isProcessing = source.ingestion_status === 'processing' || source.ingestion_status === 'pending';

  return (
    <Shell>
      <Page
        title={source.title}
        subtitle={source.authors?.join(', ')}
        actions={
          <Link to="/sources">
            <Button size="sm">← sources</Button>
          </Link>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-5)' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

            {/* Claims */}
            <div>
              <SectionHeader action={
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  {claims?.length ?? 0} claims
                </span>
              }>
                Extracted Claims
              </SectionHeader>

              {claimsLoading && <Spinner />}

              {claims && claims.length === 0 && (
                <EmptyState message="no claims extracted yet" />
              )}

              {claims && claims.map(claim => (
                <div
                  key={claim.id}
                  style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--border-dim)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
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
                  </div>
                  <p style={{
                    fontSize: 13,
                    fontFamily: claim.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
                    fontStyle: claim.verbatim ? 'normal' : 'normal',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                  }}>
                    {claim.verbatim && (
                      <span style={{ color: 'var(--text-dim)', marginRight: 4 }}>"</span>
                    )}
                    {claim.claim_text}
                    {claim.verbatim && (
                      <span style={{ color: 'var(--text-dim)', marginLeft: 2 }}>"</span>
                    )}
                  </p>
                  {claim.reviewed_by && (
                    <div style={{
                      marginTop: 'var(--space-2)',
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--text-dim)',
                    }}>
                      reviewed by {claim.reviewed_by}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Raw text preview */}
            {source.notes && (
              <div>
                <SectionHeader>Notes</SectionHeader>
                <pre style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap', lineHeight: 1.6,
                }}>
                  {source.notes}
                </pre>
              </div>
            )}
          </div>

          {/* Right column — metadata + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Stats */}
            <Card style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-5)' }}>
              <Stat label="Claims" value={source.claim_count} />
              <Stat label="Year" value={source.publication_date ?? '—'} />
            </Card>

            {/* Metadata */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader>Metadata</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <MetaRow label="Type"><SourceTypeBadge type={source.source_type} /></MetaRow>
                <MetaRow label="Provenance"><ProvenanceBadge quality={source.provenance_quality} /></MetaRow>
                {source.disciplinary_frame && (
                  <MetaRow label="Discipline">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {source.disciplinary_frame.replace(/_/g, ' ')}
                    </span>
                  </MetaRow>
                )}
                {source.doi && (
                  <MetaRow label="DOI">
                    <a
                      href={`https://doi.org/${source.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                    >
                      {source.doi}
                    </a>
                  </MetaRow>
                )}
                {source.url && (
                  <MetaRow label="URL">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                    >
                      ↗ link
                    </a>
                  </MetaRow>
                )}
                {source.file_ref && (
                  <MetaRow label="File">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      {source.file_ref.split('_').slice(1).join('_')}
                    </span>
                  </MetaRow>
                )}
              </div>
            </Card>

            {/* Ingestion */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader>Ingestion</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {source.ingestion_status && (
                  <IngestionDot status={source.ingestion_status} />
                )}

                {source.ingestion_error && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--status-error)',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--status-error)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--status-error-bg)',
                  }}>
                    {source.ingestion_error}
                  </div>
                )}

                {ingestError && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--status-error)',
                  }}>
                    ✗ {ingestError}
                  </div>
                )}

                {source.file_ref && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isProcessing || ingestMutation.isPending}
                    onClick={() => ingestMutation.mutate('ai')}
                  >
                    {ingestMutation.isPending ? 'queuing…' : isProcessing ? 'processing…' : '⚡ run AI extraction'}
                  </Button>
                )}

                {!source.file_ref && (
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-dim)', lineHeight: 1.5,
                  }}>
                    Upload a file to enable AI claim extraction
                  </p>
                )}

                {isProcessing && (
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--status-info)', lineHeight: 1.6,
                  }}>
                    Pipeline running. Claims appear in the review queue as extracted.
                  </p>
                )}
              </div>
            </Card>

            {/* Manual claims */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader>Manual Entry</SectionHeader>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowAddClaim(true)}
              >
                + add claim
              </Button>
            </Card>

            {/* ID */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: 'var(--text-dim)', letterSpacing: '0.04em',
            }}>
              {source.id}
            </div>
          </div>
        </div>
      </Page>

      {showAddClaim && (
        <AddClaimModal
          sourceId={source.id}
          onClose={() => setShowAddClaim(false)}
          onCreated={() => {
            setShowAddClaim(false);
            qc.invalidateQueries({ queryKey: ['source-claims', id] });
            qc.invalidateQueries({ queryKey: ['source', id] });
          }}
        />
      )}
    </Shell>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--text-dim)', letterSpacing: '0.06em',
        textTransform: 'uppercase', flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{ textAlign: 'right' }}>{children}</span>
    </div>
  );
}
