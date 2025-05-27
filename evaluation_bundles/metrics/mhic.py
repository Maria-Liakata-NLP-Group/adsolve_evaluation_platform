import bert_score
from nltk import sent_tokenize
import numpy as np



class MHIC:
    def __init__(self):
        self.bs_scorer = bert_score.BERTScorer(
            model_type="microsoft/deberta-xlarge-mnli",
            device="cuda",
            lang="en"
        ) 

    def calculate_metric(self, candidate: str, references: list[str]) -> float:
        results = []
        candidate_sentences = sent_tokenize(candidate)
        
        for reference in references: 
            _, R, _ = self.bs_scorer.score(
                cands=candidate_sentences,
                refs=[reference]*len(candidate_sentences)
            )

            results.append(R.max().item())
        
        return np.mean(results)