import { client } from './client';
import type {
  Token, Page,
  SourceList, SourceRead, SourceCreate, SourceUpdate,
  ClaimRead,
  HypothesisList,
  DisciplinaryFrame, ProvenanceQuality, SourceType,
  EpistemicStatus, ClaimType,  ConceptRead, ConceptRelationshipRead 

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

// ── Claims ────────────────────────────────────────────────────────────────────

export interface ClaimsParams {
  page?: number;
  page_size?: number;
  source_id?: string;
  epistemic_status?: EpistemicStatus | EpistemicStatus[];
  claim_type?: ClaimType | ClaimType[];
  ai_extracted?: boolean;
  unreviewed?: boolean;
  search?: string;
}

export async function getClaims(params: ClaimsParams = {}): Promise<Page<ClaimRead>> {
  const { data } = await client.get<Page<ClaimRead>>('/claims', { params });
  return data;
}

export async function getSourceClaims(sourceId: string): Promise<ClaimRead[]> {
  const { data } = await client.get<ClaimRead[]>(`/sources/${sourceId}/claims`);
  return data;
}

export async function getReviewQueue(params: { page?: number; page_size?: number; source_id?: string } = {}): Promise<Page<ClaimRead>> {
  const { data } = await client.get<Page<ClaimRead>>('/claims/review-queue', { params });
  return data;
}

export async function reviewClaim(claimId: string, payload: {
  accepted: boolean;
  edited_text?: string;
  epistemic_status?: EpistemicStatus;
  claim_type?: ClaimType;
}): Promise<ClaimRead> {
  const { data } = await client.post<ClaimRead>(`/claims/${claimId}/review`, payload);
  return data;
}

export interface ClaimCreatePayload {
  source_id: string;
  claim_text: string;
  verbatim?: boolean;
  page_ref?: string;
  epistemic_status?: EpistemicStatus;
  claim_type: ClaimType;
}

export async function createClaim(payload: ClaimCreatePayload): Promise<ClaimRead> {
  const { data } = await client.post<ClaimRead>('/claims', payload);
  return data;
}

export async function updateClaim(claimId: string, payload: {
  claim_text?: string;
  epistemic_status?: EpistemicStatus;
  claim_type?: ClaimType;
}): Promise<ClaimRead> {
  const { data } = await client.patch<ClaimRead>(`/claims/${claimId}`, payload);
  return data;
}

// ── Hypotheses ────────────────────────────────────────────────────────────────

export async function getHypotheses(params: { page?: number; page_size?: number } = {}): Promise<Page<HypothesisList>> {
  const { data } = await client.get<Page<HypothesisList>>('/hypotheses', { params });
  return data;
}


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
  supporting_claim_ids?: string[];
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
  supporting_claim_ids?: string[];
}): Promise<ConceptRelationshipRead> {
  const { data } = await client.post<ConceptRelationshipRead>('/concepts/relationships/', payload);
  return data;
}
