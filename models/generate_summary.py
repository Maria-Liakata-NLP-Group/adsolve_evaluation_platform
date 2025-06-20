import argparse
import os
import sys
# add current directory to sys.path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(ROOT_DIR)
import json
from generations_pipeline import (LLMGenerator, 
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

def build_model(model_name: str, hf_cache: str = "/import/nlp-datasets/LLMs/") -> LLMGenerator:
    """
    Build and return an LLMGenerator instance with the specified model name.
    """
    # Log into huggingface
    with open(os.path.join(ROOT_DIR, "hf_token.txt"), "r") as f:
        hf_token = f.read().strip()
    login(token=hf_token)
    if model_name == "llama":
        model_id = "meta-llama/Meta-Llama-3.1-8B-Instruct" 
    elif model_name == "gemma":
        model_id = "google/gemma-3-4b-it"
    elif model_name == "medgemma":
        model_id = "google/medgemma-4b-it"
    elif model_name == "qwen":
        model_id = "Qwen/Qwen3-8B"
    elif model_name == "tulu":
        # this is a fine-tuned version of Phi, it will be handled differently in LLM Generator
        model_id = "tulu"   
    else:
        raise ValueError(f"Model {model_name} is not supported. Please choose from 'llama', 'gemma', 'medgemma', or 'qwen'.")
    return LLMGenerator(model_name=model_id, cache_dir=hf_cache)

def create_post_level_summary(data:list, prompt:Callable, llm:LLMGenerator) -> list:
    post_level_summaries = []
    for post in data:
        output, status = llm.generate(
                prompt(post), 
                max_tokens=300, 
                temperature=0.0
            )
        print(f"Post-status:{status}")
        print(f"Post-output:\n{output}\n\n")
        post_level_summaries.append(strip_tag(output))
    
    # save post-level summaries to a file
    with open("post_level_summaries.json", "w") as f:
        json.dump(post_level_summaries, f, indent=4)
    
    return post_level_summaries


def create_timeline_summary(post_level_summaries:list, prompt:Callable, llm:LLMGenerator) -> str:
    # concatenate all post-level summaries
    concat_post_level_summaries = [summary for summary in post_level_summaries]
    concat_post_level_summaries = " ".join(concat_post_level_summaries)
    output, status = llm.generate(
        prompt(concat_post_level_summaries),
        max_tokens=250,
        temperature=0.0,
    )
    print(f"Timeline-status:{status}\n\n")
    
    return strip_tag(output)


def run_summary_pipeline(
                            timeline_posts: dict,
                            model_name: str, 
                            prompt_type:str = "specific",
                            save_file_name: str = "",
                            ) -> dict:
    
    llm = build_model(model_name)
    
    if prompt_type == "specific":
        post_level_prompt = build_prompt_specific
        timeline_prompt = build_prompt_timeline_specific
    else:
        post_level_prompt = build_prompt_vanila
        timeline_prompt = build_prompt_timeline_vanilla
    
    # check if file already exists and load it if it does
    if save_file_name and os.path.exists(f"{save_file_name}.json"):
        print(f"Loading existing summaries from {save_file_name}.json")
        with open(f"{save_file_name}.json", "r") as f:
            summaries = json.load(f)
            return summaries
    
    # initalise dict to hold summaries
    summaries = {}

    for timeline_id, posts in timeline_posts.items():
        now = datetime.now()
        print(f"{now.strftime('%H:%M:%S')}: Processing timeline: {timeline_id} with {len(posts)} posts")
        # create post level summaries
        post_level_summaries = create_post_level_summary(posts, post_level_prompt, llm)

        # create timeline summary
        timeline_summary = create_timeline_summary(post_level_summaries, timeline_prompt, llm)

        # store summaries in dict
        summaries[timeline_id] = timeline_summary

    # if a save_file_name is provided, save the summaries
    if save_file_name:
        with open(f"{save_file_name}.json", "w") as f:
            json.dump(summaries, f, indent=4)
    
    return summaries

if __name__ == "__main__":
    # initiate parser
    parser = argparse.ArgumentParser(description="Generate summaries with LLMs.")
    parser.add_argument(
        "--input_data", type=str, required=True,
        help="Path to the input data file containing messages. Expecting JSON format."
    )
    parser.add_argument(
        "--model_name", type=str, default="gemma",
        help="Name of the model to use for generation. Options: 'llama', 'gemma', 'medgemma', 'qwen', 'tulu'. Default is 'gemma'."
    )
    parser.add_argument(
        "--single_post", type=int, required=False,
        help="If set, will generate summary for post specificed by this index."
    )
    # get input data from flag
    args = parser.parse_args()
    input_data = args.input_data
    # Load input data
    with open(input_data, 'r') as file:
        data = json.load(file)
    
    # Create list of post contents
    
    posts = [post['post'] for post in data['posts']]

    # get timelineID
    timeline_id = data["timeline_id"]

    # Build model
    model_name = args.model_name
    llm = build_model(model_name)

    if args.single_post is not None:
        # If single_post is specified, generate summary for that post only
        post_index = args.single_post
        if post_index < 0 or post_index >= len(posts):
            raise ValueError(f"Invalid post index: {post_index}. Must be between 0 and {len(posts)-1}.")
        posts = [posts[post_index]]
        summary = create_post_level_summary(posts, build_prompt_specific, llm)[0]
        print(f"Generated Summary for post {post_index}:\n{summary}")
    else:
        # Run whole summary pipeline for all posts
        save_file_name = os.path.join(ROOT_DIR,f"{timeline_id}_summary_{model_name}")

        # Generate summary
        print(f"Generating summary for:\n********\n{posts}\n********\n")
        summary = run_summary_pipeline({timeline_id: posts}, llm, save_file_name=save_file_name)
        print("Generated Summary:")
        print(summary)