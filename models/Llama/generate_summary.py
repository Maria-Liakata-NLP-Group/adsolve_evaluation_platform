import os
import sys
# add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import json
from generations import (LLMGenerator, 
                         build_prompt_specific, 
                         build_prompt_vanila, 
                         build_prompt_timeline_specific, 
                         build_prompt_timeline_vanilla, 
                         strip_tag)
import re
from tqdm import tqdm
import pickle
import pandas as pd
import numpy as np
from typing import List, Callable

from huggingface_hub import login
from datetime import datetime

# Log into huggingface
hf_token = "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"
login(token=hf_token)

# Load model
hf_cache = "/import/nlp-datasets/LLMs/"
model_id = "meta-llama/Meta-Llama-3.1-8B-Instruct"
llm = LLMGenerator(model_name=model_id)

'''
 Dataflow for clpsych2025:

 1. Run mh.prompt_llama for mh timeline summary on each post
 2. concatenate all post-level outputs that are not marked as INSUFFICIENT INFORMATION
 3. Run mh.prompt_llama on the concatenated posts for the final summary

 Definitions:
 post-level: output of first mental health summary 
 timeline-summary: the final summary of all posts
 (Note: this is the other way round from TalkLife)
'''

def create_post_level_summary(data:list, prompt:Callable) -> list:
    post_level_summaries = []
    for post in data:
        output, status = llm.generate(
                prompt(post), max_tokens=300, temperature=0.0
            )
        print(f"Post-status:{status}")
        post_level_summaries.append(output)
    
    return post_level_summaries


def create_timeline_summary(post_level_summaries:list, prompt:Callable) -> str:
    # concatenate all post-level summaries
    concat_post_level_summaries = [strip_tag(summary) for summary in post_level_summaries]
    concat_post_level_summaries = " ".join(concat_post_level_summaries)
    output, status = llm.generate(
        prompt(concat_post_level_summaries),
        max_tokens=250,
        temperature=0.0,
    )
    print(f"Timeline-status:{status}\n\n")
    
    return output


def run_summary_pipeline(
                            timeline_posts: dict, 
                            prompt_type:str = "specific",
                            save_file_name: str = "",
                            ) -> dict:
    
    if prompt_type == "specific":
        post_level_prompt = build_prompt_specific
        timeline_prompt = build_prompt_timeline_specific
    else:
        post_level_prompt = build_prompt_vanila
        timeline_prompt = build_prompt_timeline_vanilla
    
    # check if file already exists and load it if it does
    if save_file_name and os.path.exists(f"{save_file_name}.json"):
        with open(f"{save_file_name}.json", "r") as f:
            summaries = json.load(f)
            return summaries
    
    # initalise dict to hold summaries
    summaries = {}

    for timeline_id, posts in timeline_posts.items():
        now = datetime.now()
        print(f"{now.strftime('%H:%M:%S')}: Processing timeline: {timeline_id} with {len(posts)} posts")
        # create post level summaries
        post_level_summaries = create_post_level_summary(posts, post_level_prompt)

        # create timeline summary
        timeline_summary = create_timeline_summary(post_level_summaries, timeline_prompt)

        # store summaries in dict
        summaries[timeline_id] = timeline_summary

    # if a save_file_name is provided, save the summaries
    if save_file_name:
        with open(f"{save_file_name}.json", "w") as f:
            json.dump(summaries, f, indent=4)
    
    return summaries