import argparse
import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from metrics.intra_nli import IntraNLI
from metrics.readability_metric import ReadabilityMetric


class CourtCaseSummarisationEvaluationBundle:
    def __init__(self):
        self.readability_metric = ReadabilityMetric("flesch_kincaid")
        self.intra_nli = IntraNLI()

    def evaluate(self, llm_summaries: dict, gold_summaries: dict) -> dict:
        # Dictionary to store results
        results = {
            'readability': {
                "document_level": [],
                "mean": None,
            },
            'intra_nli': {
                "document_level": [],
                "mean": None,
            },
            'document_ids': list(llm_summaries.keys())
        }

        # iterate over each document
        for document_id in results['document_ids']:
            llm_summary = llm_summaries[document_id]
            gold_summary = gold_summaries[document_id]

            # Calculate readability score
            readability_score = self.readability_metric.calculate_metric(llm_summary)
            results['readability']['document_level'].append(readability_score)

            # Calculate intra-NLI score
            intra_nli_score = self.intra_nli.calculate_metric(llm_summary)
            results['intra_nli']['document_level'].append(intra_nli_score)

        # Calculate mean scores
        results['readability']['mean'] = sum(results['readability']['document_level']) / len(results['readability']['document_level'])
        results['intra_nli']['mean'] = sum(results['intra_nli']['document_level']) / len(results['intra_nli']['document_level'])

        return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate court case summarisation.")
    parser.add_argument('--llm_summaries', type=str, required=True, help=' Path to the LLM summaries JSON file.')
    parser.add_argument('--gold_summaries', type=str, required=True, help='Path to the gold summaries JSON file.')
    parser.add_argument('--output_file', type=str, default='court_case_summarisation_evaluation_results.json', help='Path to save the evaluation results JSON file.')
    args = parser.parse_args()

    # Load LLM summaries
    print(f"Loading LLM summaries from {args.llm_summaries}")
    with open(args.llm_summaries, 'r') as f:
        llm_summaries = json.load(f)    
    # Load gold summaries
    print(f"Loading gold summaries from {args.gold_summaries}")
    with open(args.gold_summaries, 'r') as f:
        gold_summaries = json.load(f)   
    # Create evaluation bundle
    print("Creating evaluation bundle for court case summarisation.")
    evaluation_bundle = CourtCaseSummarisationEvaluationBundle()
    # Evaluate
    print("Evaluating LLM.")
    results = evaluation_bundle.evaluate(llm_summaries, gold_summaries)
    
    # Save results
    print(f"Saving evaluation results to {args.output_file}")
    output_file = args.output_file
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=4)