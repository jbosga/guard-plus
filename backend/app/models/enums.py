import enum

class SourceType(str, enum.Enum):
    ACCOUNT = "account"
    PAPER = "paper"
    BOOK = "book"
    INTERVIEW = "interview"
    MEDIA = "media"
    FIELD_REPORT = "field_report"

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

class AccountContext(str, enum.Enum):
    SLEEP = "sleep"
    WAKE = "wake"
    HYPNAGOGIC = "hypnagogic"
    HYPNOPOMPIC = "hypnopompic"
    ALTERED_STATE = "altered_state"
    FULL_CONSCIOUSNESS = "full_consciousness"
    UNKNOWN = "unknown"

class CorroborationLevel(str, enum.Enum):
    NONE = "none"
    WITNESS = "witness"
    PHYSICAL_TRACE = "physical_trace"
    INVESTIGATOR = "investigator"
    MULTIPLE = "multiple"

# Retained for Concept.epistemic_status — will migrate in the Concept refactor phase
class EpistemicStatus(str, enum.Enum):
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

# ── New enums: Observation layer ──────────────────────────────────────────────

class ObservationEpistemicStatus(str, enum.Enum):
    REPORTED = "reported"
    CORROBORATED = "corroborated"
    CONTESTED = "contested"
    ARTEFACTUAL = "artefactual"
    RETRACTED = "retracted"

class ContentType(str, enum.Enum):
    EXPERIENTIAL = "experiential"
    BEHAVIORAL = "behavioral"
    PHYSIOLOGICAL = "physiological"
    ENVIRONMENTAL = "environmental"
    TESTIMONIAL = "testimonial"
    DOCUMENTARY_TRACE = "documentary_trace"

class SourceModality(str, enum.Enum):
    FIRST_PERSON_VERBAL = "first_person_verbal"
    INVESTIGATOR_SUMMARY = "investigator_summary"
    PHYSIOLOGICAL = "physiological"
    BEHAVIORAL = "behavioral"
    DOCUMENTARY = "documentary"
    AGGREGATE_STATISTICAL = "aggregate_statistical"

class EpistemicDistance(str, enum.Enum):
    DIRECT = "direct"
    SUMMARIZED = "summarized"
    AGGREGATED = "aggregated"
    DERIVED = "derived"

class CollectionMethod(str, enum.Enum):
    SPONTANEOUS_REPORT = "spontaneous_report"
    STRUCTURED_INTERVIEW = "structured_interview"
    HYPNOTIC_REGRESSION = "hypnotic_regression"
    QUESTIONNAIRE = "questionnaire"
    CLINICAL_ASSESSMENT = "clinical_assessment"
    PASSIVE_RECORDING = "passive_recording"
    INVESTIGATOR_INFERENCE = "investigator_inference"

class SampleSizeTier(str, enum.Enum):
    SINGLE_CASE = "single_case"
    SMALL = "small"
    MODERATE = "moderate"
    LARGE = "large"
    POPULATION = "population"

class SamplingMethod(str, enum.Enum):
    SELF_SELECTED = "self_selected"
    INVESTIGATOR_REFERRED = "investigator_referred"
    CLINICAL = "clinical"
    SURVEY = "survey"
    CONVENIENCE = "convenience"
    UNKNOWN = "unknown"

# ── New enums: Hypothesis layer ───────────────────────────────────────────────

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
