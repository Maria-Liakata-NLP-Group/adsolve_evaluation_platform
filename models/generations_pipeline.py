import torch
import logging
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from peft import PeftModel
import json
import os

logger = logging.getLogger(__name__)


class LLMGenerator:
    def __init__(self, model_name: str, cache_dir: str ="/import/nlp-datasets/LLMs/", **kwargs):
        """Initialize LLM client based on provider type"""
        if model_name == "tulu":
            ADAPTER_PATH = "/import/nlp/jsong/tulu_k1_pkt/"
            # Load adatpor config
            with open(os.path.join(ADAPTER_PATH, "adapter_config.json"), "r") as f:
                adapter_config = json.load(f)
            
            BASE_MODEL_ID = adapter_config["base_model_name_or_path"].split("/")[-1]

            base_model = AutoModelForCausalLM.from_pretrained(
                            BASE_MODEL_ID,
                            torch_dtype="auto",    # or torch.float16 if you know you trained in fp16
                            device_map="auto",     # let HF place layers on GPU(s)
                        )
            self.model_name = PeftModel.from_pretrained(
                    base_model,
                    ADAPTER_PATH,
                    is_trainable=False
                )
        else:
            self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using model: {self.model_name} on device: {self.device}")
        self.pipe = pipeline(
            "text-generation",
            model=self.model_name,
            # cache_dir=cache_dir,
            device=self.device,
            torch_dtype=torch.bfloat16
        )
        self.terminators = [
            self.pipe.tokenizer.eos_token_id,
            self.pipe.tokenizer.convert_tokens_to_ids("<|eot_id|>")
        ]

    def generate(self, prompt: str, max_tokens: int = 5000, temperature: float = 0.0):
        with torch.no_grad():
            outputs = self.pipe(
                        prompt,
                        max_new_tokens=max_tokens,
                        eos_token_id=self.terminators,
                        do_sample=False if temperature == 0 else True,
                        temperature=temperature,
                        top_p=0.9,
                    )
            return outputs[0]["generated_text"][-1]["content"], "stop"
        # try:


        # except Exception as e:
        #     print(e)
        #     return "", "error"

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




def build_prompt_generic(post_text):
    message = [
        {
            "role": "system",
            "content": '''You are a helpful assistant. Your task is to generate a mental state summary based on the given post.

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
The summary must be in a clear, concise paragraph that is strictly based on the input post content. 
            '''
        },
        {
            "role": "user",
            "content": post_text
        }
    ]
    return message


def build_prompt_vanila(post_text):
    message = [
        {
            "role": "system",
            "content": '''You are a helpful assistant.Your task is to generate a summary based on the given post.
The summary must be in a clear, concise paragraph that is strictly based on the input post content. 
Now, here is the input.'''
        },
        {
            "role": "user",
            "content": post_text
        }
    ]
    return message


def build_prompt_timeline_specific(summaries_concat):
    message = [
        {
            "role": "system",
            "content": '''You are a helpful assistant. Your task is to combine a sequence of self-state summaries.

# Definitions
Self-states constitute identifiable units characterized by specific combinations of Affect, Behavior, Cognition, and Desire/Need that tend to be coactivated in a meaningful manner for limited periods of time. 
An adaptive self-state pertains to aspects of Affect, Behaviour, and Cognition towards the self or others, which is conducive to the fulfillment of basic desires/needs, such as relatedness, autonomy and competence. 
A maladaptive self-state pertains to aspects of Affect, Behaviour, and Cognition towards the self or others, that hinder the fulfillment of basic desires/needs.

# Instruction
You will be given summaries describing self-states, ordered from oldest to most recent. 
From these summaries, synthesize a meta-summary focusing on the interplay between adaptive and maladaptive self-states along the timeline. 
Emphasize temporal dynamics focusing on concepts such as flexibility, rigidity, improvement, and deterioration. 
If applicable, describe the extent to which the dominance of the self-states changes over time and how changes in aspects (Affect, Behavior, Cognition, and Desire) contribute to these transitions.

The summary must be in a clear, concise paragraph that is strictly based on the input post content.'''
        },
        {
            "role": "user",
            "content": summaries_concat
        }
    ]
    return message


def build_prompt_timeline_vanilla(summaries_concat):
    message = [
        {
            "role": "system",
            "content": '''You are a helpful assistant. Your task is to combine a sequence of summaries, ordered from oldest to most recent. 
The summary must be in a clear, concise paragraph that is strictly based on the input content. 
Now, here is the input.'''
        },
        {
            "role": "user",
            "content": summaries_concat
        }
    ]
    return message


def strip_tag(text):
    """Postprocessing helper"""

    def extract_response(text):
        '''
            Response from the LLM is prefaced by assisstant\n\n.
            Attempt to find this and return the text after it.
            If not found, return the original text.
        '''
        start_index = 0
        if "assistant\n\n" in text:
            start_index = text.index("assistant\n\n") + len("assistant\n\n")
        elif "\nmodel\n" in text:
            start_index = text.index("\nmodel\n") + len("\nmodel\n")
        
        return text[start_index:]

    def extract_between_tags(
        text, start_tag="[START OUTPUT]\n", end_tag="\n[END OUTPUT]"
    ):
        """
        Extract content between two predefined tags.
        If tags are not found, return the original string.

        Args:
            text (str): The text to search in
            start_tag (str): The starting tag
            end_tag (str): The ending tag

        Returns:
            str: The content between tags, or the original text if tags not found
        """
        try:
            start_index = text.rindex(start_tag) + len(start_tag)
            end_index = text.rindex(end_tag, start_index)
            return text[start_index:end_index]
        except ValueError:
            return text

    curr_text = extract_response(text)
    curr_text = extract_between_tags(curr_text).strip()
    if curr_text.startswith("YES\n"):
        curr_text = curr_text.replace("YES\n", "")
        return curr_text
    elif curr_text.startswith("NO\n") or curr_text.endswith("INSUFFICIENT INFORMATION"):
        return ""
    return curr_text