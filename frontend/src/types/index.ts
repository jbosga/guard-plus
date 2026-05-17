// ── Enums (mirror backend app/models/enums.py) ────────────────────────────────

export type SourceType =
  | 'case_report' | 'empirical_study' | 'review_paper' | 'theoretical';

export type ObservationSourceType = 'literature' | 'corpus_derived';

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

// ── Observation enums ─────────────────────────────────────────────────────────

export type ObservationEpistemicStatus =
  | 'reported' | 'corroborated' | 'contested' | 'artefactual' | 'retracted';

export type CasesIncluded = 'all' | 'filtered_subset';

export type CorroborationLevel =
  | 'none' | 'witness' | 'physical_trace' | 'investigator' | 'multiple';

// ── Case enums ────────────────────────────────────────────────────────────────

export type ExtractionMethod = 'manual' | 'ai_assisted' | 'imported';

export type EventDatePrecision = 'exact' | 'month_and_year' | 'year_only' | 'decade' | 'unknown';

export type SleepWakeState =
  | 'fully_awake' | 'drowsy' | 'hypnagogic' | 'hypnopompic' | 'asleep' | 'unknown';

export type PhysicalLocationType =
  | 'bedroom' | 'other_indoor' | 'vehicle' | 'outdoor_rural' | 'outdoor_urban' | 'unknown';

export type AloneatOnset = 'alone' | 'others_present' | 'unknown';

export type PsychologicalStateType =
  | 'normal' | 'stressed' | 'anxious' | 'depressed' | 'elated' | 'dissociated' | 'unknown';

export type AlteredStateDepth = 'none' | 'mild' | 'moderate' | 'deep' | 'unknown';

export type AlteredStateType =
  | 'drowsiness' | 'intoxication' | 'meditation' | 'dissociation'
  | 'fever' | 'sensory_deprivation' | 'other';

export type EventDuration =
  | 'seconds' | 'minutes' | 'under_one_hour' | 'one_to_several_hours' | 'unknown';

export type PresenceAbsenceUnknown = 'none' | 'yes' | 'unknown';

export type ParalysisExtent = 'none' | 'partial' | 'full' | 'unknown';

export type EntityCount = 'one' | 'two_to_five' | 'more_than_five' | 'unknown';

export type EntityType =
  | 'grey' | 'nordic' | 'reptilian' | 'shadow' | 'robotic'
  | 'insectoid' | 'hybrid' | 'luminous' | 'amorphous' | 'other' | 'unknown';

export type EntityCommunicationModality =
  | 'verbal_auditory' | 'telepathic' | 'visual' | 'gestural' | 'emotional_transfer' | 'other';

export type EntityCommunicationContentType =
  | 'educational' | 'warning' | 'mission' | 'personal' | 'procedural' | 'unintelligible' | 'other';

export type PhysiologicalSymptom =
  | 'chest_pressure' | 'visual_hallucinations' | 'auditory_hallucinations'
  | 'nausea' | 'pain' | 'vibration' | 'heat_or_cold' | 'paralysis'
  | 'palpitations' | 'other' | 'none';

export type EmotionalValence =
  | 'terror' | 'anxiety' | 'awe' | 'calm' | 'joy'
  | 'confusion' | 'sadness' | 'none_reported' | 'unknown';

export type CorroborationLevelV2 =
  | 'testimony_only' | 'corroborated_by_witness'
  | 'corroborated_by_physical_evidence' | 'corroborated_by_both' | 'unknown';

export type MemoryRetrievalMethod =
  | 'spontaneous_recall' | 'hypnotic_regression' | 'guided_imagery'
  | 'therapy' | 'self_hypnosis' | 'dream_recall' | 'journaling'
  | 'investigator_interview' | 'unknown';

export type AccountConsistency =
  | 'not_assessed' | 'consistent' | 'minor_variations'
  | 'significant_variations' | 'contradictory';

export type EducationLevel = 'primary' | 'secondary' | 'tertiary' | 'postgraduate' | 'not_reported';

export type MaritalStatus =
  | 'single' | 'married' | 'partnered' | 'divorced' | 'widowed' | 'not_reported';

export type Religiosity = 'none' | 'low' | 'moderate' | 'high' | 'not_reported';

export type PriorInterestLevel = 'none' | 'low' | 'moderate' | 'high' | 'not_reported';

export type HistoryPresence = 'none' | 'suspected' | 'confirmed' | 'not_reported';

export type MotivationalFactors =
  | 'none_apparent' | 'suspected' | 'confirmed' | 'not_assessed';

export type RepeatExperiencer =
  | 'first_experience' | 'repeat_experiencer' | 'not_reported';

export type ExperiencerSex = 'male' | 'female' | 'intersex' | 'not_reported';

export type PsychometricPresence = 'no' | 'yes' | 'unknown';
export type PsychometricLevel = 'low' | 'moderate' | 'high';
export type ClinicalLevel = 'none' | 'subclinical' | 'clinical';
export type ClinicalPresence = 'none' | 'subclinical' | 'clinical_diagnosis';

export type CommunityType =
  | 'ufo_group' | 'therapy' | 'religion' | 'online_community'
  | 'research_participation' | 'other';

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
  case_count: number;
  created_by: string | null;
}

export interface SourceRead extends SourceList {
  url: string | null;
  doi: string | null;
  file_ref: string | null;
  notes: string | null;
  ingestion_error: string | null;
  created_at: string;
  updated_at: string;
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
  source_id: string | null;
  source_title?: string;
  observation_source_type: ObservationSourceType;
  content: string;
  epistemic_status: ObservationEpistemicStatus;
  authored_by: string | null;
  query_definition: string | null;
  analysis_tool: string | null;
  corpus_snapshot_date: string | null;
  case_count_at_snapshot: number | null;
  cases_included: CasesIncluded | null;
  case_filter_description: string | null;
  staleness_flag: boolean;
  verbatim: boolean;
  page_ref: string | null;
  ai_extracted: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  tags: PhenomenonTagRead[];
  created_at: string;
  updated_at: string;
}

export interface ObservationCreate {
  source_id?: string;
  observation_source_type?: ObservationSourceType;
  content: string;
  epistemic_status?: ObservationEpistemicStatus;
  authored_by?: string;
  query_definition?: string;
  analysis_tool?: string;
  corpus_snapshot_date?: string;
  case_count_at_snapshot?: number;
  cases_included?: CasesIncluded;
  case_filter_description?: string;
  verbatim?: boolean;
  page_ref?: string;
}

export interface ObservationUpdate {
  content?: string;
  epistemic_status?: ObservationEpistemicStatus;
  authored_by?: string;
  query_definition?: string;
  analysis_tool?: string;
  corpus_snapshot_date?: string;
  case_count_at_snapshot?: number;
  cases_included?: CasesIncluded;
  case_filter_description?: string;
  verbatim?: boolean;
  page_ref?: string;
}

// ── Cases ─────────────────────────────────────────────────────────────────────

export interface CaseList {
  id: string;
  source_id: string;
  source_title?: string;
  case_label: string;
  extraction_method: ExtractionMethod | null;
  entity_presence: PresenceAbsenceUnknown | null;
  sleep_wake_state_at_onset: SleepWakeState | null;
  paralysis_reported: ParalysisExtent | null;
  corroboration_level: CorroborationLevelV2 | null;
  hypnosis_used: PsychometricPresence | null;
  repeat_experiencer: RepeatExperiencer | null;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseRead {
  id: string;
  source_id: string;
  source_title?: string;
  case_label: string;
  extraction_method: ExtractionMethod | null;
  extraction_date: string | null;
  extracted_by: string | null;
  notes: string | null;
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;

  // Section 2 — Context & Demographics
  experiencer_nationality: string | null;
  experiencer_ethnicity: string | null;
  experiencer_age_at_event: number | null;
  experiencer_sex: ExperiencerSex | null;
  experiencer_gender: string | null;
  experiencer_occupation: string | null;
  education_level: EducationLevel | null;
  marital_status: MaritalStatus | null;
  religiosity: Religiosity | null;

  // Section 3 — Background History
  prior_ufo_interest: PriorInterestLevel | null;
  prior_paranormal_belief: PriorInterestLevel | null;
  cultural_media_exposure_to_aae: PriorInterestLevel | null;
  childhood_trauma_history: HistoryPresence | null;
  childhood_abuse_history: HistoryPresence | null;
  surgical_history_present: HistoryPresence | null;
  surgical_history_detail: string | null;
  neuropsychiatric_history_present: HistoryPresence | null;
  neuropsychiatric_history_detail: string | null;
  substance_use_present: HistoryPresence | null;
  substance_use_detail: string | null;
  motivational_factors_present: MotivationalFactors | null;
  motivational_factors_detail: string | null;
  repeat_experiencer: RepeatExperiencer | null;

  // Section 4 — Onset Conditions
  event_date: string | null;
  event_date_precision: EventDatePrecision | null;
  event_time_of_day: string | null;
  sleep_wake_state_at_onset: SleepWakeState | null;
  physical_location_type: PhysicalLocationType | null;
  physical_location_detail: string | null;
  alone_at_onset: AloneatOnset | null;
  witness_count: number | null;
  environmental_stimuli_present: PresenceAbsenceUnknown | null;
  environmental_stimuli_detail: string | null;
  psychological_state_preceding: PsychologicalStateType | null;
  psychological_state_detail: string | null;
  altered_state_at_onset: AlteredStateDepth | null;
  altered_state_types: AlteredStateType[] | null;

  // Section 5 — Phenomenological Content
  duration_of_experience: EventDuration | null;
  missing_time_reported: PresenceAbsenceUnknown | null;
  missing_time_duration: string | null;
  paralysis_reported: ParalysisExtent | null;
  perceived_physical_transport: PresenceAbsenceUnknown | null;
  out_of_body_sensation: PresenceAbsenceUnknown | null;
  floating_sensation: PresenceAbsenceUnknown | null;
  tunnel_or_passage_sensation: PresenceAbsenceUnknown | null;
  entity_presence: PresenceAbsenceUnknown | null;
  entity_count: EntityCount | null;
  entity_types: EntityType[] | null;
  entity_types_detail: string | null;
  entity_communication_present: PresenceAbsenceUnknown | null;
  entity_communication_modality: EntityCommunicationModality[] | null;
  entity_communication_content_type: EntityCommunicationContentType[] | null;
  educational_or_mission_messaging: PresenceAbsenceUnknown | null;
  medical_procedure_motif: PresenceAbsenceUnknown | null;
  medical_procedure_detail: string | null;
  reproductive_or_sexual_motif: PresenceAbsenceUnknown | null;
  reproductive_motif_detail: string | null;
  craft_or_vehicle_reported: PresenceAbsenceUnknown | null;
  craft_description: string | null;
  physical_environment_changes: PresenceAbsenceUnknown | null;
  physical_environment_changes_detail: string | null;
  event_sequence_described: PresenceAbsenceUnknown | null;
  event_sequence_detail: string | null;
  physiological_symptoms: PhysiologicalSymptom[] | null;
  physiological_symptoms_detail: string | null;
  emotional_valence_during_event: EmotionalValence[] | null;
  emotional_valence_detail: string | null;

  // Section 6 — Physical & Physiological Evidence
  physical_marks_present: PresenceAbsenceUnknown | null;
  physical_marks_detail: string | null;
  physical_marks_medically_examined: PsychometricPresence | null;
  environmental_physical_evidence: PresenceAbsenceUnknown | null;
  environmental_physical_evidence_detail: string | null;
  independent_corroboration_present: PresenceAbsenceUnknown | null;
  independent_corroboration_detail: string | null;
  eeg_or_neurological_data_available: PsychometricPresence | null;
  eeg_data_detail: string | null;
  blood_or_toxicology_data_available: PsychometricPresence | null;
  blood_data_detail: string | null;

  // Section 7 — Psychological Profile
  fantasy_proneness_assessed: PsychometricPresence | null;
  fantasy_proneness_score: number | null;
  fantasy_proneness_instrument: string | null;
  hypnotic_suggestibility_assessed: PsychometricPresence | null;
  hypnotic_suggestibility_score: number | null;
  hypnotic_suggestibility_instrument: string | null;
  boundary_thinness_assessed: PsychometricPresence | null;
  boundary_thinness_score: number | null;
  boundary_thinness_instrument: string | null;
  dissociation_assessed: PsychometricPresence | null;
  dissociation_score: number | null;
  dissociation_instrument: string | null;
  ptsd_symptoms_assessed: PsychometricPresence | null;
  ptsd_symptoms_present: ClinicalLevel | null;
  ptsd_instrument: string | null;
  psychopathology_screened: PsychometricPresence | null;
  psychopathology_findings: ClinicalPresence | null;
  psychopathology_detail: string | null;
  need_for_meaning_assessed: PsychometricPresence | null;
  need_for_meaning_level: PsychometricLevel | null;
  self_escape_motivation_assessed: PsychometricPresence | null;
  self_escape_motivation_level: PsychometricLevel | null;

  // Section 8 — Memory & Retrieval
  memory_retrieval_method: MemoryRetrievalMethod[] | null;
  hypnosis_used: PsychometricPresence | null;
  hypnotist_identity: string | null;
  investigator_or_therapist_involved: PsychometricPresence | null;
  investigator_detail: string | null;
  account_consistency_over_time: AccountConsistency | null;
  number_of_accounts_on_record: number | null;

  // Section 9 — Aftermath
  positive_transformation_reported: PresenceAbsenceUnknown | null;
  positive_transformation_detail: string | null;
  negative_psychological_aftermath: PresenceAbsenceUnknown | null;
  negative_aftermath_detail: string | null;
  ongoing_contact_reported: PresenceAbsenceUnknown | null;
  ongoing_contact_detail: string | null;
  changed_worldview_reported: PresenceAbsenceUnknown | null;
  worldview_change_detail: string | null;
  sought_community_or_support: PresenceAbsenceUnknown | null;
  community_type: CommunityType[] | null;

  // Section 10 — Corroboration Quality
  corroboration_level: CorroborationLevelV2 | null;
  case_quality_notes: string | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseCreate {
  source_id: string;
  case_label: string;
  extraction_method?: ExtractionMethod;
  notes?: string;
}

export interface CaseUpdate {
  case_label?: string;
  notes?: string;
  experiencer_nationality?: string;
  experiencer_ethnicity?: string;
  experiencer_age_at_event?: number | null;
  experiencer_sex?: ExperiencerSex | null;
  experiencer_gender?: string;
  experiencer_occupation?: string;
  education_level?: EducationLevel | null;
  marital_status?: MaritalStatus | null;
  religiosity?: Religiosity | null;
  prior_ufo_interest?: PriorInterestLevel | null;
  prior_paranormal_belief?: PriorInterestLevel | null;
  cultural_media_exposure_to_aae?: PriorInterestLevel | null;
  childhood_trauma_history?: HistoryPresence | null;
  childhood_abuse_history?: HistoryPresence | null;
  surgical_history_present?: HistoryPresence | null;
  surgical_history_detail?: string;
  neuropsychiatric_history_present?: HistoryPresence | null;
  neuropsychiatric_history_detail?: string;
  substance_use_present?: HistoryPresence | null;
  substance_use_detail?: string;
  motivational_factors_present?: MotivationalFactors | null;
  motivational_factors_detail?: string;
  repeat_experiencer?: RepeatExperiencer | null;
  event_date?: string | null;
  event_date_precision?: EventDatePrecision | null;
  event_time_of_day?: string;
  sleep_wake_state_at_onset?: SleepWakeState | null;
  physical_location_type?: PhysicalLocationType | null;
  physical_location_detail?: string;
  alone_at_onset?: AloneatOnset | null;
  witness_count?: number | null;
  environmental_stimuli_present?: PresenceAbsenceUnknown | null;
  environmental_stimuli_detail?: string;
  psychological_state_preceding?: PsychologicalStateType | null;
  psychological_state_detail?: string;
  altered_state_at_onset?: AlteredStateDepth | null;
  altered_state_types?: AlteredStateType[];
  duration_of_experience?: EventDuration | null;
  missing_time_reported?: PresenceAbsenceUnknown | null;
  missing_time_duration?: string;
  paralysis_reported?: ParalysisExtent | null;
  perceived_physical_transport?: PresenceAbsenceUnknown | null;
  out_of_body_sensation?: PresenceAbsenceUnknown | null;
  floating_sensation?: PresenceAbsenceUnknown | null;
  tunnel_or_passage_sensation?: PresenceAbsenceUnknown | null;
  entity_presence?: PresenceAbsenceUnknown | null;
  entity_count?: EntityCount | null;
  entity_types?: EntityType[];
  entity_types_detail?: string;
  entity_communication_present?: PresenceAbsenceUnknown | null;
  entity_communication_modality?: EntityCommunicationModality[];
  entity_communication_content_type?: EntityCommunicationContentType[];
  educational_or_mission_messaging?: PresenceAbsenceUnknown | null;
  medical_procedure_motif?: PresenceAbsenceUnknown | null;
  medical_procedure_detail?: string;
  reproductive_or_sexual_motif?: PresenceAbsenceUnknown | null;
  reproductive_motif_detail?: string;
  craft_or_vehicle_reported?: PresenceAbsenceUnknown | null;
  craft_description?: string;
  physical_environment_changes?: PresenceAbsenceUnknown | null;
  physical_environment_changes_detail?: string;
  event_sequence_described?: PresenceAbsenceUnknown | null;
  event_sequence_detail?: string;
  physiological_symptoms?: PhysiologicalSymptom[];
  physiological_symptoms_detail?: string;
  emotional_valence_during_event?: EmotionalValence[];
  emotional_valence_detail?: string;
  physical_marks_present?: PresenceAbsenceUnknown | null;
  physical_marks_detail?: string;
  physical_marks_medically_examined?: PsychometricPresence | null;
  environmental_physical_evidence?: PresenceAbsenceUnknown | null;
  environmental_physical_evidence_detail?: string;
  independent_corroboration_present?: PresenceAbsenceUnknown | null;
  independent_corroboration_detail?: string;
  eeg_or_neurological_data_available?: PsychometricPresence | null;
  eeg_data_detail?: string;
  blood_or_toxicology_data_available?: PsychometricPresence | null;
  blood_data_detail?: string;
  fantasy_proneness_assessed?: PsychometricPresence | null;
  fantasy_proneness_score?: number | null;
  fantasy_proneness_instrument?: string;
  hypnotic_suggestibility_assessed?: PsychometricPresence | null;
  hypnotic_suggestibility_score?: number | null;
  hypnotic_suggestibility_instrument?: string;
  boundary_thinness_assessed?: PsychometricPresence | null;
  boundary_thinness_score?: number | null;
  boundary_thinness_instrument?: string;
  dissociation_assessed?: PsychometricPresence | null;
  dissociation_score?: number | null;
  dissociation_instrument?: string;
  ptsd_symptoms_assessed?: PsychometricPresence | null;
  ptsd_symptoms_present?: ClinicalLevel | null;
  ptsd_instrument?: string;
  psychopathology_screened?: PsychometricPresence | null;
  psychopathology_findings?: ClinicalPresence | null;
  psychopathology_detail?: string;
  need_for_meaning_assessed?: PsychometricPresence | null;
  need_for_meaning_level?: PsychometricLevel | null;
  self_escape_motivation_assessed?: PsychometricPresence | null;
  self_escape_motivation_level?: PsychometricLevel | null;
  memory_retrieval_method?: MemoryRetrievalMethod[];
  hypnosis_used?: PsychometricPresence | null;
  hypnotist_identity?: string;
  investigator_or_therapist_involved?: PsychometricPresence | null;
  investigator_detail?: string;
  account_consistency_over_time?: AccountConsistency | null;
  number_of_accounts_on_record?: number | null;
  positive_transformation_reported?: PresenceAbsenceUnknown | null;
  positive_transformation_detail?: string;
  negative_psychological_aftermath?: PresenceAbsenceUnknown | null;
  negative_aftermath_detail?: string;
  ongoing_contact_reported?: PresenceAbsenceUnknown | null;
  ongoing_contact_detail?: string;
  changed_worldview_reported?: PresenceAbsenceUnknown | null;
  worldview_change_detail?: string;
  sought_community_or_support?: PresenceAbsenceUnknown | null;
  community_type?: CommunityType[];
  corroboration_level?: CorroborationLevelV2 | null;
  case_quality_notes?: string;
}

export interface CaseReview {
  accepted: boolean;
  edits?: CaseUpdate;
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
  created_by: string | null;
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
  created_by: string | null;
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
