from metrics.mhic import MHIC
from metrics.intra_nli import IntraNLI
from metrics.fc_expert import FCExpert


class SocialMediaSummarisationEvaluationBundle:
    def __init__(self):
        self.mhic = MHIC()
        self.intra_nli = IntraNLI()
        self.fc_expert = FCExpert()

    def evaluate(self, posts: dict, llm_summaries: dict, gold_summaries: dict) -> dict:
        # extract timeline ids from posts dict
        timeline_ids = list(posts.keys())

        # Dictionary to store results
        results = {
            'mhic': [],
            'intra_nli': [],
            'fc_expert': [],
            'timeline_ids': timeline_ids
        }

        # iterate over each timeline
        for timeline_id in timeline_ids:
            timeline_posts = posts[timeline_id]
            llm_summary = llm_summaries[timeline_id]
            gold_summary = gold_summaries[timeline_id]

            # Evaluate MHIC
            mhic_score = self.mhic.calculate_metric(llm_summary, timeline_posts)
            results['mhic'].append(mhic_score)

            # Evaluate IntraNLI
            intra_nli_score = self.intra_nli.calculate_metric(llm_summary)
            results['intra_nli'].append(intra_nli_score)

            # Evaluate FCExpert
            fc_expert_score = self.fc_expert.calculate_metric(llm_summary, gold_summary)
            results['fc_expert'].append(fc_expert_score)

        return results