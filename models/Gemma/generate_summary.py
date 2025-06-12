from transformers import AutoTokenizer, AutoModelForCausalLM
from PIL import Image
import requests
import torch
import json 


def build_prompt_specific(post_text):
    message = [
        {
            "role": "system",
            "content": '''You are a helpful assistant. Your task is to analyze a post on self-states.

# Definitions
Self-states constitute identifiable units characterized by specific combinations of Affect, Behavior, Cognition, and Desire/Need that tend to be coactivated in a meaningful manner for limited periods of time. 
An adaptive self-state pertains to aspects of Affect, Behaviour, and Cognition towards the self or others, which is conducive to the fulfillment of basic desires/needs, such as relatedness, autonomy and competence. 
A maladaptive self-state pertains to aspects of Affect, Behaviour, and Cognition towards the self or others, that hinder the fulfillment of basic desires/needs.


# Task Description
Your response will have two parts.

First, determine whether the post contains enough relevant information about the mental state of the individual. 
Output YES if it contains relevant information, and NO otherwise.

Then, write a summary in prose if there is relevant information, or return INSUFFICIENT INFORMATION.


## Example Output Format
If there is enough information about the mental state:
```
[START OUTPUT]
YES
<The summary goes here.>
[END OUTPUT]
```

Otherwise:
```
[START OUTPUT]
NO
INSUFFICIENT INFORMATION
[END OUTPUT]
```

## Summary Requirements
If generating a summary, it should cover the following:
- Identify whether there are adaptive and maladaptive self-states present. 
- If they are both present, begin by determining which self-state is more dominant and describe it first.
  - If the self-state is maladaptive, explain how negative emotions, behaviors, or thoughts hinder psychological needs.
  - If the self-state is adaptive, explain how positive aspects support psychological needs.
  - If both adaptive and maladaptive states are present, describe each in turn. 
- For each self-state, highlight the central organizing aspect—Affect, Behavior, Cognition, or Desire/Need—that drives the state. 
- Describe how this central aspect influences the other aspects, focusing on the potential causal relationships between them. 

The summary must be in a clear, concise paragraph that is strictly based on the input post content. 
''',
        },
        {
            "role": "user",
            "content": post_text
        }
    ]
    return message

model_id = "google/gemma-3-4b-it"

model = AutoModelForCausalLM.from_pretrained(
    model_id, 
    device_map="auto",
    cache_dir="/import/nlp-datasets/LLMs/",
).eval()

tokenizer = AutoTokenizer.from_pretrained(model_id)

# open files to process for testing
with open("/import/nlp/datasets/clpsych2025/train/0cac13e357.json", "r") as f:
    data = json.load(f)

posts = [post['post'] for post in data['posts']]

inputs = tokenizer.apply_chat_template(
    build_prompt_specific(posts[4]), 
    add_generation_prompt=True, 
    # tokenize=True,
    # return_dict=True, 
    return_tensors="pt"
).to(model.device)

print(inputs)

# input_len = inputs["input_ids"].shape[-1]

terminators = [
    tokenizer.eos_token_id,
    tokenizer.convert_tokens_to_ids("<|eot_id|>")
]

with torch.no_grad():
    generation = model.generate(inputs, 
                                max_new_tokens=300, 
                                do_sample=False,
                                temperature=0.0,                     
                                eos_token_id=terminators,
                                pad_token_id=tokenizer.pad_token_id)
    generation = generation[0]

decoded = tokenizer.decode(generation, skip_special_tokens=True)
start_index = decoded.index("\nmodel\n") + len("\nmodel\n")
print(decoded[start_index:])