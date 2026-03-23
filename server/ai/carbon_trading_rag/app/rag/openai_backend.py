from __future__ import annotations

from openai import OpenAI

from app.config import Settings


def stream_openai_answer(
    settings: Settings,
    system_prompt: str,
    user_prompt: str,
    on_token=None,
) -> str:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is missing in .env")
    if not settings.openai_model:
        raise ValueError("OPENAI_MODEL is missing in .env")

    client = OpenAI(api_key=settings.openai_api_key)

    stream = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        stream=True,
    )

    collected: list[str] = []
    for chunk in stream:
        if not chunk.choices:
            continue

        delta = chunk.choices[0].delta.content
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