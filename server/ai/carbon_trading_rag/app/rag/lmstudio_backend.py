from __future__ import annotations

from openai import OpenAI

from app.config import Settings


def stream_lmstudio_answer(
    settings: Settings,
    system_prompt: str,
    user_prompt: str,
    on_token=None,
) -> str:
    if not settings.lmstudio_model:
        raise ValueError("LMSTUDIO_MODEL is missing in .env")

    client = OpenAI(
        base_url=settings.lmstudio_base_url,
        api_key="lm-studio",
    )

    stream = client.chat.completions.create(
        model=settings.lmstudio_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        stream=True,
    )

    collected: list[str] = []
    for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if not delta:
            continue
        if on_token is not None:
            on_token(delta)
        else:
            print(delta, end="", flush=True)
        collected.append(delta)

    if on_token is None:
        print()
    return "".join(collected)