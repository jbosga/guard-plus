import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCase, updateCase, deleteCase, reviewCase } from '../api';
import type { CaseUpdate } from '../types';
import {
  Page, Spinner, ErrorState, Card, SectionHeader,
  Badge, CorroborationBadge, ExtractionMethodBadge, Button,
} from '../components/ui';
import { Shell } from '../components/Shell';

// ── Field style helpers ───────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  background: 'var(--bg-0)',
  border: '1px solid var(--border-dim)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  padding: '4px 8px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 9,
  color: 'var(--text-dim)', textTransform: 'uppercase',
  letterSpacing: '0.07em', marginBottom: 3,
  display: 'block',
};

// ── Enum option maps ──────────────────────────────────────────────────────────

const OPT = {
  sex:           [['male','Male'],['female','Female'],['intersex','Intersex'],['not_reported','Not reported']],
  education:     [['primary','Primary'],['secondary','Secondary'],['tertiary','Tertiary'],['postgraduate','Postgraduate'],['not_reported','Not reported']],
  marital:       [['single','Single'],['married','Married'],['partnered','Partnered'],['divorced','Divorced'],['widowed','Widowed'],['not_reported','Not reported']],
  religiosity:   [['none','None'],['low','Low'],['moderate','Moderate'],['high','High'],['not_reported','Not reported']],
  interest:      [['none','None'],['low','Low'],['moderate','Moderate'],['high','High'],['not_reported','Not reported']],
  history:       [['none','None'],['suspected','Suspected'],['confirmed','Confirmed'],['not_reported','Not reported']],
  motivation:    [['none_apparent','None apparent'],['suspected','Suspected'],['confirmed','Confirmed'],['not_assessed','Not assessed']],
  repeat:        [['first_experience','First experience'],['repeat_experiencer','Repeat experiencer'],['not_reported','Not reported']],
  datePrecision: [['exact','Exact'],['month_and_year','Month & year'],['year_only','Year only'],['decade','Decade'],['unknown','Unknown']],
  sleepWake:     [['fully_awake','Fully awake'],['drowsy','Drowsy'],['hypnagogic','Hypnagogic'],['hypnopompic','Hypnopompic'],['asleep','Asleep'],['unknown','Unknown']],
  location:      [['bedroom','Bedroom'],['other_indoor','Other indoor'],['vehicle','Vehicle'],['outdoor_rural','Outdoor rural'],['outdoor_urban','Outdoor urban'],['unknown','Unknown']],
  alone:         [['alone','Alone'],['others_present','Others present'],['unknown','Unknown']],
  psychState:    [['normal','Normal'],['stressed','Stressed'],['anxious','Anxious'],['depressed','Depressed'],['elated','Elated'],['dissociated','Dissociated'],['unknown','Unknown']],
  alteredDepth:  [['none','None'],['mild','Mild'],['moderate','Moderate'],['deep','Deep'],['unknown','Unknown']],
  duration:      [['seconds','Seconds'],['minutes','Minutes'],['under_one_hour','< 1 hour'],['one_to_several_hours','1-several hours'],['unknown','Unknown']],
  presence:      [['none','None'],['yes','Yes'],['unknown','Unknown']],
  paralysis:     [['none','None'],['partial','Partial'],['full','Full'],['unknown','Unknown']],
  entityCount:   [['one','One'],['two_to_five','2–5'],['more_than_five','> 5'],['unknown','Unknown']],
  psychPresence: [['no','No'],['yes','Yes'],['unknown','Unknown']],
  psychLevel:    [['low','Low'],['moderate','Moderate'],['high','High']],
  clinicalLevel: [['none','None'],['subclinical','Subclinical'],['clinical','Clinical']],
  clinicalPres:  [['none','None'],['subclinical','Subclinical'],['clinical_diagnosis','Clinical diagnosis']],
  memRetrieval:  [['spontaneous_recall','Spontaneous recall'],['hypnotic_regression','Hypnotic regression'],['guided_imagery','Guided imagery'],['therapy','Therapy'],['self_hypnosis','Self-hypnosis'],['dream_recall','Dream recall'],['journaling','Journaling'],['investigator_interview','Investigator interview'],['unknown','Unknown']],
  consistency:   [['not_assessed','Not assessed'],['consistent','Consistent'],['minor_variations','Minor variations'],['significant_variations','Significant variations'],['contradictory','Contradictory']],
  community:     [['ufo_group','UFO group'],['therapy','Therapy'],['religion','Religion'],['online_community','Online community'],['research_participation','Research participation'],['other','Other']],
  corroboration: [['testimony_only','Testimony only'],['corroborated_by_witness','+ Witness'],['corroborated_by_physical_evidence','+ Physical evidence'],['corroborated_by_both','+ Both'],['unknown','Unknown']],
  entityType:    [['grey','Grey'],['nordic','Nordic'],['reptilian','Reptilian'],['shadow','Shadow'],['robotic','Robotic'],['insectoid','Insectoid'],['hybrid','Hybrid'],['luminous','Luminous'],['amorphous','Amorphous'],['other','Other'],['unknown','Unknown']],
  entityCommMod: [['verbal_auditory','Verbal/auditory'],['telepathic','Telepathic'],['visual','Visual'],['gestural','Gestural'],['emotional_transfer','Emotional transfer'],['other','Other']],
  entityCommCt:  [['educational','Educational'],['warning','Warning'],['mission','Mission'],['personal','Personal'],['procedural','Procedural'],['unintelligible','Unintelligible'],['other','Other']],
  physSymptom:   [['chest_pressure','Chest pressure'],['visual_hallucinations','Visual hallucinations'],['auditory_hallucinations','Auditory hallucinations'],['nausea','Nausea'],['pain','Pain'],['vibration','Vibration'],['heat_or_cold','Heat/cold'],['paralysis','Paralysis'],['palpitations','Palpitations'],['other','Other'],['none','None']],
  emotValence:   [['terror','Terror'],['anxiety','Anxiety'],['awe','Awe'],['calm','Calm'],['joy','Joy'],['confusion','Confusion'],['sadness','Sadness'],['none_reported','None reported'],['unknown','Unknown']],
  alteredType:   [['drowsiness','Drowsiness'],['intoxication','Intoxication'],['meditation','Meditation'],['dissociation','Dissociation'],['fever','Fever'],['sensory_deprivation','Sensory deprivation'],['other','Other']],
} as const;

// ── Editing state ─────────────────────────────────────────────────────────────

type EditState = Record<string, string | string[] | number | boolean | null>;

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  name: _name,
  editingSection,
  editState: _editState,
  onEditChange: _onEditChange,
  children,
}: {
  label: string;
  value: React.ReactNode;
  name: string;
  editingSection: string | null;
  editState: EditState;
  onEditChange: (name: string, val: string | string[] | number | null) => void;
  children?: React.ReactNode;
}) {
  if (editingSection && children) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'start', padding: '4px 0' }}>
        <span style={labelStyle}>{label}</span>
        <div>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'start', padding: '4px 0' }}>
      <span style={labelStyle}>{label}</span>
      <div style={{ fontSize: 12, color: value != null ? 'var(--text-primary)' : 'var(--text-dim)' }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function EnumSelect({
  name, value, options, editState, onEditChange,
}: {
  name: string;
  value: string | null;
  options: readonly (readonly string[])[];
  editState: EditState;
  onEditChange: (name: string, val: string | null) => void;
}) {
  const current = (editState[name] as string) ?? value ?? '';
  return (
    <select
      value={current}
      onChange={e => onEditChange(name, e.target.value || null)}
      style={{ ...fieldStyle, width: 'auto' }}
    >
      <option value="">— unknown —</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function MultiChips({
  name, value, options, editState, onEditChange,
}: {
  name: string;
  value: string[] | null;
  options: readonly (readonly string[])[];
  editState: EditState;
  onEditChange: (name: string, val: string[]) => void;
}) {
  const current: string[] = (editState[name] as string[]) ?? value ?? [];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {options.map(([v, l]) => {
        const selected = current.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => {
              const next = selected ? current.filter(x => x !== v) : [...current, v];
              onEditChange(name, next);
            }}
            style={{
              border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-dim)'}`,
              background: selected ? 'rgba(9,105,218,0.1)' : 'var(--bg-0)',
              color: selected ? 'var(--accent)' : 'var(--text-secondary)',
              borderRadius: 20, padding: '2px 10px', fontSize: 11, cursor: 'pointer',
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

function TextInput({
  name, value, editState, onEditChange, rows = 1,
}: {
  name: string;
  value: string | null;
  editState: EditState;
  onEditChange: (name: string, val: string | null) => void;
  rows?: number;
}) {
  const current = (editState[name] as string) ?? value ?? '';
  if (rows > 1) {
    return (
      <textarea
        value={current}
        onChange={e => onEditChange(name, e.target.value || null)}
        rows={rows}
        style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
      />
    );
  }
  return (
    <input
      value={current}
      onChange={e => onEditChange(name, e.target.value || null)}
      style={fieldStyle}
    />
  );
}

function NumberInput({
  name, value, editState, onEditChange,
}: {
  name: string;
  value: number | null;
  editState: EditState;
  onEditChange: (name: string, val: number | null) => void;
}) {
  const current = editState[name] !== undefined ? String(editState[name] ?? '') : value !== null ? String(value) : '';
  return (
    <input
      type="number"
      value={current}
      onChange={e => onEditChange(name, e.target.value ? parseFloat(e.target.value) : null)}
      style={{ ...fieldStyle, width: 120 }}
    />
  );
}

// ── CaseDetail page ───────────────────────────────────────────────────────────

export function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: c, isLoading, isError } = useQuery({
    queryKey: ['case', id],
    queryFn: () => getCase(id!),
    enabled: !!id,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: CaseUpdate) => updateCase(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case', id] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      setEditingSection(null);
      setEditState({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCase(id!),
    onSuccess: () => navigate('/cases'),
  });

  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const acceptMutation = useMutation({
    mutationFn: () => reviewCase(id!, { accepted: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case', id] });
      qc.invalidateQueries({ queryKey: ['case-review-queue'] });
      qc.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => reviewCase(id!, { accepted: false }),
    onSuccess: () => navigate('/cases/review'),
  });

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError || !c) return <Shell><ErrorState message="Case not found" /></Shell>;

  function startEditing(section: string) {
    setEditingSection(section);
    setEditState({});
  }

  function cancelEditing() {
    setEditingSection(null);
    setEditState({});
  }

  function onEditChange(name: string, val: string | string[] | number | null) {
    setEditState(s => ({ ...s, [name]: val }));
  }

  function saveSection() {
    const payload: CaseUpdate = { ...editState } as unknown as CaseUpdate;
    saveMutation.mutate(payload);
  }

  function displayVal(v: string | null | undefined) {
    return v ? v.replace(/_/g, ' ') : null;
  }

  function displayArr(arr: string[] | null | undefined) {
    if (!arr || arr.length === 0) return null;
    return arr.map(v => v.replace(/_/g, ' ')).join(', ');
  }

  function SectionActions({ section }: { section: string }) {
    const isThis = editingSection === section;
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {isThis ? (
          <>
            <Button size="sm" variant="primary" disabled={saveMutation.isPending} onClick={saveSection}>
              {saveMutation.isPending ? 'saving…' : 'save'}
            </Button>
            <Button size="sm" disabled={saveMutation.isPending} onClick={cancelEditing}>cancel</Button>
          </>
        ) : (
          <button
            onClick={() => startEditing(section)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-dim)', padding: '2px 6px',
            }}
          >
            edit
          </button>
        )}
      </div>
    );
  }

  const isEditing = (section: string) => editingSection === section;
  const ed = editingSection;

  return (
    <Shell>
      <Page
        title={c.case_label}
        subtitle={c.source_title}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {c.source_id && (
              <Link to={`/sources/${c.source_id}`}>
                <Button size="sm">← source</Button>
              </Link>
            )}
            <Link to="/cases">
              <Button size="sm">← cases</Button>
            </Link>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-5)' }}>

          {/* Left — sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Section 1 — Identification */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="ident" />}>
                Identification & Provenance
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FieldRow label="Case label" value={c.case_label} name="case_label" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('ident') && <TextInput name="case_label" value={c.case_label} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Extraction method" value={c.extraction_method ? <ExtractionMethodBadge method={c.extraction_method} /> : null} name="extraction_method" editingSection={ed} editState={editState} onEditChange={onEditChange} />
                <FieldRow label="Extracted by" value={c.extracted_by} name="extracted_by" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('ident') && <TextInput name="extracted_by" value={c.extracted_by} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Notes" value={c.notes} name="notes" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('ident') && <TextInput name="notes" value={c.notes} editState={editState} onEditChange={onEditChange} rows={3} />}
                </FieldRow>
              </div>
            </Card>

            {/* Section 2 — Context & Demographics */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="demographics" />}>
                Context & Demographics
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FieldRow label="Nationality" value={c.experiencer_nationality} name="experiencer_nationality" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('demographics') && <TextInput name="experiencer_nationality" value={c.experiencer_nationality} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Ethnicity" value={c.experiencer_ethnicity} name="experiencer_ethnicity" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('demographics') && <TextInput name="experiencer_ethnicity" value={c.experiencer_ethnicity} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Age at event" value={c.experiencer_age_at_event} name="experiencer_age_at_event" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('demographics') && <NumberInput name="experiencer_age_at_event" value={c.experiencer_age_at_event} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Sex" value={displayVal(c.experiencer_sex)} name="experiencer_sex" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('demographics') && <EnumSelect name="experiencer_sex" value={c.experiencer_sex} options={OPT.sex} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Gender" value={c.experiencer_gender} name="experiencer_gender" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('demographics') && <TextInput name="experiencer_gender" value={c.experiencer_gender} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Occupation" value={c.experiencer_occupation} name="experiencer_occupation" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('demographics') && <TextInput name="experiencer_occupation" value={c.experiencer_occupation} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Education" value={displayVal(c.education_level)} name="education_level" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('demographics') && <EnumSelect name="education_level" value={c.education_level} options={OPT.education} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Marital status" value={displayVal(c.marital_status)} name="marital_status" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('demographics') && <EnumSelect name="marital_status" value={c.marital_status} options={OPT.marital} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Religiosity" value={displayVal(c.religiosity)} name="religiosity" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('demographics') && <EnumSelect name="religiosity" value={c.religiosity} options={OPT.religiosity} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
              </div>
            </Card>

            {/* Section 3 — Background History */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="history" />}>
                Background History
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FieldRow label="Prior UFO interest" value={displayVal(c.prior_ufo_interest)} name="prior_ufo_interest" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="prior_ufo_interest" value={c.prior_ufo_interest} options={OPT.interest} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Prior paranormal belief" value={displayVal(c.prior_paranormal_belief)} name="prior_paranormal_belief" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="prior_paranormal_belief" value={c.prior_paranormal_belief} options={OPT.interest} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Cultural/media exposure" value={displayVal(c.cultural_media_exposure_to_aae)} name="cultural_media_exposure_to_aae" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="cultural_media_exposure_to_aae" value={c.cultural_media_exposure_to_aae} options={OPT.interest} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Childhood trauma" value={displayVal(c.childhood_trauma_history)} name="childhood_trauma_history" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="childhood_trauma_history" value={c.childhood_trauma_history} options={OPT.history} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Childhood abuse" value={displayVal(c.childhood_abuse_history)} name="childhood_abuse_history" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="childhood_abuse_history" value={c.childhood_abuse_history} options={OPT.history} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Surgical history" value={displayVal(c.surgical_history_present)} name="surgical_history_present" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="surgical_history_present" value={c.surgical_history_present} options={OPT.history} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.surgical_history_detail || isEditing('history')) && (
                  <FieldRow label="Surgical detail" value={c.surgical_history_detail} name="surgical_history_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('history') && <TextInput name="surgical_history_detail" value={c.surgical_history_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
                <FieldRow label="Neuropsychiatric history" value={displayVal(c.neuropsychiatric_history_present)} name="neuropsychiatric_history_present" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="neuropsychiatric_history_present" value={c.neuropsychiatric_history_present} options={OPT.history} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.neuropsychiatric_history_detail || isEditing('history')) && (
                  <FieldRow label="Neuropsychiatric detail" value={c.neuropsychiatric_history_detail} name="neuropsychiatric_history_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('history') && <TextInput name="neuropsychiatric_history_detail" value={c.neuropsychiatric_history_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
                <FieldRow label="Substance use" value={displayVal(c.substance_use_present)} name="substance_use_present" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="substance_use_present" value={c.substance_use_present} options={OPT.history} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Motivational factors" value={displayVal(c.motivational_factors_present)} name="motivational_factors_present" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="motivational_factors_present" value={c.motivational_factors_present} options={OPT.motivation} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Repeat experiencer" value={displayVal(c.repeat_experiencer)} name="repeat_experiencer" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('history') && <EnumSelect name="repeat_experiencer" value={c.repeat_experiencer} options={OPT.repeat} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
              </div>
            </Card>

            {/* Section 4 — Onset Conditions */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="onset" />}>
                Onset Conditions
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FieldRow label="Event date" value={c.event_date} name="event_date" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <TextInput name="event_date" value={c.event_date} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Date precision" value={displayVal(c.event_date_precision)} name="event_date_precision" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <EnumSelect name="event_date_precision" value={c.event_date_precision} options={OPT.datePrecision} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Time of day" value={c.event_time_of_day} name="event_time_of_day" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <TextInput name="event_time_of_day" value={c.event_time_of_day} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Sleep/wake state" value={displayVal(c.sleep_wake_state_at_onset)} name="sleep_wake_state_at_onset" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <EnumSelect name="sleep_wake_state_at_onset" value={c.sleep_wake_state_at_onset} options={OPT.sleepWake} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Location type" value={displayVal(c.physical_location_type)} name="physical_location_type" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <EnumSelect name="physical_location_type" value={c.physical_location_type} options={OPT.location} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.physical_location_detail || isEditing('onset')) && (
                  <FieldRow label="Location detail" value={c.physical_location_detail} name="physical_location_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('onset') && <TextInput name="physical_location_detail" value={c.physical_location_detail} editState={editState} onEditChange={onEditChange} />}
                  </FieldRow>
                )}
                <FieldRow label="Alone at onset" value={displayVal(c.alone_at_onset)} name="alone_at_onset" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <EnumSelect name="alone_at_onset" value={c.alone_at_onset} options={OPT.alone} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Witness count" value={c.witness_count} name="witness_count" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <NumberInput name="witness_count" value={c.witness_count} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Psychological state" value={displayVal(c.psychological_state_preceding)} name="psychological_state_preceding" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <EnumSelect name="psychological_state_preceding" value={c.psychological_state_preceding} options={OPT.psychState} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Altered state depth" value={displayVal(c.altered_state_at_onset)} name="altered_state_at_onset" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <EnumSelect name="altered_state_at_onset" value={c.altered_state_at_onset} options={OPT.alteredDepth} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Altered state types" value={displayArr(c.altered_state_types)} name="altered_state_types" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('onset') && <MultiChips name="altered_state_types" value={c.altered_state_types} options={OPT.alteredType} editState={editState} onEditChange={onEditChange as (n: string, v: string[]) => void} />}
                </FieldRow>
              </div>
            </Card>

            {/* Section 5 — Phenomenological Content */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="phenom" />}>
                Phenomenological Content
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FieldRow label="Duration" value={displayVal(c.duration_of_experience)} name="duration_of_experience" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="duration_of_experience" value={c.duration_of_experience} options={OPT.duration} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Missing time" value={displayVal(c.missing_time_reported)} name="missing_time_reported" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="missing_time_reported" value={c.missing_time_reported} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.missing_time_duration || isEditing('phenom')) && (
                  <FieldRow label="Missing time duration" value={c.missing_time_duration} name="missing_time_duration" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('phenom') && <TextInput name="missing_time_duration" value={c.missing_time_duration} editState={editState} onEditChange={onEditChange} />}
                  </FieldRow>
                )}
                <FieldRow label="Paralysis" value={displayVal(c.paralysis_reported)} name="paralysis_reported" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="paralysis_reported" value={c.paralysis_reported} options={OPT.paralysis} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Physical transport" value={displayVal(c.perceived_physical_transport)} name="perceived_physical_transport" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="perceived_physical_transport" value={c.perceived_physical_transport} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="OBE sensation" value={displayVal(c.out_of_body_sensation)} name="out_of_body_sensation" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="out_of_body_sensation" value={c.out_of_body_sensation} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Floating sensation" value={displayVal(c.floating_sensation)} name="floating_sensation" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="floating_sensation" value={c.floating_sensation} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Tunnel/passage" value={displayVal(c.tunnel_or_passage_sensation)} name="tunnel_or_passage_sensation" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="tunnel_or_passage_sensation" value={c.tunnel_or_passage_sensation} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>

                <div style={{ borderTop: '1px dashed var(--border-dim)', margin: '6px 0' }} />
                <FieldRow label="Entity presence" value={displayVal(c.entity_presence)} name="entity_presence" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="entity_presence" value={c.entity_presence} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Entity count" value={displayVal(c.entity_count)} name="entity_count" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="entity_count" value={c.entity_count} options={OPT.entityCount} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Entity types" value={displayArr(c.entity_types)} name="entity_types" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <MultiChips name="entity_types" value={c.entity_types} options={OPT.entityType} editState={editState} onEditChange={onEditChange as (n: string, v: string[]) => void} />}
                </FieldRow>
                {(c.entity_types_detail || isEditing('phenom')) && (
                  <FieldRow label="Entity types detail" value={c.entity_types_detail} name="entity_types_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('phenom') && <TextInput name="entity_types_detail" value={c.entity_types_detail} editState={editState} onEditChange={onEditChange} />}
                  </FieldRow>
                )}
                <FieldRow label="Entity communication" value={displayVal(c.entity_communication_present)} name="entity_communication_present" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="entity_communication_present" value={c.entity_communication_present} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Communication modality" value={displayArr(c.entity_communication_modality)} name="entity_communication_modality" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <MultiChips name="entity_communication_modality" value={c.entity_communication_modality} options={OPT.entityCommMod} editState={editState} onEditChange={onEditChange as (n: string, v: string[]) => void} />}
                </FieldRow>
                <FieldRow label="Communication content" value={displayArr(c.entity_communication_content_type)} name="entity_communication_content_type" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <MultiChips name="entity_communication_content_type" value={c.entity_communication_content_type} options={OPT.entityCommCt} editState={editState} onEditChange={onEditChange as (n: string, v: string[]) => void} />}
                </FieldRow>
                <FieldRow label="Mission messaging" value={displayVal(c.educational_or_mission_messaging)} name="educational_or_mission_messaging" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="educational_or_mission_messaging" value={c.educational_or_mission_messaging} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>

                <div style={{ borderTop: '1px dashed var(--border-dim)', margin: '6px 0' }} />
                <FieldRow label="Medical procedure motif" value={displayVal(c.medical_procedure_motif)} name="medical_procedure_motif" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="medical_procedure_motif" value={c.medical_procedure_motif} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.medical_procedure_detail || isEditing('phenom')) && (
                  <FieldRow label="Medical procedure detail" value={c.medical_procedure_detail} name="medical_procedure_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('phenom') && <TextInput name="medical_procedure_detail" value={c.medical_procedure_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
                <FieldRow label="Reproductive/sexual motif" value={displayVal(c.reproductive_or_sexual_motif)} name="reproductive_or_sexual_motif" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="reproductive_or_sexual_motif" value={c.reproductive_or_sexual_motif} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Craft/vehicle reported" value={displayVal(c.craft_or_vehicle_reported)} name="craft_or_vehicle_reported" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <EnumSelect name="craft_or_vehicle_reported" value={c.craft_or_vehicle_reported} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.craft_description || isEditing('phenom')) && (
                  <FieldRow label="Craft description" value={c.craft_description} name="craft_description" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('phenom') && <TextInput name="craft_description" value={c.craft_description} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}

                <div style={{ borderTop: '1px dashed var(--border-dim)', margin: '6px 0' }} />
                <FieldRow label="Physiological symptoms" value={displayArr(c.physiological_symptoms)} name="physiological_symptoms" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <MultiChips name="physiological_symptoms" value={c.physiological_symptoms} options={OPT.physSymptom} editState={editState} onEditChange={onEditChange as (n: string, v: string[]) => void} />}
                </FieldRow>
                <FieldRow label="Emotional valence" value={displayArr(c.emotional_valence_during_event)} name="emotional_valence_during_event" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('phenom') && <MultiChips name="emotional_valence_during_event" value={c.emotional_valence_during_event} options={OPT.emotValence} editState={editState} onEditChange={onEditChange as (n: string, v: string[]) => void} />}
                </FieldRow>
              </div>
            </Card>

            {/* Section 6 — Physical Evidence */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="evidence" />}>
                Physical &amp; Physiological Evidence
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FieldRow label="Physical marks" value={displayVal(c.physical_marks_present)} name="physical_marks_present" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('evidence') && <EnumSelect name="physical_marks_present" value={c.physical_marks_present} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.physical_marks_detail || isEditing('evidence')) && (
                  <FieldRow label="Marks detail" value={c.physical_marks_detail} name="physical_marks_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('evidence') && <TextInput name="physical_marks_detail" value={c.physical_marks_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
                <FieldRow label="Marks medically examined" value={displayVal(c.physical_marks_medically_examined)} name="physical_marks_medically_examined" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('evidence') && <EnumSelect name="physical_marks_medically_examined" value={c.physical_marks_medically_examined} options={OPT.psychPresence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Environmental evidence" value={displayVal(c.environmental_physical_evidence)} name="environmental_physical_evidence" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('evidence') && <EnumSelect name="environmental_physical_evidence" value={c.environmental_physical_evidence} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Independent corroboration" value={displayVal(c.independent_corroboration_present)} name="independent_corroboration_present" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('evidence') && <EnumSelect name="independent_corroboration_present" value={c.independent_corroboration_present} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.independent_corroboration_detail || isEditing('evidence')) && (
                  <FieldRow label="Corroboration detail" value={c.independent_corroboration_detail} name="independent_corroboration_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('evidence') && <TextInput name="independent_corroboration_detail" value={c.independent_corroboration_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
                <FieldRow label="EEG/neurological data" value={displayVal(c.eeg_or_neurological_data_available)} name="eeg_or_neurological_data_available" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('evidence') && <EnumSelect name="eeg_or_neurological_data_available" value={c.eeg_or_neurological_data_available} options={OPT.psychPresence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Blood/toxicology data" value={displayVal(c.blood_or_toxicology_data_available)} name="blood_or_toxicology_data_available" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('evidence') && <EnumSelect name="blood_or_toxicology_data_available" value={c.blood_or_toxicology_data_available} options={OPT.psychPresence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
              </div>
            </Card>

            {/* Section 7 — Psychological Profile */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="psych" />}>
                Psychological Profile
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {([
                  ['fantasy_proneness', 'Fantasy proneness'],
                  ['hypnotic_suggestibility', 'Hypnotic suggestibility'],
                  ['boundary_thinness', 'Boundary thinness'],
                  ['dissociation', 'Dissociation'],
                ] as const).map(([key, label]) => (
                  <React.Fragment key={key}>
                    <FieldRow label={label} value={displayVal((c as unknown as Record<string, string | null>)[`${key}_assessed`])} name={`${key}_assessed`} editingSection={ed} editState={editState} onEditChange={onEditChange}>
                      {isEditing('psych') && <EnumSelect name={`${key}_assessed`} value={(c as unknown as Record<string, string | null>)[`${key}_assessed`]} options={OPT.psychPresence} editState={editState} onEditChange={onEditChange} />}
                    </FieldRow>
                    {((c as unknown as Record<string, number | null>)[`${key}_score`] != null || isEditing('psych')) && (
                      <FieldRow label={`${label} score`} value={(c as unknown as Record<string, number | null>)[`${key}_score`]} name={`${key}_score`} editingSection={ed} editState={editState} onEditChange={onEditChange}>
                        {isEditing('psych') && <NumberInput name={`${key}_score`} value={(c as unknown as Record<string, number | null>)[`${key}_score`]} editState={editState} onEditChange={onEditChange} />}
                      </FieldRow>
                    )}
                    {((c as unknown as Record<string, string | null>)[`${key}_instrument`] || isEditing('psych')) && (
                      <FieldRow label={`${label} instrument`} value={(c as unknown as Record<string, string | null>)[`${key}_instrument`]} name={`${key}_instrument`} editingSection={ed} editState={editState} onEditChange={onEditChange}>
                        {isEditing('psych') && <TextInput name={`${key}_instrument`} value={(c as unknown as Record<string, string | null>)[`${key}_instrument`]} editState={editState} onEditChange={onEditChange} />}
                      </FieldRow>
                    )}
                  </React.Fragment>
                ))}
                <FieldRow label="PTSD symptoms" value={displayVal(c.ptsd_symptoms_assessed)} name="ptsd_symptoms_assessed" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('psych') && <EnumSelect name="ptsd_symptoms_assessed" value={c.ptsd_symptoms_assessed} options={OPT.psychPresence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="PTSD level" value={displayVal(c.ptsd_symptoms_present)} name="ptsd_symptoms_present" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('psych') && <EnumSelect name="ptsd_symptoms_present" value={c.ptsd_symptoms_present} options={OPT.clinicalLevel} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Psychopathology screened" value={displayVal(c.psychopathology_screened)} name="psychopathology_screened" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('psych') && <EnumSelect name="psychopathology_screened" value={c.psychopathology_screened} options={OPT.psychPresence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Psychopathology findings" value={displayVal(c.psychopathology_findings)} name="psychopathology_findings" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('psych') && <EnumSelect name="psychopathology_findings" value={c.psychopathology_findings} options={OPT.clinicalPres} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.psychopathology_detail || isEditing('psych')) && (
                  <FieldRow label="Psychopathology detail" value={c.psychopathology_detail} name="psychopathology_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('psych') && <TextInput name="psychopathology_detail" value={c.psychopathology_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
              </div>
            </Card>

            {/* Section 8 — Memory & Retrieval */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="memory" />}>
                Memory &amp; Retrieval
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FieldRow label="Retrieval method" value={displayArr(c.memory_retrieval_method)} name="memory_retrieval_method" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('memory') && <MultiChips name="memory_retrieval_method" value={c.memory_retrieval_method} options={OPT.memRetrieval} editState={editState} onEditChange={onEditChange as (n: string, v: string[]) => void} />}
                </FieldRow>
                <FieldRow label="Hypnosis used" value={displayVal(c.hypnosis_used)} name="hypnosis_used" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('memory') && <EnumSelect name="hypnosis_used" value={c.hypnosis_used} options={OPT.psychPresence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.hypnotist_identity || isEditing('memory')) && (
                  <FieldRow label="Hypnotist identity" value={c.hypnotist_identity} name="hypnotist_identity" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('memory') && <TextInput name="hypnotist_identity" value={c.hypnotist_identity} editState={editState} onEditChange={onEditChange} />}
                  </FieldRow>
                )}
                <FieldRow label="Investigator involved" value={displayVal(c.investigator_or_therapist_involved)} name="investigator_or_therapist_involved" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('memory') && <EnumSelect name="investigator_or_therapist_involved" value={c.investigator_or_therapist_involved} options={OPT.psychPresence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.investigator_detail || isEditing('memory')) && (
                  <FieldRow label="Investigator detail" value={c.investigator_detail} name="investigator_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('memory') && <TextInput name="investigator_detail" value={c.investigator_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
                <FieldRow label="Account consistency" value={displayVal(c.account_consistency_over_time)} name="account_consistency_over_time" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('memory') && <EnumSelect name="account_consistency_over_time" value={c.account_consistency_over_time} options={OPT.consistency} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Accounts on record" value={c.number_of_accounts_on_record} name="number_of_accounts_on_record" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('memory') && <NumberInput name="number_of_accounts_on_record" value={c.number_of_accounts_on_record} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
              </div>
            </Card>

            {/* Section 9 — Aftermath */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="aftermath" />}>
                Aftermath &amp; Long-term Effects
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FieldRow label="Positive transformation" value={displayVal(c.positive_transformation_reported)} name="positive_transformation_reported" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('aftermath') && <EnumSelect name="positive_transformation_reported" value={c.positive_transformation_reported} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.positive_transformation_detail || isEditing('aftermath')) && (
                  <FieldRow label="Positive detail" value={c.positive_transformation_detail} name="positive_transformation_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('aftermath') && <TextInput name="positive_transformation_detail" value={c.positive_transformation_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
                <FieldRow label="Negative psychological aftermath" value={displayVal(c.negative_psychological_aftermath)} name="negative_psychological_aftermath" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('aftermath') && <EnumSelect name="negative_psychological_aftermath" value={c.negative_psychological_aftermath} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.negative_aftermath_detail || isEditing('aftermath')) && (
                  <FieldRow label="Negative detail" value={c.negative_aftermath_detail} name="negative_aftermath_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('aftermath') && <TextInput name="negative_aftermath_detail" value={c.negative_aftermath_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
                <FieldRow label="Ongoing contact" value={displayVal(c.ongoing_contact_reported)} name="ongoing_contact_reported" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('aftermath') && <EnumSelect name="ongoing_contact_reported" value={c.ongoing_contact_reported} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Changed worldview" value={displayVal(c.changed_worldview_reported)} name="changed_worldview_reported" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('aftermath') && <EnumSelect name="changed_worldview_reported" value={c.changed_worldview_reported} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                {(c.worldview_change_detail || isEditing('aftermath')) && (
                  <FieldRow label="Worldview detail" value={c.worldview_change_detail} name="worldview_change_detail" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                    {isEditing('aftermath') && <TextInput name="worldview_change_detail" value={c.worldview_change_detail} editState={editState} onEditChange={onEditChange} rows={2} />}
                  </FieldRow>
                )}
                <FieldRow label="Sought community/support" value={displayVal(c.sought_community_or_support)} name="sought_community_or_support" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('aftermath') && <EnumSelect name="sought_community_or_support" value={c.sought_community_or_support} options={OPT.presence} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Community type" value={displayArr(c.community_type)} name="community_type" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('aftermath') && <MultiChips name="community_type" value={c.community_type} options={OPT.community} editState={editState} onEditChange={onEditChange as (n: string, v: string[]) => void} />}
                </FieldRow>
              </div>
            </Card>

            {/* Section 10 — Corroboration Quality */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={<SectionActions section="corroboration" />}>
                Corroboration Quality
              </SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FieldRow label="Corroboration level" value={c.corroboration_level ? <CorroborationBadge level={c.corroboration_level} /> : null} name="corroboration_level" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('corroboration') && <EnumSelect name="corroboration_level" value={c.corroboration_level} options={OPT.corroboration} editState={editState} onEditChange={onEditChange} />}
                </FieldRow>
                <FieldRow label="Quality notes" value={c.case_quality_notes} name="case_quality_notes" editingSection={ed} editState={editState} onEditChange={onEditChange}>
                  {isEditing('corroboration') && <TextInput name="case_quality_notes" value={c.case_quality_notes} editState={editState} onEditChange={onEditChange} rows={3} />}
                </FieldRow>
              </div>
            </Card>

            {saveMutation.isError && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--status-error)', padding: 'var(--space-2)' }}>
                ✗ Save failed
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Review status */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader>Review status</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {c.reviewed ? (
                  <Badge label="reviewed" color="var(--status-ok)" bg="var(--status-ok-bg)" />
                ) : (
                  <Badge label="unreviewed" color="var(--status-warn)" bg="var(--status-warn-bg)" />
                )}
                {c.reviewed_by && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    by {c.reviewed_by}
                  </span>
                )}
                {c.reviewed_at && (
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {c.reviewed_at.slice(0, 10)}
                  </span>
                )}
                {!c.reviewed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    {!showRejectConfirm ? (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          onClick={() => acceptMutation.mutate()}
                        >
                          {acceptMutation.isPending ? 'accepting…' : 'accept'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={acceptMutation.isPending || rejectMutation.isPending}
                          onClick={() => setShowRejectConfirm(true)}
                        >
                          reject
                        </Button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          Reject and delete this draft?
                        </span>
                        <Button size="sm" disabled={rejectMutation.isPending} onClick={() => setShowRejectConfirm(false)}>
                          cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate()}
                        >
                          {rejectMutation.isPending ? 'deleting…' : 'confirm reject'}
                        </Button>
                      </>
                    )}
                    {(acceptMutation.isError || rejectMutation.isError) && (
                      <span style={{ fontSize: 11, color: 'var(--status-error)', fontFamily: 'var(--font-mono)' }}>
                        ✗ Action failed
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Key metrics */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader>Key fields</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <MetaStat label="Age at event" value={c.experiencer_age_at_event ?? '—'} />
                <MetaStat label="Entities" value={c.entity_presence ? c.entity_presence.replace(/_/g, ' ') : '—'} />
                <MetaStat label="Paralysis" value={c.paralysis_reported ? c.paralysis_reported.replace(/_/g, ' ') : '—'} />
                <MetaStat label="Hypnosis used" value={c.hypnosis_used ?? '—'} />
                <MetaStat label="Sleep/wake" value={c.sleep_wake_state_at_onset ? c.sleep_wake_state_at_onset.replace(/_/g, ' ') : '—'} />
              </div>
            </Card>

            {/* Provenance */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader>Provenance</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <MetaStat label="Added" value={c.created_at.slice(0, 10)} />
                <MetaStat label="Updated" value={c.updated_at.slice(0, 10)} />
              </div>
            </Card>

            {/* Danger zone */}
            <Card style={{ padding: 'var(--space-4)', borderColor: 'var(--status-error)44' }}>
              <SectionHeader>Danger zone</SectionHeader>
              {showDeleteConfirm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    This will permanently delete the case record. This cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button size="sm" variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                      {deleteMutation.isPending ? 'deleting…' : 'confirm delete'}
                    </Button>
                    <Button size="sm" onClick={() => setShowDeleteConfirm(false)}>cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                  delete case
                </Button>
              )}
            </Card>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
              {c.id}
            </div>
          </div>
        </div>
      </Page>
    </Shell>
  );
}

function MetaStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}
