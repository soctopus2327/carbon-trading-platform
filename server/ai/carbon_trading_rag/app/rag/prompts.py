from __future__ import annotations

from app.rag.retriever import RetrievedChunk


SYSTEM_PROMPT = """You are a carbon advisory RAG assistant.

Your job is to answer only from retrieved evidence and to stay within the provided context.
The user may ask about:
1. reducing emissions directly,
2. reducing the need to buy carbon credits through mitigation, or
3. improving carbon-credit and offset strategy.

Hard guardrails:
- Use retrieved evidence for factual claims.
- If the evidence is incomplete, say so clearly.
- Do not present legal, financial, or compliance advice as definitive professional advice.
- Distinguish clearly between emissions reduction, offsetting, carbon credits, and compliance obligations.
- Do not invent regulations, registry rules, or numeric claims.
- Do not fabricate source names or URLs.
- You may personalize recommendations using the provided application company context.
- Treat application company context as operational profile input, not external evidence.
- Treat market_news_digest in application company context as recent signal for prioritization, not as definitive factual evidence.
- Apply personalization only when the user intent requires company-specific advice.
- If the user asks to explain or summarize an attached document, prioritize document explanation and avoid company-specific recommendations unless explicitly requested.

Answer format:
1. Start with a short section called "Brief answer".
2. Then a section called "Evidence-backed details".
3. Keep the answer practical and concrete.
4. Do not add a citations section yourself. The application will print the sources separately.
"""


def format_context(retrieved_chunks: list[RetrievedChunk]) -> str:
    blocks: list[str] = []
    for index, chunk in enumerate(retrieved_chunks, start=1):
        metadata = chunk.metadata
        block = f"""[S{index}]
title: {metadata.get("title", "Untitled")}
source_type: {metadata.get("source_type", "unknown")}
publication_date: {metadata.get("publication_date", "")}
source_url: {metadata.get("source_url", "")}
content:
{metadata.get("chunk_text", "").strip()}
"""
        blocks.append(block.strip())
    return "\n\n".join(blocks)


def format_company_context(company_context: dict | None) -> str:
    if not company_context:
        return "No company context provided."

    lines: list[str] = []
    for key, value in company_context.items():
        pretty_key = str(key).replace("_", " ").strip().title()
        if isinstance(value, float):
            formatted_value = f"{value:.2f}"
        else:
            formatted_value = str(value)
        lines.append(f"- {pretty_key}: {formatted_value}")

    return "\n".join(lines)


def infer_prompt_policy(question: str, retrieved_chunks: list[RetrievedChunk]) -> str:
    lowered = question.lower().strip()
    has_temp_pdf = any((chunk.metadata or {}).get("source_type") == "temporary_pdf" for chunk in retrieved_chunks)

    personalization_signals = [
        "my company",
        "our company",
        "our portfolio",
        "my portfolio",
        "for us",
        "for my",
        "action plan",
        "recommend for",
        "current holdings",
        "compliance risk",
    ]
    document_signals = [
        "explain this pdf",
        "summarize this pdf",
        "explain the document",
        "summarize the document",
        "what does this pdf",
        "from this pdf",
        "in this pdf",
    ]

    asks_personalized = any(signal in lowered for signal in personalization_signals)
    asks_document_focus = any(signal in lowered for signal in document_signals)

    if has_temp_pdf and (asks_document_focus or not asks_personalized):
        return (
            "Mode: document_explainer. Focus on explaining the attached/retrieved document content. "
            "Do not inject company-specific advice unless the user explicitly asks to map findings to their company."
        )

    if asks_personalized:
        return (
            "Mode: personalized_advisor. Use application company context to tailor recommendations, "
            "while grounding factual claims in retrieved evidence."
        )

    return (
        "Mode: general_advisory. Provide a general evidence-based answer first. "
        "Use company context only lightly unless the user asks for personalized actions."
    )


def build_user_prompt(
    question: str,
    retrieved_chunks: list[RetrievedChunk],
    company_context: dict | None = None,
) -> str:
    context_text = format_context(retrieved_chunks)
    company_context_text = format_company_context(company_context)
    policy_text = infer_prompt_policy(question, retrieved_chunks)
    return f"""User question:
{question}

Response policy for this query:
{policy_text}

Application company context (for personalization):
{company_context_text}

Retrieved context:
{context_text}

Write the answer from retrieved context, while tailoring recommendations using application company context.
Use market_news_digest as a recent directional signal only.
If there are tradeoffs or ambiguity, mention them.
"""