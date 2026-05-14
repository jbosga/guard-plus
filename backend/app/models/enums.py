import enum


# ── Retained cross-layer enums ─────────────────────────────────────────────────

class DisciplinaryFrame(str, enum.Enum):
    NEUROSCIENCE = "neuroscience"
    PSYCHOLOGY = "psychology"
    FOLKLORE = "folklore"
    PHYSICS = "physics"
    PARAPSYCHOLOGY = "parapsychology"
    SOCIOLOGY = "sociology"
    ANTHROPOLOGY = "anthropology"
    PSYCHIATRY = "psychiatry"
    UFOLOGY = "ufology"
    PHILOSOPHY = "philosophy"
    OTHER = "other"

class ProvenanceQuality(str, enum.Enum):
    PEER_REVIEWED = "peer_reviewed"
    GREY_LITERATURE = "grey_literature"
    ANECDOTAL = "anecdotal"
    INVESTIGATOR_REPORT = "investigator_report"
    SELF_REPORTED = "self_reported"
    UNKNOWN = "unknown"

class EpistemicStatus(str, enum.Enum):
    """Used by Concept.epistemic_status."""
    ASSERTED = "asserted"
    OBSERVED = "observed"
    INFERRED = "inferred"
    SPECULATIVE = "speculative"
    CONTESTED = "contested"
    RETRACTED = "retracted"

class TagCategory(str, enum.Enum):
    PERCEPTUAL = "perceptual"
    SOMATIC = "somatic"
    COGNITIVE = "cognitive"
    NARRATIVE = "narrative"
    ENVIRONMENTAL = "environmental"
    EMOTIONAL = "emotional"

class ConceptType(str, enum.Enum):
    PHENOMENON = "phenomenon"
    MECHANISM = "mechanism"
    ENTITY = "entity"
    LOCATION = "location"
    PROCESS = "process"
    THEORETICAL_CONSTRUCT = "theoretical_construct"

class RelationshipType(str, enum.Enum):
    CORRELATES_WITH = "correlates_with"
    PRECEDES = "precedes"
    CAUSES = "causes"
    CONTRADICTS = "contradicts"
    IS_INSTANCE_OF = "is_instance_of"
    CO_OCCURS_WITH = "co_occurs_with"
    IS_EXPLAINED_BY = "is_explained_by"
    ANOMALOUS_GIVEN = "anomalous_given"

class RelationshipStrength(str, enum.Enum):
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"

class HypothesisFramework(str, enum.Enum):
    NEUROLOGICAL = "neurological"
    PSYCHOLOGICAL = "psychological"
    SOCIOCULTURAL = "sociocultural"
    PHYSICAL = "physical"
    INTERDIMENSIONAL = "interdimensional"
    INFORMATION_THEORETIC = "information_theoretic"
    PSYCHOSPIRITUAL = "psychospiritual"
    UNKNOWN = "unknown"

class AssumedOntology(str, enum.Enum):
    PHYSICALISM = "physicalism"
    DUALISM = "dualism"
    PANPSYCHISM = "panpsychism"
    IDEALISM = "idealism"
    UNKNOWN = "unknown"
    NOVEL = "novel"

class EpistemicNoteType(str, enum.Enum):
    METHODOLOGICAL_CONCERN = "methodological_concern"
    REPLICATION = "replication"
    CONTRADICTION = "contradiction"
    UPDATE = "update"
    PERSONAL_OBSERVATION = "personal_observation"

class AttachableEntityType(str, enum.Enum):
    CLAIM = "claim"
    CONCEPT = "concept"
    HYPOTHESIS = "hypothesis"
    CONCEPT_RELATIONSHIP = "concept_relationship"
    SOURCE = "source"

class IngestionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"

class IngestionMethod(str, enum.Enum):
    AI = "ai"
    MANUAL = "manual"
    BULK_IMPORT = "bulk_import"

class HypothesisType(str, enum.Enum):
    CAUSAL = "causal"
    CORRELATIONAL = "correlational"
    MECHANISTIC = "mechanistic"
    TAXONOMIC = "taxonomic"
    PREDICTIVE = "predictive"

class HypothesisStatus(str, enum.Enum):
    ACTIVE = "active"
    DORMANT = "dormant"
    ABANDONED = "abandoned"
    MERGED = "merged"
    REFUTED = "refuted"

class ConfidenceLevel(str, enum.Enum):
    SPECULATIVE = "speculative"
    PLAUSIBLE = "plausible"
    SUPPORTED = "supported"
    CONTESTED = "contested"

class FrameworkStatus(str, enum.Enum):
    ACTIVE = "active"
    DORMANT = "dormant"
    ABANDONED = "abandoned"
    MERGED = "merged"
    REFUTED = "refuted"

# ── Observation layer ─────────────────────────────────────────────────────────

class ObservationEpistemicStatus(str, enum.Enum):
    REPORTED = "reported"
    CORROBORATED = "corroborated"
    CONTESTED = "contested"
    ARTEFACTUAL = "artefactual"
    RETRACTED = "retracted"

class ObservationSourceType(str, enum.Enum):
    LITERATURE = "literature"
    CORPUS_DERIVED = "corpus_derived"

# ── Source layer ──────────────────────────────────────────────────────────────

class SourceType(str, enum.Enum):
    CASE_REPORT = "case_report"
    EMPIRICAL_STUDY = "empirical_study"
    REVIEW_PAPER = "review_paper"
    THEORETICAL = "theoretical"

# ── Case layer — extraction provenance ────────────────────────────────────────

class ExtractionMethod(str, enum.Enum):
    MANUAL = "manual"
    AI_ASSISTED = "ai_assisted"
    IMPORTED = "imported"

# ── Case layer — corpus-derived observation ───────────────────────────────────

class CasesIncluded(str, enum.Enum):
    ALL = "all"
    FILTERED_SUBSET = "filtered_subset"

# ── Case layer — identification & onset ──────────────────────────────────────

class EventDatePrecision(str, enum.Enum):
    EXACT = "exact"
    MONTH_AND_YEAR = "month_and_year"
    YEAR_ONLY = "year_only"
    DECADE = "decade"
    UNKNOWN = "unknown"

class SleepWakeState(str, enum.Enum):
    FULLY_AWAKE = "fully_awake"
    DROWSY = "drowsy"
    HYPNAGOGIC = "hypnagogic"
    HYPNOPOMPIC = "hypnopompic"
    ASLEEP = "asleep"
    UNKNOWN = "unknown"

class PhysicalLocationType(str, enum.Enum):
    BEDROOM = "bedroom"
    OTHER_INDOOR = "other_indoor"
    VEHICLE = "vehicle"
    OUTDOOR_RURAL = "outdoor_rural"
    OUTDOOR_URBAN = "outdoor_urban"
    UNKNOWN = "unknown"

class AloneatOnset(str, enum.Enum):
    ALONE = "alone"
    OTHERS_PRESENT = "others_present"
    UNKNOWN = "unknown"

class PsychologicalStateType(str, enum.Enum):
    NORMAL = "normal"
    STRESSED = "stressed"
    ANXIOUS = "anxious"
    DEPRESSED = "depressed"
    ELATED = "elated"
    DISSOCIATED = "dissociated"
    UNKNOWN = "unknown"

class AlteredStateDepth(str, enum.Enum):
    NONE = "none"
    MILD = "mild"
    MODERATE = "moderate"
    DEEP = "deep"
    UNKNOWN = "unknown"

class AlteredStateType(str, enum.Enum):  # multi-select (stored as JSONB)
    DROWSINESS = "drowsiness"
    INTOXICATION = "intoxication"
    MEDITATION = "meditation"
    DISSOCIATION = "dissociation"
    FEVER = "fever"
    SENSORY_DEPRIVATION = "sensory_deprivation"
    OTHER = "other"

class EventDuration(str, enum.Enum):
    SECONDS = "seconds"
    MINUTES = "minutes"
    UNDER_ONE_HOUR = "under_one_hour"
    ONE_TO_SEVERAL_HOURS = "one_to_several_hours"
    UNKNOWN = "unknown"

class PresenceAbsenceUnknown(str, enum.Enum):
    NONE = "none"
    YES = "yes"
    UNKNOWN = "unknown"

class ParalysisExtent(str, enum.Enum):
    NONE = "none"
    PARTIAL = "partial"
    FULL = "full"
    UNKNOWN = "unknown"

class EntityCount(str, enum.Enum):
    ONE = "one"
    TWO_TO_FIVE = "two_to_five"
    MORE_THAN_FIVE = "more_than_five"
    UNKNOWN = "unknown"

class EntityType(str, enum.Enum):  # multi-select (stored as JSONB)
    GREY = "grey"
    NORDIC = "nordic"
    REPTILIAN = "reptilian"
    SHADOW = "shadow"
    ROBOTIC = "robotic"
    INSECTOID = "insectoid"
    HYBRID = "hybrid"
    LUMINOUS = "luminous"
    AMORPHOUS = "amorphous"
    OTHER = "other"
    UNKNOWN = "unknown"

class EntityCommunicationModality(str, enum.Enum):  # multi-select (stored as JSONB)
    VERBAL_AUDITORY = "verbal_auditory"
    TELEPATHIC = "telepathic"
    VISUAL = "visual"
    GESTURAL = "gestural"
    EMOTIONAL_TRANSFER = "emotional_transfer"
    OTHER = "other"

class EntityCommunicationContentType(str, enum.Enum):  # multi-select (stored as JSONB)
    EDUCATIONAL = "educational"
    WARNING = "warning"
    MISSION = "mission"
    PERSONAL = "personal"
    PROCEDURAL = "procedural"
    UNINTELLIGIBLE = "unintelligible"
    OTHER = "other"

class PhysiologicalSymptom(str, enum.Enum):  # multi-select (stored as JSONB)
    CHEST_PRESSURE = "chest_pressure"
    VISUAL_HALLUCINATIONS = "visual_hallucinations"
    AUDITORY_HALLUCINATIONS = "auditory_hallucinations"
    NAUSEA = "nausea"
    PAIN = "pain"
    VIBRATION = "vibration"
    HEAT_OR_COLD = "heat_or_cold"
    PARALYSIS = "paralysis"
    PALPITATIONS = "palpitations"
    OTHER = "other"
    NONE = "none"

class EmotionalValence(str, enum.Enum):  # multi-select (stored as JSONB)
    TERROR = "terror"
    ANXIETY = "anxiety"
    AWE = "awe"
    CALM = "calm"
    JOY = "joy"
    CONFUSION = "confusion"
    SADNESS = "sadness"
    NONE_REPORTED = "none_reported"
    UNKNOWN = "unknown"

class CorroborationLevelV2(str, enum.Enum):
    TESTIMONY_ONLY = "testimony_only"
    CORROBORATED_BY_WITNESS = "corroborated_by_witness"
    CORROBORATED_BY_PHYSICAL_EVIDENCE = "corroborated_by_physical_evidence"
    CORROBORATED_BY_BOTH = "corroborated_by_both"
    UNKNOWN = "unknown"

class MemoryRetrievalMethod(str, enum.Enum):  # multi-select (stored as JSONB)
    SPONTANEOUS_RECALL = "spontaneous_recall"
    HYPNOTIC_REGRESSION = "hypnotic_regression"
    GUIDED_IMAGERY = "guided_imagery"
    THERAPY = "therapy"
    SELF_HYPNOSIS = "self_hypnosis"
    DREAM_RECALL = "dream_recall"
    JOURNALING = "journaling"
    INVESTIGATOR_INTERVIEW = "investigator_interview"
    UNKNOWN = "unknown"

class AccountConsistency(str, enum.Enum):
    NOT_ASSESSED = "not_assessed"
    CONSISTENT = "consistent"
    MINOR_VARIATIONS = "minor_variations"
    SIGNIFICANT_VARIATIONS = "significant_variations"
    CONTRADICTORY = "contradictory"

# ── Case layer — demographics ─────────────────────────────────────────────────

class ExperiencerSex(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    INTERSEX = "intersex"
    NOT_REPORTED = "not_reported"

class EducationLevel(str, enum.Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    TERTIARY = "tertiary"
    POSTGRADUATE = "postgraduate"
    NOT_REPORTED = "not_reported"

class MaritalStatus(str, enum.Enum):
    SINGLE = "single"
    MARRIED = "married"
    PARTNERED = "partnered"
    DIVORCED = "divorced"
    WIDOWED = "widowed"
    NOT_REPORTED = "not_reported"

class Religiosity(str, enum.Enum):
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    NOT_REPORTED = "not_reported"

# ── Case layer — background history ──────────────────────────────────────────

class PriorInterestLevel(str, enum.Enum):
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    NOT_REPORTED = "not_reported"

class HistoryPresence(str, enum.Enum):
    NONE = "none"
    SUSPECTED = "suspected"
    CONFIRMED = "confirmed"
    NOT_REPORTED = "not_reported"

class MotivationalFactors(str, enum.Enum):
    NONE_APPARENT = "none_apparent"
    SUSPECTED = "suspected"
    CONFIRMED = "confirmed"
    NOT_ASSESSED = "not_assessed"

class RepeatExperiencer(str, enum.Enum):
    FIRST_EXPERIENCE = "first_experience"
    REPEAT_EXPERIENCER = "repeat_experiencer"
    NOT_REPORTED = "not_reported"

# ── Case layer — psychological assessment ────────────────────────────────────

class PsychometricPresence(str, enum.Enum):
    NO = "no"
    YES = "yes"
    UNKNOWN = "unknown"

class PsychometricLevel(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"

class ClinicalLevel(str, enum.Enum):
    NONE = "none"
    SUBCLINICAL = "subclinical"
    CLINICAL = "clinical"

class ClinicalPresence(str, enum.Enum):
    NONE = "none"
    SUBCLINICAL = "subclinical"
    CLINICAL_DIAGNOSIS = "clinical_diagnosis"

# ── Case layer — community ────────────────────────────────────────────────────

class CommunityType(str, enum.Enum):  # multi-select (stored as JSONB)
    UFO_GROUP = "ufo_group"
    THERAPY = "therapy"
    RELIGION = "religion"
    ONLINE_COMMUNITY = "online_community"
    RESEARCH_PARTICIPATION = "research_participation"
    OTHER = "other"
