// src/api/advisorApi.ts
import axios from "axios";

const BASE_URL = "http://localhost:5000/advisor"; // ← adjust if your backend runs on different port/host

// Helper to get auth token
function getAuthHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("platformAdminToken");
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
}

// ────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────

export type AdvisorChatResponse = {
  success?: boolean;
  message?: string;
  answer: string;
  sources: Array<{
    title?: string;
    source_type?: string;
    publication_date?: string;
    source_url?: string;
    chunk_id?: string;
    score?: number;
  }>;
  conversationId?: string;     // ← returned when new conversation is created
  title?: string;              // ← the title of the conversation
  meta: {
    provider: "openai" | "lmstudio";
    provider_used?: "openai" | "lmstudio";
    requested_provider?: "openai" | "lmstudio";
    model_name?: string;
    fallback_reason?: string | null;
    lmstudio_available?: boolean;
    top_k?: number;
    dynamic_top_k?: number;
    controller_timings_ms?: Record<string, number>;
    [key: string]: any;
  };
};

export type AdvisorInsightsResponse = {
  success?: boolean;
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

export type ConversationListItem = {
  _id: string;
  title: string;
  lastActive: string;
  createdAt?: string;
  messageCount: number;
};

export type ConversationDetail = {
  _id: string;
  title: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    sources?: string[];
    metadata?: Record<string, any>;
  }>;
  lastActive: string;
  createdAt: string;
  messageCount: number;
};

// ────────────────────────────────────────────────
//  API Functions
// ────────────────────────────────────────────────

/**
 * Send a normal (non-streaming) chat message
 * @deprecated prefer streamAdvisorMessage for better UX
 */
export async function sendAdvisorMessage(params: {
  question: string;
  provider?: "openai" | "lmstudio";
  document?: File | null;
  conversationId?: string;
}): Promise<AdvisorChatResponse> {
  const formData = new FormData();
  formData.append("question", params.question);
  formData.append("provider", params.provider || "lmstudio");

  // ─── FIXED: send even when conversationId is empty string ───
  if (params.conversationId !== undefined) {
    formData.append("conversationId", params.conversationId);
  }

  if (params.document) {
    formData.append("document", params.document);
  }

  const response = await axios.post<AdvisorChatResponse>(`${BASE_URL}/chat`, formData, {
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

/**
 * Stream advisor response (recommended)
 */
export async function streamAdvisorMessage(
  params: {
    question: string;
    provider?: "openai" | "lmstudio";
    document?: File | null;
    conversationId?: string;
  },
  handlers: {
    onToken?: (token: string) => void;
    onFinal?: (payload: AdvisorChatResponse) => void;
    onError?: (message: string) => void;
  }
): Promise<void> {
  const formData = new FormData();
  formData.append("question", params.question);
  formData.append("provider", params.provider || "lmstudio");

  // ─── FIXED: send even when conversationId is empty string ───
  if (params.conversationId !== undefined) {
    formData.append("conversationId", params.conversationId);
  }

  if (params.document) {
    formData.append("document", params.document);
  }

  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "");
    handlers.onError?.(`Stream failed (${response.status}): ${errorText || "Unknown error"}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || ""; // keep incomplete line for next read

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
            handlers.onError?.(parsed.message || "Unknown streaming error");
          }
        } catch (parseErr) {
          console.warn("Failed to parse stream chunk:", parseErr, trimmed);
        }
      }
    }
  } catch (err) {
    console.error("Streaming error:", err);
    handlers.onError?.("Connection lost during streaming");
  } finally {
    reader.releaseLock();
  }
}

/**
 * Fetch advisor insights / cards / next steps
 */
export async function fetchAdvisorInsights(
  provider: "openai" | "lmstudio" = "lmstudio"
): Promise<AdvisorInsightsResponse> {
  const response = await axios.get<AdvisorInsightsResponse>(`${BASE_URL}/insights`, {
    headers: getAuthHeaders(),
    params: { provider },
  });
  return response.data;
}

/**
 * Get list of previous conversations
 */
export async function fetchConversations(): Promise<ConversationListItem[]> {
  const response = await axios.get<{ success: boolean; conversations: ConversationListItem[] }>(
    `${BASE_URL}/conversations`,
    { headers: getAuthHeaders() }
  );

  if (!response.data.success) {
    throw new Error("Failed to fetch conversations");
  }

  return response.data.conversations;
}

/**
 * Load full content of one specific conversation
 */
export async function fetchConversationDetail(id: string): Promise<ConversationDetail> {
  const response = await axios.get<{ success: boolean; conversation: ConversationDetail }>(
    `${BASE_URL}/conversations/${id}`,
    { headers: getAuthHeaders() }
  );

  if (!response.data.success || !response.data.conversation) {
    throw new Error("Conversation not found");
  }

  return response.data.conversation;
}

/**
 * Optional: Rename a conversation
 */
export async function renameConversation(id: string, newTitle: string): Promise<void> {
  await axios.patch(
    `${BASE_URL}/conversations/${id}`,
    { title: newTitle.trim().slice(0, 100) },
    { headers: getAuthHeaders() }
  );
}

/**
 * Optional: Delete a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/conversations/${id}`, {
    headers: getAuthHeaders(),
  });
}