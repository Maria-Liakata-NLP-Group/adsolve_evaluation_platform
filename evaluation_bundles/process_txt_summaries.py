import os
import json

TXT_SUMMARY_PATH = "/import/nlp/ia180/SummarisationWorkshopJuly3/my prompt summaries/summaries_legal"
GOLD_SUMMARIES_PATH = "/import/nlp-datasets/court_case_summarisation/datasets/UK-Abs/test-data/summary/full"

summaries = {}
for filename in os.listdir(TXT_SUMMARY_PATH):
    if filename.endswith(".txt"):
        with open(os.path.join(TXT_SUMMARY_PATH, filename), 'r', encoding='utf-8') as file:
            content = file.read().strip()
        if content:
            # open gold summary
            gold_summary_path = os.path.join(GOLD_SUMMARIES_PATH, filename)
            if os.path.exists(gold_summary_path):
                with open(gold_summary_path, 'r', encoding='utf-8') as gold_file:
                    gold_content = gold_file.read().strip()
            else:
                print(f"Warning: Gold summary for {filename} not found.")
            # Extract the ID from the filename
            id_ = filename.split('.')[0]
            summaries[id_] = {
                "summary": content,
                "reference": gold_content,
            }

# Save the summaries to a JSON file
OUTPUT_PATH = "/import/nlp-datasets/court_case_summarisation/generated_summaries"
with open(os.path.join(OUTPUT_PATH, "iqra_jiayu_model_summaries.json"), 'w', encoding='utf-8') as output_file:
    json.dump(summaries, output_file, ensure_ascii=False, indent=4)

