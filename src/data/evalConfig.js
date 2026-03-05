/** @format */

// 1) Canonical entities (single source of truth)
export const TASKS = {
	summarisation: { id: "summarisation", label: "Summarisation" },
};

export const USE_CASES = {
	social_media_posts: { id: "social_media_posts", label: "Social Media Posts" },
	patient_notes: { id: "patient_notes", label: "Patient Notes" },
};

// Requirements are reusable across use cases
export const REQUIREMENTS = {
	accurate_representation: {
		id: "accurate_representation",
		label: "Accurate representation of posts",
	},
	clinically_relevant_only: {
		id: "clinically_relevant_only",
		label: "Only include clinically relevant information",
	},
	reflect_progression: {
		id: "reflect_progression",
		label: "Accurately reflect client progression",
	},
	preserve_language: {
		id: "preserve_language",
		label: "Preserve language of posts",
	},
	anonymise_data: { id: "anonymise_data", label: "Anonymise data" },
};

// Aspects are reusable across requirements
export const ASPECTS = {
	factual_consistency: {
		id: "factual_consistency",
		label: "Factual consistency",
	},
	meaning_preservation: {
		id: "meaning_preservation",
		label: "Meaning preservation",
	},
	coherence: { id: "coherence", label: "Coherence" },
};

// Metrics are reusable across aspects
export const METRICS = {
	FC_expert: { id: "FC_expert", label: "FC_expert" },
	FC_document: { id: "FC_document", label: "FC_document" },
	MHIC: { id: "MHIC", label: "MHIC" },
	IntraNLI: { id: "IntraNLI", label: "IntraNLI" },
};

// Infrastructure constraints as an enum (optional)
export const INFRA_OPTIONS = {
	cpu_only: { id: "cpu_only", label: "CPU only (No GPU)" },
	gpu: { id: "gpu", label: "GPU available" },
	cloud: { id: "cloud", label: "Cloud inference" },
};

// 2) Relationships (many-to-many via ID lists)

// Which use cases belong to a task
export const TASK_TO_USECASES = {
	summarisation: ["social_media_posts", "patient_notes"],
};

// Which requirements are relevant to a given (task, useCase)
// (requirements can appear in many use cases — just reuse IDs)
export const REQUIREMENTS_BY_CONTEXT = {
	summarisation__social_media_posts: [
		"accurate_representation",
		"preserve_language",
		"clinically_relevant_only",
		"reflect_progression",
		"anonymise_data",
	],
};

// Which aspects support which requirements (many-to-many)
export const REQUIREMENT_TO_ASPECTS = {
	accurate_representation: ["factual_consistency"],
	clinically_relevant_only: ["meaning_preservation"],
	reflect_progression: ["coherence"],
	// You can add: preserve_language -> [meaning_preservation, coherence] later, etc.
};

// Which metrics measure which aspects (many-to-many)
export const ASPECT_TO_METRICS = {
	factual_consistency: ["FC_expert", "FC_document"],
	meaning_preservation: ["MHIC"],
	coherence: ["IntraNLI"],
};
