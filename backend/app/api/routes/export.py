import csv
import io
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.corpus import Case
from app.models.enums import (
    PresenceAbsenceUnknown, SleepWakeState, ParalysisExtent,
    PsychometricPresence, CorroborationLevelV2, RepeatExperiencer,
)
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter(tags=["export"])

# All Case columns in section order, with JSONB fields noted
_COLUMNS = [
    "id", "source_id", "case_label", "extraction_method", "extraction_date",
    "extracted_by", "notes",
    # Section 2
    "experiencer_nationality", "experiencer_ethnicity", "experiencer_age_at_event",
    "experiencer_sex", "experiencer_gender", "experiencer_occupation",
    "education_level", "marital_status", "religiosity",
    # Section 3
    "prior_ufo_interest", "prior_paranormal_belief", "cultural_media_exposure_to_aae",
    "childhood_trauma_history", "childhood_abuse_history",
    "surgical_history_present", "surgical_history_detail",
    "neuropsychiatric_history_present", "neuropsychiatric_history_detail",
    "substance_use_present", "substance_use_detail",
    "motivational_factors_present", "motivational_factors_detail",
    "repeat_experiencer",
    # Section 4
    "event_date", "event_date_precision", "event_time_of_day",
    "sleep_wake_state_at_onset", "physical_location_type", "physical_location_detail",
    "alone_at_onset", "witness_count",
    "environmental_stimuli_present", "environmental_stimuli_detail",
    "psychological_state_preceding", "psychological_state_detail",
    "altered_state_at_onset", "altered_state_types",
    # Section 5
    "duration_of_experience", "missing_time_reported", "missing_time_duration",
    "paralysis_reported", "perceived_physical_transport",
    "out_of_body_sensation", "floating_sensation", "tunnel_or_passage_sensation",
    "entity_presence", "entity_count", "entity_types", "entity_types_detail",
    "entity_communication_present", "entity_communication_modality",
    "entity_communication_content_type", "educational_or_mission_messaging",
    "medical_procedure_motif", "medical_procedure_detail",
    "reproductive_or_sexual_motif", "reproductive_motif_detail",
    "craft_or_vehicle_reported", "craft_description",
    "physical_environment_changes", "physical_environment_changes_detail",
    "event_sequence_described", "event_sequence_detail",
    "physiological_symptoms", "physiological_symptoms_detail",
    "emotional_valence_during_event", "emotional_valence_detail",
    # Section 6
    "physical_marks_present", "physical_marks_detail",
    "physical_marks_medically_examined",
    "environmental_physical_evidence", "environmental_physical_evidence_detail",
    "independent_corroboration_present", "independent_corroboration_detail",
    "eeg_or_neurological_data_available", "eeg_data_detail",
    "blood_or_toxicology_data_available", "blood_data_detail",
    # Section 7
    "fantasy_proneness_assessed", "fantasy_proneness_score", "fantasy_proneness_instrument",
    "hypnotic_suggestibility_assessed", "hypnotic_suggestibility_score",
    "hypnotic_suggestibility_instrument",
    "boundary_thinness_assessed", "boundary_thinness_score", "boundary_thinness_instrument",
    "dissociation_assessed", "dissociation_score", "dissociation_instrument",
    "ptsd_symptoms_assessed", "ptsd_symptoms_present", "ptsd_instrument",
    "psychopathology_screened", "psychopathology_findings", "psychopathology_detail",
    "need_for_meaning_assessed", "need_for_meaning_level",
    "self_escape_motivation_assessed", "self_escape_motivation_level",
    # Section 8
    "memory_retrieval_method", "hypnosis_used", "hypnotist_identity",
    "investigator_or_therapist_involved", "investigator_detail",
    "account_consistency_over_time", "number_of_accounts_on_record",
    # Section 9
    "positive_transformation_reported", "positive_transformation_detail",
    "negative_psychological_aftermath", "negative_aftermath_detail",
    "ongoing_contact_reported", "ongoing_contact_detail",
    "changed_worldview_reported", "worldview_change_detail",
    "sought_community_or_support", "community_type",
    # Section 10
    "corroboration_level", "case_quality_notes",
    # Timestamps
    "created_at", "updated_at",
]

_JSONB_FIELDS = {
    "altered_state_types", "entity_types", "entity_communication_modality",
    "entity_communication_content_type", "physiological_symptoms",
    "emotional_valence_during_event", "memory_retrieval_method", "community_type",
}


def _serialize(field: str, value) -> str:
    if value is None:
        return ""
    if field in _JSONB_FIELDS and isinstance(value, list):
        return "|".join(str(v) for v in value)
    return str(value)


def _build_query(
    db: Session,
    source_id: Optional[UUID],
    entity_presence: Optional[PresenceAbsenceUnknown],
    sleep_wake_state_at_onset: Optional[SleepWakeState],
    paralysis_reported: Optional[ParalysisExtent],
    hypnosis_used: Optional[PsychometricPresence],
    corroboration_level: Optional[CorroborationLevelV2],
    repeat_experiencer: Optional[RepeatExperiencer],
):
    from sqlalchemy import or_
    q = db.query(Case)
    if source_id is not None:
        q = q.filter(Case.source_id == source_id)
    if entity_presence is not None:
        q = q.filter(Case.entity_presence == entity_presence)
    if sleep_wake_state_at_onset is not None:
        q = q.filter(Case.sleep_wake_state_at_onset == sleep_wake_state_at_onset)
    if paralysis_reported is not None:
        q = q.filter(Case.paralysis_reported == paralysis_reported)
    if hypnosis_used is not None:
        q = q.filter(Case.hypnosis_used == hypnosis_used)
    if corroboration_level is not None:
        q = q.filter(Case.corroboration_level == corroboration_level)
    if repeat_experiencer is not None:
        q = q.filter(Case.repeat_experiencer == repeat_experiencer)
    return q


@router.get("/cases/export")
def export_cases(
    source_id: Optional[UUID] = None,
    entity_presence: Optional[PresenceAbsenceUnknown] = None,
    sleep_wake_state_at_onset: Optional[SleepWakeState] = None,
    paralysis_reported: Optional[ParalysisExtent] = None,
    hypnosis_used: Optional[PsychometricPresence] = None,
    corroboration_level: Optional[CorroborationLevelV2] = None,
    repeat_experiencer: Optional[RepeatExperiencer] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _build_query(
        db, source_id, entity_presence, sleep_wake_state_at_onset,
        paralysis_reported, hypnosis_used, corroboration_level, repeat_experiencer,
    )
    cases = query.order_by(Case.created_at.asc()).all()
    snapshot_date = date.today().isoformat()
    case_count = len(cases)

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(_COLUMNS)
        yield buf.getvalue()
        for case in cases:
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([_serialize(col, getattr(case, col, None)) for col in _COLUMNS])
            yield buf.getvalue()

    filename = f"cases_export_{snapshot_date}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Corpus-Snapshot-Date": snapshot_date,
            "X-Case-Count": str(case_count),
        },
    )
