import numpy as np
from nltk import sent_tokenize
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from typing import List

class NLIScorer:
    def __init__(
        self,
        model_name: str = "MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli",
    ):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_name = model_name
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name
        ).to(self.device)

    def _compute_nli_scores(self, premise: str, hypothesis: str):
        input = self.tokenizer(
            premise, hypothesis, truncation=True, return_tensors="pt"
        ).to(self.device)
        with torch.no_grad():
            output = self.model(input["input_ids"].to(self.device))
        prediction = torch.softmax(output["logits"][0], -1).tolist()
        label_names = ["entailment", "neutral", "contradiction"]
        prediction = {name: float(pred) for pred, name in zip(prediction, label_names)}
        return prediction

    def compute_entailment_score(self, premise: str, hypothesis: str):
        return self._compute_nli_scores(premise, hypothesis)["entailment"]

    def compute_contradiction_score(self, premise: str, hypothesis: str):
        return self._compute_nli_scores(premise, hypothesis)["contradiction"]

    def compute_nli_scores(
        self,
        source_sents: List[str],
        predicted_sents: List[str],
        task: str,
        prefix: str,
        source_name: str,
    ):
        """
        Args:
            source_sents: List of source sentences to compare against
            predicted_sents: List of predicted sentences
            task: Task ID ('B' or 'C')
            prefix: Prefix for metric names ('post' or 'timeline')
            source_name: Name of the source ('gold' or 'post' or 'timeline')

        Returns:
            Dictionary with computed NLI metrics
        """
        entail_scores, contradict_scores = [], []
        if predicted_sents:
            for source_sent in source_sents:
                for predicted_sent in predicted_sents:
                    scores = self._compute_nli_scores(source_sent, predicted_sent)
                    entail_scores.append(scores["entailment"])
                    contradict_scores.append(scores["contradiction"])
            entail_scores, contradict_scores = np.array(entail_scores), np.array(
                contradict_scores
            )
            mean_consistency = 1 - contradict_scores.mean()
            max_entailment = entail_scores.max()
            max_contradiction = contradict_scores.max()
        else:
            mean_consistency = 0.0
            max_entailment = 0.0
            max_contradiction = 1.0
        
        consistency_scores = []
        # consisteny scores for each predict sentence against all source sentences
        for i, predicted_sent in enumerate(predicted_sents):
            sentence_level_consistency = [
                1 - contradict_scores[i * len(source_sents) + j]
                for j in range(len(source_sents))
            ]
            consistency_scores.append(np.mean(sentence_level_consistency))
        return {"mean_consistency": mean_consistency, 
                "sentence_level_consistencies": consistency_scores,
                "sentences": predicted_sents,
                }

    def compute_post_nli_gold(self, gold_sents: List[str], predicted_sents: List[str]):
        """Compute NLI scores for post-level summary against gold summary."""
        return self.compute_nli_scores(
            source_sents=gold_sents,
            predicted_sents=predicted_sents,
            task="B",
            prefix="post",
            source_name="gold",
        )

    def compute_post_nli_post(self, post_sents: List[str], predicted_sents: List[str]):
        """Compute NLI scores for post-level summary against post content."""
        return self.compute_nli_scores(
            source_sents=post_sents,
            predicted_sents=predicted_sents,
            task="B",
            prefix="post",
            source_name="post",
        )

    def compute_timeline_nli_gold(
        self, gold_sents: List[str], predicted_sents: List[str]
    ):
        """Compute NLI scores for timeline-level summary against timeline summary."""
        return self.compute_nli_scores(
            source_sents=gold_sents,
            predicted_sents=predicted_sents,
            task="C",
            prefix="timeline",
            source_name="gold",
        )

    def compute_timeline_nli_timeline(
        self, timeline_sents: List[str], predicted_sents: List[str]
    ):
        """Compute NLI scores for timeline-level summary against timeline content."""
        return self.compute_nli_scores(
            source_sents=timeline_sents,
            predicted_sents=predicted_sents,
            task="C",
            prefix="timeline",
            source_name="timeline",
        )



class FactualConsistency:
    def __init__(self):
        self.ns = NLIScorer()
    
    
    def _calculate_fc_expert_metric(self, llm_text: str, gold_text: str) -> float:
        llm_sentences = sent_tokenize(llm_text)
        gold_sentences = sent_tokenize(gold_text)
        # Compute NLI scores
        result = self.ns.compute_timeline_nli_gold(gold_sentences, llm_sentences)

        return result
    
    def _calculate_fc_timeline_metric(self, llm_text: str, timeline_text: str) -> float:
        llm_sentences = sent_tokenize(llm_text)
        timeline_sentences = sent_tokenize(timeline_text)
        # Compute NLI scores
        result = self.ns.compute_timeline_nli_timeline(timeline_sentences, llm_sentences)

        return result
    
    def calculate_metric(self, llm_text: str, reference_text: str | List[str]) -> float:

        if isinstance(reference_text, str):
            # If reference_text is a single string it is treated as the gold summary
            result = self._calculate_fc_expert_metric(llm_text, reference_text)
            # split into right format
            return result["mean_consistency"], {"scores": result["sentence_level_consistencies"], "sentences": result["sentences"]}
        elif isinstance(reference_text, list):
            # If reference_text is a list, it is treated as the timeline posts
            # convert timeline posts to a single string
            reference_text = " ".join(reference_text)
            return self._calculate_fc_timeline_metric(llm_text, reference_text)
        else:
            raise ValueError("reference_text must be a string or a list of strings")


