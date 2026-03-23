from __future__ import annotations

import json


def build_audit_question(company_context: dict | None, report_period: str | None) -> str:
    return "\n".join(
        [
            "Generate an emissions audit report from the attached PDF and context.",
            f"Audit period: {report_period}." if report_period else "Audit period: not specified.",
            "Return STRICT JSON only with this exact schema:",
            "{",
            '  "summary": "string",',
            '  "riskLevel": "LOW|MEDIUM|HIGH",',
            '  "findings": [{ "title": "string", "severity": "LOW|MEDIUM|HIGH", "evidence": "string", "impact": "string" }],',
            '  "recommendations": [{ "action": "string", "priority": "LOW|MEDIUM|HIGH", "rationale": "string" }],',
            '  "limitations": ["string"]',
            "}",
            "If evidence is weak, keep fields but state uncertainty in summary/limitations.",
            "Do not include markdown, code fences, or extra keys.",
            "Company context:",
            json.dumps(company_context or {}, ensure_ascii=False, indent=2),
        ]
    )


def build_audit_user_prompt(
    *,
    question: str,
    company_context: dict | None,
    context_blocks: list[dict],
) -> str:
    context_lines: list[str] = []
    for idx, block in enumerate(context_blocks, start=1):
        context_lines.append(
            "\n".join(
                [
                    f"[C{idx}]",
                    f"chunk_id: {block.get('chunk_id', f'chunk-{idx}')}",
                    f"chunk_number: {block.get('chunk_number', idx)}",
                    f"score: {round(float(block.get('score', 0.0)), 4)}",
                    "content:",
                    str(block.get("text") or "").strip(),
                ]
            )
        )

    compact_context = "\n\n".join(context_lines) if context_lines else "No extracted context available."

    return "\n".join(
        [
            "Audit request:",
            question,
            "",
            "Company context:",
            json.dumps(company_context or {}, ensure_ascii=False, indent=2),
            "",
            "Extracted PDF evidence:",
            compact_context,
            "",
            "Instructions:",
            "- Base conclusions only on extracted PDF evidence and company context.",
            "- If evidence is incomplete, state uncertainty in limitations.",
            "- Keep findings and recommendations specific and operational.",
            "- Return only JSON matching the required schema.",
        ]
    )
