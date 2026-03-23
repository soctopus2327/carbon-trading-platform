from __future__ import annotations

from app.rag.filters import (
    QueryProfile,
    build_query_profile,
    decide_dynamic_top_k,
    metadata_boost,
)


# ---------------------------
# decide_dynamic_top_k tests
# ---------------------------

def test_dynamic_top_k_minimum_for_simple_query():
    q = "what is carbon credit"
    k = decide_dynamic_top_k(q, minimum=3, maximum=10)
    assert k == 3


def test_dynamic_top_k_increases_with_length():
    q = "explain the detailed process of carbon offset verification and registry validation"
    k = decide_dynamic_top_k(q, minimum=3, maximum=10)
    assert k > 3


def test_dynamic_top_k_caps_at_maximum():
    q = "compare strategy framework policy evidence step-by-step recommendation and vs difference" * 5
    k = decide_dynamic_top_k(q, minimum=3, maximum=6)
    assert k == 6


def test_dynamic_top_k_detects_complex_query_patterns():
    q = "compare carbon offsets vs reduction strategies and which is better?"
    k = decide_dynamic_top_k(q, minimum=3, maximum=10)
    assert k > 3


# ---------------------------
# build_query_profile tests
# ---------------------------

def test_build_query_profile_credit_strategy_intent():
    q = "how do carbon credits work in verra registry"
    profile = build_query_profile(q, 3, 10)

    assert "credit_strategy" in profile.intents
    assert "government" in profile.preferred_source_types
    assert profile.query == q


def test_build_query_profile_accounting_intent():
    q = "how to calculate scope 2 emissions using emission factor"
    profile = build_query_profile(q, 3, 10)

    assert "accounting" in profile.intents
    assert "dataset" in profile.preferred_source_types


def test_build_query_profile_mitigation_intent():
    q = "how to reduce emissions in supply chain through electrification"
    profile = build_query_profile(q, 3, 10)

    assert "mitigation" in profile.intents
    assert "journal" in profile.preferred_source_types


def test_build_query_profile_defaults_to_general_advisory():
    q = "tell me about climate"
    profile = build_query_profile(q, 3, 10)

    assert profile.intents == ["general_advisory"]
    assert "government" in profile.preferred_source_types


def test_build_query_profile_latest_sensitive_flag():
    q = "latest carbon market trends 2026"
    profile = build_query_profile(q, 3, 10)

    assert profile.latest_sensitive is True


def test_build_query_profile_deduplicates_source_types():
    q = "carbon credits and offset registry"
    profile = build_query_profile(q, 3, 10)

    # ensure no duplicates
    assert len(profile.preferred_source_types) == len(set(profile.preferred_source_types))


def test_build_query_profile_sets_pinecone_filter():
    q = "carbon credits"
    profile = build_query_profile(q, 3, 10)

    assert profile.pinecone_filter is not None
    assert "reliability_rating" in profile.pinecone_filter


# ---------------------------
# metadata_boost tests
# ---------------------------

def test_metadata_boost_source_type_match():
    profile = build_query_profile("carbon credits", 3, 10)

    metadata = {"source_type": profile.preferred_source_types[0]}
    boost = metadata_boost(metadata, profile)

    assert boost >= 0.05


def test_metadata_boost_rating_A_gives_highest_boost():
    profile = build_query_profile("carbon credits", 3, 10)

    metadata = {"reliability_rating": "A"}
    boost = metadata_boost(metadata, profile)

    assert boost >= 0.03


def test_metadata_boost_rating_B_lower_than_A():
    profile = build_query_profile("carbon credits", 3, 10)

    boost_a = metadata_boost({"reliability_rating": "A"}, profile)
    boost_b = metadata_boost({"reliability_rating": "B"}, profile)

    assert boost_a > boost_b


def test_metadata_boost_latest_sensitive_with_recent_year():
    profile = build_query_profile("latest carbon market", 3, 10)

    metadata = {"publication_date": "2026-01-01"}
    boost = metadata_boost(metadata, profile)

    assert boost >= 0.03


def test_metadata_boost_latest_sensitive_with_older_years():
    profile = build_query_profile("latest carbon market", 3, 10)

    boost_2025 = metadata_boost({"publication_date": "2025-01-01"}, profile)
    boost_2024 = metadata_boost({"publication_date": "2024-01-01"}, profile)

    assert boost_2025 > boost_2024


def test_metadata_boost_no_effect_when_not_latest_sensitive():
    profile = build_query_profile("carbon markets overview", 3, 10)

    metadata = {"publication_date": "2026-01-01"}
    boost = metadata_boost(metadata, profile)

    assert boost == 0.0