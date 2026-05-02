import { client } from './client';
import type {
  Token, Page,
  SourceList, SourceRead, SourceCreate, SourceUpdate,
  DisciplinaryFrame, ProvenanceQuality, SourceType,
  ObservationRead, ObservationCreate, ObservationUpdate,
  ObservationEpistemicStatus, ContentType, EpistemicDistance,
  ConceptRead, ConceptRelationshipRead,
  HypothesisList, HypothesisRead, HypothesisCreate, HypothesisUpdate, HypothesisReview,
  TheoreticalFrameworkList, TheoreticalFrameworkRead,
  TheoreticalFrameworkCreate, TheoreticalFrameworkUpdate,
} from '../types';

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<Token> {
  const form = new URLSearchParams({ username, password });
  const { data } = await client.post<Token>('/auth/token', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

// ── Sources ───────────────────────────────────────────────────────────────────

export interface SourcesParams {
  page?: number;
  page_size?: number;
  source_type?: SourceType;
  disciplinary_frame?: DisciplinaryFrame;
  provenance_quality?: ProvenanceQuality;
  search?: string;
}

export async function getSources(params: SourcesParams = {}): Promise<Page<SourceList>> {
  const { data } = await client.get<Page<SourceList>>('/sources', { params });
  return data;
}

export async function getSource(id: string): Promise<SourceRead> {
  const { data } = await client.get<SourceRead>(`/sources/${id}`);
  return data;
}

export async function createSource(payload: SourceCreate): Promise<SourceRead> {
  const { data } = await client.post<SourceRead>('/sources', payload);
  return data;
}

export async function updateSource(id: string, payload: SourceUpdate): Promise<SourceRead> {
  const { data } = await client.patch<SourceRead>(`/sources/${id}`, payload);
  return data;
}

export async function uploadSourceFile(id: string, file: File): Promise<{ file_ref: string }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post<{ file_ref: string }>(`/sources/${id}/upload`, form);
  return data;
}

export async function deleteSource(id: string): Promise<void> {
  await client.delete(`/sources/${id}`);
}

export async function triggerIngest(sourceId: string, method: 'ai' | 'manual' = 'ai') {
  const { data } = await client.post(`/sources/${sourceId}/ingest`, { method });
  return data;
}

// ── Observations ──────────────────────────────────────────────────────────────

export interface ObservationsParams {
  page?: number;
  page_size?: number;
  source_id?: string;
  epistemic_status?: ObservationEpistemicStatus | ObservationEpistemicStatus[];
  content_type?: ContentType | ContentType[];
  epistemic_distance?: EpistemicDistance;
  ai_extracted?: boolean;
  unreviewed?: boolean;
  search?: string;
}

export async function getObservations(params: ObservationsParams = {}): Promise<Page<ObservationRead>> {
  const { data } = await client.get<Page<ObservationRead>>('/observations', { params });
  return data;
}

export async function getSourceObservations(sourceId: string): Promise<ObservationRead[]> {
  const { data } = await client.get<ObservationRead[]>(`/sources/${sourceId}/observations`);
  return data;
}

export async function getReviewQueue(params: { page?: number; page_size?: number; source_id?: string } = {}): Promise<Page<ObservationRead>> {
  const { data } = await client.get<Page<ObservationRead>>('/observations/review-queue', { params });
  return data;
}

export async function reviewObservation(id: string, payload: {
  accepted: boolean;
  edited_content?: string;
  epistemic_status?: ObservationEpistemicStatus;
  content_type?: ContentType;
}): Promise<ObservationRead> {
  const { data } = await client.post<ObservationRead>(`/observations/${id}/review`, payload);
  return data;
}

export async function createObservation(payload: ObservationCreate): Promise<ObservationRead> {
  const { data } = await client.post<ObservationRead>('/observations', payload);
  return data;
}

export async function updateObservation(id: string, payload: ObservationUpdate): Promise<ObservationRead> {
  const { data } = await client.patch<ObservationRead>(`/observations/${id}`, payload);
  return data;
}

// ── Hypotheses ────────────────────────────────────────────────────────────────

export async function getHypotheses(params: {
  page?: number;
  page_size?: number;
  framework?: string;
  status?: string;
  search?: string;
} = {}): Promise<Page<HypothesisList>> {
  const { data } = await client.get<Page<HypothesisList>>('/hypotheses', { params });
  return data;
}

export async function getHypothesis(id: string): Promise<HypothesisRead> {
  const { data } = await client.get<HypothesisRead>(`/hypotheses/${id}`);
  return data;
}

export async function createHypothesis(payload: HypothesisCreate): Promise<HypothesisRead> {
  const { data } = await client.post<HypothesisRead>('/hypotheses', payload);
  return data;
}

export async function updateHypothesis(id: string, payload: HypothesisUpdate): Promise<HypothesisRead> {
  const { data } = await client.patch<HypothesisRead>(`/hypotheses/${id}`, payload);
  return data;
}

export async function deleteHypothesis(id: string): Promise<void> {
  await client.delete(`/hypotheses/${id}`);
}

export async function getHypothesisReviewQueue(params: { page?: number; page_size?: number; source_id?: string } = {}): Promise<Page<HypothesisList>> {
  const { data } = await client.get<Page<HypothesisList>>('/hypotheses/review-queue', { params });
  return data;
}

export async function reviewHypothesis(id: string, payload: HypothesisReview): Promise<HypothesisList> {
  const { data } = await client.post<HypothesisList>(`/hypotheses/${id}/review`, payload);
  return data;
}

// ── Frameworks ────────────────────────────────────────────────────────────────

export async function getFrameworks(params: {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
} = {}): Promise<Page<TheoreticalFrameworkList>> {
  const { data } = await client.get<Page<TheoreticalFrameworkList>>('/frameworks', { params });
  return data;
}

export async function getFramework(id: string): Promise<TheoreticalFrameworkRead> {
  const { data } = await client.get<TheoreticalFrameworkRead>(`/frameworks/${id}`);
  return data;
}

export async function createFramework(payload: TheoreticalFrameworkCreate): Promise<TheoreticalFrameworkRead> {
  const { data } = await client.post<TheoreticalFrameworkRead>('/frameworks', payload);
  return data;
}

export async function updateFramework(id: string, payload: TheoreticalFrameworkUpdate): Promise<TheoreticalFrameworkRead> {
  const { data } = await client.patch<TheoreticalFrameworkRead>(`/frameworks/${id}`, payload);
  return data;
}

export async function deleteFramework(id: string): Promise<void> {
  await client.delete(`/frameworks/${id}`);
}

// ── Concepts ──────────────────────────────────────────────────────────────────

export async function getConcepts(params: {
  page?: number;
  page_size?: number;
  concept_type?: string;
  search?: string;
} = {}): Promise<Page<ConceptRead>> {
  const { data } = await client.get<Page<ConceptRead>>('/concepts', { params });
  return data;
}

export async function getRelationships(params: {
  page?: number;
  page_size?: number;
  relationship_type?: string;
  concept_id?: string;
  anomalous_only?: boolean;
} = {}): Promise<Page<ConceptRelationshipRead>> {
  const { data } = await client.get<Page<ConceptRelationshipRead>>('/concepts/relationships/', { params });
  return data;
}

export async function createConcept(payload: {
  label: string;
  concept_type: string;
  description?: string;
  epistemic_status?: string;
}): Promise<ConceptRead> {
  const { data } = await client.post<ConceptRead>('/concepts', payload);
  return data;
}

export async function createRelationship(payload: {
  source_concept_id: string;
  target_concept_id: string;
  relationship_type: string;
  strength?: string;
  notes?: string;
}): Promise<ConceptRelationshipRead> {
  const { data } = await client.post<ConceptRelationshipRead>('/concepts/relationships/', payload);
  return data;
}
