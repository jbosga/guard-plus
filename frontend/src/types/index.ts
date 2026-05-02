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

export type CorroborationLevel =
  | 'none' | 'witness' | 'physical_trace' | 'investigator' | 'multiple';

// ── Observation enums ─────────────────────────────────────────────────────────

export type ObservationEpistemicStatus =
  | 'reported' | 'corroborated' | 'contested' | 'artefactual' | 'retracted';

export type ContentType =
  | 'experiential' | 'behavioral' | 'physiological'
  | 'environmental' | 'testimonial' | 'documentary_trace';

export type SourceModality =
  | 'first_person_verbal' | 'investigator_summary' | 'physiological'
  | 'behavioral' | 'documentary' | 'aggregate_statistical';

export type EpistemicDistance =
  | 'direct' | 'summarized' | 'aggregated' | 'derived';

export type CollectionMethod =
  | 'spontaneous_report' | 'structured_interview' | 'hypnotic_regression'
  | 'questionnaire' | 'clinical_assessment' | 'passive_recording'
  | 'investigator_inference';

export type SampleSizeTier =
  | 'single_case' | 'small' | 'moderate' | 'large' | 'population';

export type SamplingMethod =
  | 'self_selected' | 'investigator_referred' | 'clinical'
  | 'survey' | 'convenience' | 'unknown';

// ── Hypothesis enums ──────────────────────────────────────────────────────────

export type HypothesisType =
  | 'causal' | 'correlational' | 'mechanistic' | 'taxonomic' | 'predictive';

export type HypothesisStatus =
  | 'active' | 'dormant' | 'abandoned' | 'merged' | 'refuted';

export type ConfidenceLevel =
  | 'speculative' | 'plausible' | 'supported' | 'contested';

export type FrameworkStatus =
  | 'active' | 'dormant' | 'abandoned' | 'merged' | 'refuted';

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
  observation_count: number;
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

export interface SourceUpdate {
  title?: string;
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

// ── Observations ──────────────────────────────────────────────────────────────

export interface ObservationRead {
  id: string;
  source_id: string;
  source_title?: string;
  content: string;
  content_type: ContentType;
  source_modality: SourceModality;
  epistemic_distance: EpistemicDistance;
  collection_method: CollectionMethod;
  epistemic_status: ObservationEpistemicStatus;
  corroboration_level: CorroborationLevel;
  sample_n: number | null;
  sample_size_tier: SampleSizeTier | null;
  sampling_method: SamplingMethod | null;
  inclusion_criteria_documented: boolean | null;
  verbatim: boolean;
  page_ref: string | null;
  ai_extracted: boolean;
  ingestion_method: IngestionMethod | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  tags: PhenomenonTagRead[];
  created_at: string;
  updated_at: string;
}

export interface ObservationCreate {
  source_id: string;
  content: string;
  content_type: ContentType;
  source_modality: SourceModality;
  epistemic_distance: EpistemicDistance;
  collection_method: CollectionMethod;
  epistemic_status?: ObservationEpistemicStatus;
  corroboration_level?: CorroborationLevel;
  sample_n?: number;
  sample_size_tier?: SampleSizeTier;
  sampling_method?: SamplingMethod;
  inclusion_criteria_documented?: boolean;
  verbatim?: boolean;
  page_ref?: string;
}

export interface ObservationUpdate {
  content?: string;
  content_type?: ContentType;
  source_modality?: SourceModality;
  epistemic_distance?: EpistemicDistance;
  collection_method?: CollectionMethod;
  epistemic_status?: ObservationEpistemicStatus;
  corroboration_level?: CorroborationLevel;
  sample_n?: number;
  sample_size_tier?: SampleSizeTier;
  sampling_method?: SamplingMethod;
  inclusion_criteria_documented?: boolean;
  verbatim?: boolean;
  page_ref?: string;
}

// ── Hypotheses ────────────────────────────────────────────────────────────────

export interface HypothesisList {
  id: string;
  label: string;
  hypothesis_type: HypothesisType;
  framework: HypothesisFramework;
  status: HypothesisStatus;
  confidence_level: ConfidenceLevel;
  assumed_ontologies: string[] | null;
  supporting_observation_count: number;
  anomalous_observation_count: number;
  ai_extracted: boolean;
  source_id: string | null;
  source_title?: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HypothesisReview {
  accepted: boolean;
  edited_label?: string;
  edited_description?: string;
  hypothesis_type?: HypothesisType;
  framework?: HypothesisFramework;
  confidence_level?: ConfidenceLevel;
}

export interface HypothesisRead extends HypothesisList {
  description: string | null;
  falsification_condition: string | null;
  scope: string | null;
  parent_hypothesis_id: string | null;
  notes: string | null;
  supporting_observations: ObservationRead[];
  anomalous_observations: ObservationRead[];
  competing_hypotheses: HypothesisList[];
}

export interface HypothesisCreate {
  label: string;
  description?: string;
  hypothesis_type: HypothesisType;
  falsification_condition?: string;
  scope?: string;
  framework: HypothesisFramework;
  assumed_ontologies?: string[];
  status?: HypothesisStatus;
  confidence_level?: ConfidenceLevel;
  notes?: string;
  supporting_observation_ids?: string[];
  anomalous_observation_ids?: string[];
  competing_hypothesis_ids?: string[];
  parent_hypothesis_id?: string;
}

export interface HypothesisUpdate {
  label?: string;
  description?: string;
  hypothesis_type?: HypothesisType;
  falsification_condition?: string;
  scope?: string;
  framework?: HypothesisFramework;
  assumed_ontologies?: string[];
  status?: HypothesisStatus;
  confidence_level?: ConfidenceLevel;
  notes?: string;
  supporting_observation_ids?: string[];
  anomalous_observation_ids?: string[];
  competing_hypothesis_ids?: string[];
  parent_hypothesis_id?: string | null;
}

// ── TheoreticalFramework ──────────────────────────────────────────────────────

export interface TheoreticalFrameworkList {
  id: string;
  label: string;
  framework_type: HypothesisFramework;
  status: FrameworkStatus;
  confidence_level: ConfidenceLevel;
  assumed_ontologies: string[] | null;
  core_hypothesis_count: number;
  anomalous_hypothesis_count: number;
  created_at: string;
  updated_at: string;
}

export interface TheoreticalFrameworkRead extends TheoreticalFrameworkList {
  description: string | null;
  notes: string | null;
  core_hypotheses: HypothesisList[];
  anomalous_hypotheses: HypothesisList[];
}

export interface TheoreticalFrameworkCreate {
  label: string;
  description?: string;
  framework_type: HypothesisFramework;
  assumed_ontologies?: string[];
  status?: FrameworkStatus;
  confidence_level?: ConfidenceLevel;
  notes?: string;
  core_hypothesis_ids?: string[];
  anomalous_hypothesis_ids?: string[];
}

export interface TheoreticalFrameworkUpdate {
  label?: string;
  description?: string;
  framework_type?: HypothesisFramework;
  assumed_ontologies?: string[];
  status?: FrameworkStatus;
  confidence_level?: ConfidenceLevel;
  notes?: string;
  core_hypothesis_ids?: string[];
  anomalous_hypothesis_ids?: string[];
}

// ── Concepts ──────────────────────────────────────────────────────────────────

export interface ConceptRead {
  id: string;
  label: string;
  concept_type: ConceptType;
  description: string | null;
  epistemic_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConceptRelationshipRead {
  id: string;
  source_concept_id: string;
  target_concept_id: string;
  relationship_type: RelationshipType;
  strength: RelationshipStrength;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type RelationshipStrength = 'weak' | 'moderate' | 'strong';
