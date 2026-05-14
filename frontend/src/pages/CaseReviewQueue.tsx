import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCaseReviewQueue, reviewCase, getCase } from '../api';
import type { CaseList, CaseUpdate } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState, Pagination, Card,
  SectionHeader, Badge, Button,
} from '../components/ui';
import { Shell } from '../components/Shell';

// ── ReviewCard ────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 6, padding: '3px 0' }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        {Array.isArray(value) ? (value as string[]).join(', ') : String(value)}
      </span>
    </div>
  );
}

function displayEnum(v: string | null | undefined) {
  return v ? v.replace(/_/g, ' ') : null;
}

function ReviewCard({ item, onDone }: { item: CaseList; onDone: () => void }) {
  const qc = useQueryClient();
  const [rejected, setRejected] = useState(false);

  const { data: full, isLoading } = useQuery({
    queryKey: ['case', item.id],
    queryFn: () => getCase(item.id),
  });

  const acceptMutation = useMutation({
    mutationFn: () => reviewCase(item.id, { accepted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-review-queue'] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      onDone();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => reviewCase(item.id, { accepted: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-review-queue'] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      onDone();
    },
  });

  const isPending = acceptMutation.isPending || rejectMutation.isPending;

  if (isLoading || !full) {
    return (
      <Card style={{ padding: 'var(--space-4)' }}>
        <Spinner />
      </Card>
    );
  }

  return (
    <Card style={{ padding: 'var(--space-4)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 'var(--space-4)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            {full.case_label}
          </div>
          {full.source_title && (
            <Link
              to={`/sources/${full.source_id}`}
              style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              {full.source_title}
            </Link>
          )}
        </div>
        <Badge label="AI extracted" color="var(--status-info)" bg="var(--status-info-bg)" />
      </div>

      {/* All non-null extracted fields grouped by section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        {/* Demographics */}
        {(full.experiencer_nationality || full.experiencer_age_at_event != null || full.experiencer_sex || full.education_level) && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Demographics
            </div>
            <Field label="Nationality" value={full.experiencer_nationality} />
            <Field label="Age at event" value={full.experiencer_age_at_event} />
            <Field label="Sex" value={displayEnum(full.experiencer_sex)} />
            <Field label="Occupation" value={full.experiencer_occupation} />
            <Field label="Education" value={displayEnum(full.education_level)} />
            <Field label="Religiosity" value={displayEnum(full.religiosity)} />
          </div>
        )}

        {/* Background */}
        {(full.prior_ufo_interest || full.repeat_experiencer || full.childhood_trauma_history || full.neuropsychiatric_history_present) && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Background History
            </div>
            <Field label="Prior UFO interest" value={displayEnum(full.prior_ufo_interest)} />
            <Field label="Prior paranormal belief" value={displayEnum(full.prior_paranormal_belief)} />
            <Field label="Media/cultural exposure" value={displayEnum(full.cultural_media_exposure_to_aae)} />
            <Field label="Childhood trauma" value={displayEnum(full.childhood_trauma_history)} />
            <Field label="Neuropsychiatric history" value={displayEnum(full.neuropsychiatric_history_present)} />
            <Field label="Substance use" value={displayEnum(full.substance_use_present)} />
            <Field label="Motivational factors" value={displayEnum(full.motivational_factors_present)} />
            <Field label="Repeat experiencer" value={displayEnum(full.repeat_experiencer)} />
          </div>
        )}

        {/* Onset */}
        {(full.event_date || full.sleep_wake_state_at_onset || full.physical_location_type) && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Onset Conditions
            </div>
            <Field label="Event date" value={full.event_date} />
            <Field label="Date precision" value={displayEnum(full.event_date_precision)} />
            <Field label="Time of day" value={full.event_time_of_day} />
            <Field label="Sleep/wake state" value={displayEnum(full.sleep_wake_state_at_onset)} />
            <Field label="Location type" value={displayEnum(full.physical_location_type)} />
            <Field label="Location detail" value={full.physical_location_detail} />
            <Field label="Alone at onset" value={displayEnum(full.alone_at_onset)} />
            <Field label="Witness count" value={full.witness_count} />
            <Field label="Psychological state" value={displayEnum(full.psychological_state_preceding)} />
            <Field label="Altered state depth" value={displayEnum(full.altered_state_at_onset)} />
            <Field label="Altered state types" value={full.altered_state_types?.map(v => v.replace(/_/g, ' ')).join(', ')} />
          </div>
        )}

        {/* Phenomenology */}
        {(full.entity_presence || full.paralysis_reported || full.physiological_symptoms?.length) && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Phenomenological Content
            </div>
            <Field label="Duration" value={displayEnum(full.duration_of_experience)} />
            <Field label="Missing time" value={displayEnum(full.missing_time_reported)} />
            <Field label="Missing time duration" value={full.missing_time_duration} />
            <Field label="Paralysis" value={displayEnum(full.paralysis_reported)} />
            <Field label="OBE sensation" value={displayEnum(full.out_of_body_sensation)} />
            <Field label="Entity presence" value={displayEnum(full.entity_presence)} />
            <Field label="Entity count" value={displayEnum(full.entity_count)} />
            <Field label="Entity types" value={full.entity_types?.map(v => v.replace(/_/g, ' ')).join(', ')} />
            <Field label="Entity communication" value={displayEnum(full.entity_communication_present)} />
            <Field label="Communication modality" value={full.entity_communication_modality?.map(v => v.replace(/_/g, ' ')).join(', ')} />
            <Field label="Medical procedure motif" value={displayEnum(full.medical_procedure_motif)} />
            <Field label="Reproductive motif" value={displayEnum(full.reproductive_or_sexual_motif)} />
            <Field label="Craft/vehicle" value={displayEnum(full.craft_or_vehicle_reported)} />
            <Field label="Craft description" value={full.craft_description} />
            <Field label="Physiological symptoms" value={full.physiological_symptoms?.map(v => v.replace(/_/g, ' ')).join(', ')} />
            <Field label="Emotional valence" value={full.emotional_valence_during_event?.map(v => v.replace(/_/g, ' ')).join(', ')} />
          </div>
        )}

        {/* Memory */}
        {(full.memory_retrieval_method?.length || full.hypnosis_used) && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Memory & Retrieval
            </div>
            <Field label="Retrieval method" value={full.memory_retrieval_method?.map(v => v.replace(/_/g, ' ')).join(', ')} />
            <Field label="Hypnosis used" value={displayEnum(full.hypnosis_used)} />
            <Field label="Investigator involved" value={displayEnum(full.investigator_or_therapist_involved)} />
            <Field label="Account consistency" value={displayEnum(full.account_consistency_over_time)} />
          </div>
        )}

        {/* Corroboration */}
        {(full.corroboration_level) && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Corroboration
            </div>
            <Field label="Corroboration level" value={displayEnum(full.corroboration_level)} />
            <Field label="Quality notes" value={full.case_quality_notes} />
          </div>
        )}

        {/* Notes */}
        {full.notes && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Notes
            </div>
            <pre style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6,
            }}>
              {full.notes}
            </pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between',
        marginTop: 'var(--space-5)',
        paddingTop: 'var(--space-4)',
        borderTop: '1px solid var(--border-dim)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to={`/cases/${full.id}`}>
            <Button size="sm">open for editing →</Button>
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {!rejected ? (
            <>
              <Button
                size="sm"
                variant="danger"
                disabled={isPending}
                onClick={() => setRejected(true)}
              >
                reject
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={isPending}
                onClick={() => acceptMutation.mutate()}
              >
                {acceptMutation.isPending ? 'accepting…' : 'accept'}
              </Button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                Reject and delete this draft?
              </span>
              <Button size="sm" disabled={isPending} onClick={() => setRejected(false)}>cancel</Button>
              <Button
                size="sm"
                variant="danger"
                disabled={isPending}
                onClick={() => rejectMutation.mutate()}
              >
                {rejectMutation.isPending ? 'deleting…' : 'confirm reject'}
              </Button>
            </>
          )}
        </div>
      </div>

      {(acceptMutation.isError || rejectMutation.isError) && (
        <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--status-error)' }}>
          ✗ Action failed
        </div>
      )}
    </Card>
  );
}

// ── CaseReviewQueue page ──────────────────────────────────────────────────────

export function CaseReviewQueue() {
  const [page, setPage] = useState(1);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['case-review-queue', page],
    queryFn: () => getCaseReviewQueue({ page, page_size: 5 }),
  });

  const visibleItems = data?.items.filter(item => !dismissed.has(item.id)) ?? [];

  return (
    <Shell>
      <Page
        title="Case Review Queue"
        subtitle={data ? `${data.total} cases pending review` : undefined}
      >
        {isLoading && <Spinner />}
        {isError && <ErrorState message="Failed to load review queue" />}

        {data && visibleItems.length === 0 && !isLoading && (
          <EmptyState message="no cases awaiting review" />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {visibleItems.map(item => (
            <ReviewCard
              key={item.id}
              item={item}
              onDone={() => {
                setDismissed(s => new Set([...s, item.id]));
                refetch();
              }}
            />
          ))}
        </div>

        {data && (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            onPage={p => { setPage(p); setDismissed(new Set()); }}
          />
        )}
      </Page>
    </Shell>
  );
}
