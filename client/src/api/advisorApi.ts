import axios from "axios";

const BASE = "http://localhost:5000/advisor";

function authHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("platformAdminToken");
  return { Authorization: `Bearer ${token}` };
}

export type AdvisorChatResponse = {
  message: string;
  answer: string;
  sources: Array<{
    title: string;
    source_type: string;
    publication_date: string;
    source_url: string;
    chunk_id: string;
    score: number;
  }>;
  meta: {
    provider: "openai" | "lmstudio";
    provider_used?: "openai" | "lmstudio";
    requested_provider?: "openai" | "lmstudio";
    model_name?: string;
    fallback_reason?: string | null;
    lmstudio_available?: boolean;
    top_k: number;
    dynamic_top_k: number;
  };
};

export type AdvisorInsightsResponse = {
  cards: Array<{
    type: string;
    text: string;
  }>;
  steps?: string[];
  scope?: string;
  model?: {
    provider: "openai" | "lmstudio";
    provider_used?: "openai" | "lmstudio";
    requested_provider?: "openai" | "lmstudio";
    model_name?: string;
    fallback_reason?: string | null;
    lmstudio_available?: boolean;
  };
};

export async function sendAdvisorMessage(params: {
  question: string;
  provider?: "openai" | "lmstudio";
  document?: File | null;
}) {
  const formData = new FormData();
  formData.append("question", params.question);
  formData.append("provider", params.provider || "openai");
  if (params.document) {
    formData.append("document", params.document);
  }

  const res = await axios.post<AdvisorChatResponse>(`${BASE}/chat`, formData, {
    headers: {
      ...authHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

export async function streamAdvisorMessage(
  params: {
    question: string;
    provider?: "openai" | "lmstudio";
    document?: File | null;
  },
  handlers: {
    onToken?: (token: string) => void;
    onFinal?: (payload: AdvisorChatResponse) => void;
    onError?: (message: string) => void;
  }
) {
  const formData = new FormData();
  formData.append("question", params.question);
  formData.append("provider", params.provider || "openai");
  if (params.document) {
    formData.append("document", params.document);
  }

  const response = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed) as
          | { type: "token"; token: string }
          | { type: "final"; payload: AdvisorChatResponse }
          | { type: "error"; message?: string };

        if (parsed.type === "token") {
          handlers.onToken?.(parsed.token || "");
        } else if (parsed.type === "final") {
          handlers.onFinal?.(parsed.payload);
        } else if (parsed.type === "error") {
          handlers.onError?.(parsed.message || "Advisor stream failed");
        }
      } catch {
        // Ignore malformed stream chunks.
      }
    }
  }
}

export async function fetchAdvisorInsights(provider: "openai" | "lmstudio" = "lmstudio") {
  const res = await axios.get<AdvisorInsightsResponse>(`${BASE}/insights`, {
    headers: authHeaders(),
    params: { provider },
  });
  return res.data;
}