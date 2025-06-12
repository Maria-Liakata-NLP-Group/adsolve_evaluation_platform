import torch
import logging
from transformers import AutoModelForCausalLM, AutoTokenizer, Gemma3ForConditionalGeneration

logger = logging.getLogger(__name__)


class LLMGenerator:
    def __init__(self, model_name: str, cache_dir: str ="/import/nlp-datasets/LLMs/", **kwargs):
        """Initialize LLM client based on provider type"""
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        if "gemma" in model_name.lower():
            print(f"Loading Gemma model: {model_name} with Gemma3ForConditionalGeneration")
            self.model = Gemma3ForConditionalGeneration.from_pretrained(
                model_name, 
                device_map="auto",
                cache_dir=cache_dir,
            ).eval()
        else:
            self.model = AutoModelForCausalLM.from_pretrained(
                print(f"Loading model: {model_name} with AutoModelForCausalLM"),
                model_name,
                torch_dtype=(torch.float16 if self.device == "cuda" else torch.float32),
                device_map="auto" if self.device == "cuda" else None,
                cache_dir=cache_dir,
            ).eval()
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        # self.tokenizer.add_special_tokens({"pad_token": "[PAD]"})

    def generate(self, prompt: str, max_tokens: int = 5000, temperature: float = 0.1):

        hf_inputs = self.tokenizer.apply_chat_template(
                    prompt,
                    return_dict=True,
                    tokenize=True,
                    add_generation_prompt=True,
                    return_tensors="pt"
                ).to(self.model.device)

        terminators = [
            self.tokenizer.eos_token_id,
            self.tokenizer.convert_tokens_to_ids("<|eot_id|>")
        ]

        try:
            with torch.no_grad():
                outputs = self.model.generate(
                    **hf_inputs,
                    max_new_tokens=max_tokens,
                    eos_token_id=terminators,
                    
                    pad_token_id=self.tokenizer.pad_token_id,
                    do_sample=False,
                    temperature=temperature,
                    top_p=0.9,
                )

            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            return response.strip(), "stop"
        except Exception as e:
            logger.error(e)
            return "", "error"


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
