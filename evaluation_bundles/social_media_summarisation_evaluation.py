# add metrics folder to paths from which to import classes
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/metrics")

from mhic import MHIC
from intra_nli import IntraNLI
from fc import FactualConsistency
from style_roberta import StyleSimilarity
from bertscore import BERTScore

import numpy as np


class SocialMediaSummarisationEvaluationBundle:
    def __init__(self):
        self.mhic = MHIC()
        self.intra_nli = IntraNLI()
        self.fc = FactualConsistency()
        self.style_similarity = StyleSimilarity()
        self.bert_score = BERTScore()

    def evaluate(self, posts: dict, llm_summaries: dict, gold_summaries: dict) -> dict:
        # extract timeline ids from posts dict
        timeline_ids = list(posts.keys())

        # Dictionary to store results
        results = {
            'mhic': {
                "timeline_level": [],
                "mean": None,
            },
            'intra_nli': {
                "timeline_level": [],
                "mean": None,
            },
            'fc_expert': {
                "timeline_level": [],
                "mean": None,
            },
            'fc_timeline': {
                "timeline_level": [],
                "mean": None,
            },
            'style_similarity': {
                "timeline_level": [],
                "mean": None,
            },
            'bert_score': {
                "timeline_level": [],
                "mean": None,
            },
            'timeline_ids': timeline_ids
        }

        # iterate over each timeline
        for timeline_id in timeline_ids:
            timeline_posts = posts[timeline_id]
            llm_summary = llm_summaries[timeline_id]
            gold_summary = gold_summaries[timeline_id]

            # Evaluate MHIC
            mhic_score = self.mhic.calculate_metric(llm_summary, timeline_posts)
            results['mhic']['timeline_level'].append(mhic_score)

            # Evaluate IntraNLI
            intra_nli_score = self.intra_nli.calculate_metric(llm_summary)
            results['intra_nli']['timeline_level'].append(intra_nli_score)

            # Evaluate FCExpert
            fc_expert_score = self.fc.calculate_metric(llm_summary, gold_summary)
            results['fc_expert']['timeline_level'].append(fc_expert_score)

            # Evaluate FCTimeline 
            fc_timeline_score = self.fc.calculate_metric(llm_summary, timeline_posts)
            results['fc_timeline']['timeline_level'].append(fc_timeline_score)

            # Evaluate Style Similarity
            style_similarity_score = self.style_similarity.calculate_metric(llm_summary, gold_summary)
            results['style_similarity']['timeline_level'].append(style_similarity_score)

            # Evaluate BERT Score
            bert_score = self.bert_score.calculate_metric(llm_summary, gold_summary)
            results['bert_score']['timeline_level'].append(bert_score)


        for metric in ['mhic', 'intra_nli', 'fc_expert', 'fc_timeline', 'style_similarity', 'bert_score']:
            # Calculate mean for each metric
            results[metric]['mean'] = np.mean(results[metric]['timeline_level'])
        return results