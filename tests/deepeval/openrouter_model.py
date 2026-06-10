"""DeepEval LLM-as-judge backed by OpenRouter (OpenAI-compatible API).

Used instead of a local Ollama model so the GEval judge calls
https://openrouter.ai/api/v1 with an OpenRouter API key.

Env vars:
    OPENROUTER_API_KEY  required
    OPENROUTER_MODEL    optional, defaults to "openai/gpt-4o-mini"
"""

import os

from deepeval.models.base_model import DeepEvalBaseLLM
from openai import AsyncOpenAI, OpenAI

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-4o-mini"


class OpenRouterModel(DeepEvalBaseLLM):
    def __init__(self, model_name: str | None = None, api_key: str | None = None):
        self.model_name = model_name or os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL)

        api_key = api_key or os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY no está definido")

        self._client = OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
        self._async_client = AsyncOpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)

    def load_model(self):
        return self._client

    def generate(self, prompt: str, schema=None) -> str:
        response = self._client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    async def a_generate(self, prompt: str, schema=None) -> str:
        response = await self._async_client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content

    def get_model_name(self) -> str:
        return f"OpenRouter:{self.model_name}"
