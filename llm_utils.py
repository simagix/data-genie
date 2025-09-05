"""
llm_utils.py
@ken.chen
"""
import os, time
import logging
import requests
from openai.lib.azure import AzureOpenAI

LLM_BACKEND = None  # 'ollama', 'openai', 'azure', etc.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def llm_generate(prompt: str, llm_backend: str = None) -> str:
    """
    Unified LLM call. Selects backend based on LLM_BACKEND.
    """
    if llm_backend == 'ollama':
        start = time.time()
        url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
        model = os.getenv("OLLAMA_MODEL", "mistral:7b-instruct")
        r = requests.post(url, json={"model": model, "prompt": prompt, "stream": False}, timeout=120)
        r.raise_for_status()
        elapsed = time.time() - start
        logger.info(f"LLM call, model {model} took {elapsed:.2f} seconds")
        return r.json().get("response", "")
    elif llm_backend == 'openai':
        raise NotImplementedError("OpenAI backend not implemented yet.")
    elif llm_backend == 'azure':
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ]
        model = os.getenv("AZURE_OPENAI_MODEL")
        az_client = AzureOpenAI(
            api_version=os.getenv("AZURE_OPENAI_VERSION"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        )
        response = az_client.chat.completions.create(
                messages=messages,
                max_tokens=2048,
                temperature=0.0,
                top_p=1.0,
                model=model
            )
        return response.choices[0].message.content
    else:
        raise ValueError(f"Unknown LLM backend: {llm_backend}")
