// ── Enums (mirror backend app/models/enums.py) ────────────────────────────────

export type SourceType =
  | 'account' | 'paper' | 'book' | 'interview' | 'media' | 'field_report';

export type DisciplinaryFrame =
  | 'neuroscience' | 'psychology' | 'folklore' | 'physics'
  | 'parapsychology' | 'sociology' | 'anthropology' | 'psychiatry'
  | 'ufology' | 'philosophy' | 'other';

export type ProvenanceQuality =
  | 'peer_reviewed' | 'grey_literature' | 'anecdotal'
  | 'investigator_report' | 'self_reported' | 'unknown';

export type IngestionStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type IngestionMethod = 'ai' | 'manual' | 'bulk_import';

export type EpistemicStatus =
  | 'asserted' | 'observed' | 'inferred' | 'speculative' | 'contested' | 'retracted';

export type ClaimType =
  | 'phenomenological' | 'causal' | 'correlational' | 'definitional' | 'methodological';

export type TagCategory =
  | 'perceptual' | 'somatic' | 'cognitive' | 'narrative' | 'environmental' | 'emotional';

export type ConceptType =
  | 'phenomenon' | 'mechanism' | 'entity' | 'location' | 'process' | 'theoretical_construct';

export type RelationshipType =
  | 'correlates_with' | 'precedes' | 'causes' | 'contradicts'
  | 'is_instance_of' | 'co_occurs_with' | 'is_explained_by' | 'anomalous_given';

export type HypothesisFramework =
  | 'neurological' | 'psychological' | 'sociocultural' | 'physical'
  | 'interdimensional' | 'information_theoretic' | 'psychospiritual' | 'unknown';

export type HypothesisStatus = 'active' | 'abandoned' | 'merged' | 'speculative';

// ── Pagination ────────────────────────────────────────────────────────────────

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserRead {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

// ── Sources ───────────────────────────────────────────────────────────────────

export interface SourceList {
  id: string;
  source_type: SourceType;
  title: string;
  authors: string[] | null;
  publication_date: string | null;
  disciplinary_frame: DisciplinaryFrame | null;
  provenance_quality: ProvenanceQuality;
  ingestion_date: string | null;
  ingestion_status: IngestionStatus | null;
  claim_count: number;
}

export interface SourceRead extends SourceList {
  url: string | null;
  doi: string | null;
  file_ref: string | null;
  notes: string | null;
  ingestion_error: string | null;
  account_detail: AccountDetailRead | null;
  created_at: string;
  updated_at: string;
}

export interface AccountDetailRead {
  account_date: string | null;
  reporter_demographics: Record<string, unknown> | null;
  reporting_lag_days: number | null;
  context: string | null;
  corroboration: string;
  hypnotic_regression: boolean;
}

export interface SourceCreate {
  source_type: SourceType;
  title: string;
  authors?: string[];
  publication_date?: string;
  url?: string;
  doi?: string;
  disciplinary_frame?: DisciplinaryFrame;
  provenance_quality?: ProvenanceQuality;
  notes?: string;
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export interface PhenomenonTagRead {
  id: string;
  label: string;
  category: TagCategory;
  definition: string | null;
  aliases: string[] | null;
  parent_tag_id: string | null;
}

// ── Claims ────────────────────────────────────────────────────────────────────

export interface ClaimRead {
  id: string;
  source_id: string;
  claim_text: string;
  verbatim: boolean;
  page_ref: string | null;
  timestamp_ref: string | null;
  epistemic_status: EpistemicStatus;
  claim_type: ClaimType;
  ai_extracted: boolean;
  ingestion_method: IngestionMethod | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  tags: PhenomenonTagRead[];
  created_at: string;
  updated_at: string;
}

// ── Hypotheses ────────────────────────────────────────────────────────────────

export interface HypothesisList {
  id: string;
  label: string;
  framework: HypothesisFramework;
  status: HypothesisStatus;
  assumed_ontologies: string[] | null;
  supporting_claim_count: number;
  anomalous_claim_count: number;
  created_at: string;
  updated_at: string;
}
