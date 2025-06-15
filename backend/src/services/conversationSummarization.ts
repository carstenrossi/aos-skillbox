import axios from 'axios';

// 📋 CONVERSATION SUMMARIZATION SERVICE
// Handles intelligent conversation summarization to prevent memory loss in long chats

// Simple in-memory cache for conversation summaries
interface CachedSummary {
  summary: string;
  messageRange: string; // firstId_lastId_count
  createdAt: Date;
  tokenCount: number;
}

class SummaryCache {
  private cache = new Map<string, CachedSummary>();
  private maxSize = 500; // Limit cache size

  generateCacheKey(conversationId: string, messages: ConversationMessage[]): string {
    if (messages.length === 0) return '';
    const firstId = messages[0].id;
    const lastId = messages[messages.length - 1].id;
    return `${conversationId}_${firstId}_${lastId}_${messages.length}`;
  }

  get(cacheKey: string): CachedSummary | undefined {
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`📋 Cache HIT: Found summary for ${cacheKey}`);
      return cached;
    }
    console.log(`📋 Cache MISS: No summary found for ${cacheKey}`);
    return undefined;
  }

  set(cacheKey: string, summary: string, messages: ConversationMessage[]): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        console.log(`🗑️ Cache cleanup: Removed oldest entry ${oldestKey}`);
      }
    }

    if (messages.length === 0) return;

    const cached: CachedSummary = {
      summary,
      messageRange: `${messages[0].id}_${messages[messages.length - 1].id}_${messages.length}`,
      createdAt: new Date(),
      tokenCount: estimateTokens(summary)
    };

    this.cache.set(cacheKey, cached);
    console.log(`💾 Cache SET: Stored summary for ${cacheKey} (${cached.tokenCount} tokens)`);
  }

  clear(): void {
    this.cache.clear();
    console.log(`🗑️ Cache cleared`);
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

// Global cache instance
const summaryCache = new SummaryCache();

export interface SummarizationConfig {
  contextLimit: number;
  summarizationTrigger: number; // Percentage (0.0-1.0) of context limit to trigger summarization
  keepRecentMessages: number;   // Number of recent messages to keep in detail
  useSummarization: boolean;    // Whether summarization is enabled
}

export interface Assistant {
  id: string;
  api_url: string;
  jwt_token?: string;
  system_prompt?: string;
  context_limit?: number;
  // New summarization fields (optional)
  summarization_trigger?: number;
  keep_recent_messages?: number;
  use_summarization?: boolean;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string | Date;
}

/**
 * Estimates token count for text content using simple heuristic
 * @param text - Text content to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokens(text: string): number {
  // Heuristic: ~4 characters per token for German/English text
  return Math.ceil(text.length / 4);
}

/**
 * Gets summarization configuration for an assistant
 * @param assistant - Assistant object
 * @returns Summarization configuration
 */
export function getSummarizationConfig(assistant: Assistant): SummarizationConfig {
  return {
    contextLimit: assistant.context_limit || 32000,
    summarizationTrigger: assistant.summarization_trigger || 0.8, // 80% = ~25,600 tokens (PRODUCTION)
    keepRecentMessages: assistant.keep_recent_messages || 15, // Keep 15 recent messages in detail
    useSummarization: assistant.use_summarization !== false // Default true
  };
}

/**
 * Checks if conversation needs summarization based on token count
 * @param messages - Array of conversation messages
 * @param config - Summarization configuration
 * @returns Object with needsSummarization flag and total tokens
 */
export function checkSummarizationNeed(
  messages: ConversationMessage[], 
  config: SummarizationConfig
): { needsSummarization: boolean; totalTokens: number; triggerThreshold: number } {
  // Only count non-summary messages for trigger calculation
  // Summary messages are already compressed and shouldn't trigger new summarization
  const nonSummaryMessages = messages.filter(msg => 
    msg.role !== 'system' || !msg.content.includes('📋 CHAT-ZUSAMMENFASSUNG')
  );
  
  const totalTokens = nonSummaryMessages.reduce((total, msg) => {
    return total + estimateTokens(msg.content) + 15; // +15 for message structure overhead
  }, 0);
  
  const triggerThreshold = config.contextLimit * config.summarizationTrigger;
  const needsSummarization = config.useSummarization && totalTokens > triggerThreshold;
  
  console.log(`📊 Summarization check: ${totalTokens} tokens (${nonSummaryMessages.length}/${messages.length} non-summary messages), threshold: ${triggerThreshold}, needs summarization: ${needsSummarization}`);
  
  return { needsSummarization, totalTokens, triggerThreshold };
}

/**
 * Calls the assistant's API to generate a conversation summary
 * @param messages - Messages to summarize
 * @param assistant - Assistant to use for summarization
 * @returns Summary text
 */
export async function generateConversationSummary(
  messages: ConversationMessage[],
  assistant: Assistant
): Promise<string> {
  console.log(`🤖 Generating summary for ${messages.length} messages using ${assistant.id}`);
  
  // Build summarization prompt
  const messagesText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
  
  const summarizationPrompt = `Fasse diese Conversation zusammen. Konzentriere dich auf die wichtigsten Informationen:

📋 FOKUS-BEREICHE:
- Benutzer-Informationen (Name, Präferenzen, Kontext, Projekte)
- Hauptthemen und Diskussionspunkte
- Wichtige Entscheidungen und Ergebnisse
- Technische Details die relevant bleiben
- Laufende Aufgaben oder Projekte
- Benutzer-Präferenzen und Arbeitsweise

📝 FORMAT:
Erstelle eine strukturierte Zusammenfassung in deutscher Sprache. Verwende Bulletpoints für bessere Lesbarkeit.

🔍 NACHRICHTEN ZUR ZUSAMMENFASSUNG:
${messagesText}

Antworte nur mit der Zusammenfassung, keine zusätzlichen Kommentare.`;

  try {
    // Use GPT-4o (EU) for summarization - consistent across all AssistantOS instances
    // Same API and auth as main assistant, but dedicated model for reliable summarization
    const SUMMARIZATION_MODEL = 'GPT-4o (EU)';
    
    console.log(`🤖 Using summarization model: ${SUMMARIZATION_MODEL}`);
    
    // Prepare API request data using same format as main chat
    const requestData = {
      model: SUMMARIZATION_MODEL,
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for consistent summaries
      stream: false, // Ensure no streaming for summarization
      messages: [
        {
          role: 'user',
          content: summarizationPrompt
        }
      ]
    };

    const apiEndpoint = `${assistant.api_url}/api/chat/completions`;
    console.log(`🌐 Calling API: ${apiEndpoint} for summarization`);
    
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    if (assistant.jwt_token) {
      headers.Authorization = `Bearer ${assistant.jwt_token}`;
    }

    const response = await axios.post(apiEndpoint, requestData, {
      headers,
      timeout: 60000 // 60 second timeout for summarization
    });

    // Extract summary using multiple possible response formats
    const responseData = response.data as any;
    const summary = responseData?.content || 
                   responseData?.choices?.[0]?.message?.content || 
                   responseData?.message?.content ||
                   responseData?.text ||
                   'Zusammenfassung konnte nicht generiert werden.';
    
    console.log(`✅ Summary generated: ${summary.substring(0, 100)}...`);
    return summary;

  } catch (error: any) {
    console.error('❌ Error generating summary:', error.response?.data || error.message);
    
    // Fallback summary if API fails
    const fallbackSummary = `📋 AUTOMATISCHE ZUSAMMENFASSUNG:
- Conversation mit ${messages.length} Nachrichten
- Zeitraum: ${messages[0]?.created_at} bis ${messages[messages.length - 1]?.created_at}
- Hauptsächlich ${messages.filter(m => m.role === 'user').length} Benutzer-Nachrichten und ${messages.filter(m => m.role === 'assistant').length} Assistant-Antworten
- Detaillierte Historie verfügbar, automatische Zusammenfassung aufgrund API-Fehler nicht möglich`;

    return fallbackSummary;
  }
}

/**
 * Handles conversation summarization process with caching
 * @param messages - All conversation messages
 * @param assistant - Assistant configuration
 * @param systemPrompt - Current system prompt
 * @param conversationId - Conversation ID for caching
 * @returns Processed messages array with summary
 */
export async function handleConversationSummarizationWithCache(
  messages: ConversationMessage[],
  assistant: Assistant,
  systemPrompt: string,
  conversationId: string
): Promise<ConversationMessage[]> {
  const config = getSummarizationConfig(assistant);
  
  // Check if summarization is needed
  const { needsSummarization, totalTokens } = checkSummarizationNeed(messages, config);
  
  if (!needsSummarization) {
    console.log(`📚 No summarization needed (${totalTokens} tokens < ${config.contextLimit * config.summarizationTrigger} threshold)`);
    return messages;
  }
  
  console.log(`🚀 Starting conversation summarization (${totalTokens} tokens > ${config.contextLimit * config.summarizationTrigger} threshold)`);
  
  try {
    // Split messages: old ones to summarize, recent ones to keep in detail
    const totalMessages = messages.length;
    const keepRecentCount = Math.min(config.keepRecentMessages, totalMessages);
    const summarizeCount = totalMessages - keepRecentCount;
    
    if (summarizeCount <= 0) {
      console.log(`📚 Not enough messages to summarize (only ${totalMessages} messages, keeping ${keepRecentCount})`);
      return messages;
    }
    
    const messagesToProcess = messages.slice(0, summarizeCount);
    const recentMessages = messages.slice(summarizeCount);
    
    // Check cache for existing summary
    const cacheKey = summaryCache.generateCacheKey(conversationId, messagesToProcess);
    const cachedSummary = summaryCache.get(cacheKey);
    
    let summary: string;
    
    if (cachedSummary) {
      // Use cached summary
      summary = cachedSummary.summary;
      console.log(`📋 Using cached summary for ${messagesToProcess.length} messages (${cachedSummary.tokenCount} tokens)`);
    } else {
      // Generate new summary and cache it
      const regularMessages = messagesToProcess.filter(msg => 
        !(msg.role === 'system' && msg.content.includes('📋 CHAT-ZUSAMMENFASSUNG'))
      );
      
      console.log(`📋 Generating new summary for ${regularMessages.length} regular messages`);
      summary = await generateConversationSummary(regularMessages, assistant);
      
      // Cache the summary
      summaryCache.set(cacheKey, summary, messagesToProcess);
    }
    
    // Create summary message
    const summaryMessage: ConversationMessage = {
      id: `summary_${Date.now()}`,
      role: 'system',
      content: `📋 CHAT-ZUSAMMENFASSUNG (${messagesToProcess.length} ältere Nachrichten):\n\n${summary}`,
      created_at: new Date().toISOString()
    };
    
    // Return processed messages: summary + recent messages
    const processedMessages = [summaryMessage, ...recentMessages];
    
    const newTotalTokens = processedMessages.reduce((total, msg) => {
      return total + estimateTokens(msg.content) + 15;
    }, 0);
    
    console.log(`✅ Summarization complete: ${totalMessages} → ${processedMessages.length} messages, ${totalTokens} → ${newTotalTokens} tokens`);
    
    return processedMessages;
    
  } catch (error) {
    console.error('❌ Error during summarization:', error);
    
    // Fallback: use original token management if summarization fails
    console.log('🔄 Falling back to original token management');
    return messages;
  }
}

/**
 * Handles conversation summarization process (legacy without caching)
 * @param messages - All conversation messages
 * @param assistant - Assistant configuration
 * @param systemPrompt - Current system prompt
 * @returns Processed messages array with summary
 */
export async function handleConversationSummarization(
  messages: ConversationMessage[],
  assistant: Assistant,
  systemPrompt: string
): Promise<ConversationMessage[]> {
  const config = getSummarizationConfig(assistant);
  
  // Check if summarization is needed
  const { needsSummarization, totalTokens } = checkSummarizationNeed(messages, config);
  
  if (!needsSummarization) {
    console.log(`📚 No summarization needed (${totalTokens} tokens < ${config.contextLimit * config.summarizationTrigger} threshold)`);
    return messages;
  }
  
  console.log(`🚀 Starting conversation summarization (${totalTokens} tokens > ${config.contextLimit * config.summarizationTrigger} threshold)`);
  
  try {
    // Split messages: old ones to summarize, recent ones to keep in detail
    const totalMessages = messages.length;
    const keepRecentCount = Math.min(config.keepRecentMessages, totalMessages);
    const summarizeCount = totalMessages - keepRecentCount;
    
    if (summarizeCount <= 0) {
      console.log(`📚 Not enough messages to summarize (only ${totalMessages} messages, keeping ${keepRecentCount})`);
      return messages;
    }
    
    const messagesToProcess = messages.slice(0, summarizeCount);
    const recentMessages = messages.slice(summarizeCount);
    
    // Separate existing summaries from regular messages
    const existingSummaries = messagesToProcess.filter(msg => 
      msg.role === 'system' && msg.content.includes('📋 CHAT-ZUSAMMENFASSUNG')
    );
    const regularMessages = messagesToProcess.filter(msg => 
      !(msg.role === 'system' && msg.content.includes('📋 CHAT-ZUSAMMENFASSUNG'))
    );
    
    console.log(`📋 Processing ${messagesToProcess.length} old messages: ${existingSummaries.length} existing summaries + ${regularMessages.length} regular messages, keeping ${recentMessages.length} recent messages in detail`);
    
    // Generate new summary from regular messages only
    const newSummary = await generateConversationSummary(regularMessages, assistant);
    
    // Combine existing summaries with new summary
    let combinedSummary = newSummary;
    if (existingSummaries.length > 0) {
      const existingSummaryContent = existingSummaries
        .map(s => s.content.replace('📋 CHAT-ZUSAMMENFASSUNG (', '').replace(/^\d+ ältere Nachrichten\):\n\n/, ''))
        .join('\n\n---\n\n');
      
      combinedSummary = `📋 VORHERIGE ZUSAMMENFASSUNGEN:\n${existingSummaryContent}\n\n📋 NEUE ZUSAMMENFASSUNG:\n${newSummary}`;
    }
    
    const summary = combinedSummary;
    
    // Create summary message
    const summaryMessage: ConversationMessage = {
      id: `summary_${Date.now()}`,
      role: 'system',
      content: `📋 CHAT-ZUSAMMENFASSUNG (${messagesToProcess.length} ältere Nachrichten):\n\n${summary}`,
      created_at: new Date().toISOString()
    };
    
    // Return processed messages: system prompt + summary + recent messages
    const processedMessages = [summaryMessage, ...recentMessages];
    
    const newTotalTokens = processedMessages.reduce((total, msg) => {
      return total + estimateTokens(msg.content) + 15;
    }, 0);
    
    console.log(`✅ Summarization complete: ${totalMessages} → ${processedMessages.length} messages, ${totalTokens} → ${newTotalTokens} tokens`);
    
    return processedMessages;
    
  } catch (error) {
    console.error('❌ Error during summarization:', error);
    
    // Fallback: use original token management if summarization fails
    console.log('🔄 Falling back to original token management');
    return messages;
  }
}

/**
 * Enhanced message selection with summarization support
 * @param conversationHistory - Array of messages from the conversation
 * @param assistant - Assistant object with context_limit and summarization config
 * @param systemPrompt - System prompt to include in token calculations
 * @param conversationId - Conversation ID for caching
 * @returns Array of selected/summarized messages that fit within token limits
 */
export async function selectConversationHistoryWithSummarization(
  conversationHistory: ConversationMessage[],
  assistant: Assistant,
  systemPrompt: string = '',
  conversationId: string = ''
): Promise<ConversationMessage[]> {
  const config = getSummarizationConfig(assistant);
  
  console.log(`📊 Assistant: ${assistant.id}, Context: ${config.contextLimit}, Summarization: ${config.useSummarization}, Cache: ${summaryCache.getStats().size}/${summaryCache.getStats().maxSize}`);
  
  if (!config.useSummarization) {
    // Use original logic if summarization is disabled
    console.log('📚 Summarization disabled, using original token management');
    return selectConversationHistoryOriginal(conversationHistory, assistant);
  }
  
  // Check if summarization is needed
  const { needsSummarization } = checkSummarizationNeed(conversationHistory, config);
  
  if (needsSummarization) {
    // Apply summarization with caching
    return await handleConversationSummarizationWithCache(conversationHistory, assistant, systemPrompt, conversationId);
  } else {
    // Use original logic if under threshold
    console.log('📚 Under summarization threshold, using original token management');
    return selectConversationHistoryOriginal(conversationHistory, assistant);
  }
}

/**
 * Original conversation history selection logic (fallback)
 * @param conversationHistory - Array of messages from the conversation
 * @param assistant - Assistant object with context_limit
 * @returns Array of selected messages that fit within token limits
 */
function selectConversationHistoryOriginal(
  conversationHistory: ConversationMessage[], 
  assistant: Assistant
): ConversationMessage[] {
  const contextLimit = assistant.context_limit || 32000;  // Default 32k tokens
  
  // Token reservations for various parts of the request
  const RESERVED_TOKENS = {
    system: 1200,     // System prompt + plugin definitions
    response: 4000,   // Response generation space
    buffer: 800       // Safety buffer
  };
  
  const AVAILABLE_FOR_HISTORY = contextLimit - 
    Object.values(RESERVED_TOKENS).reduce((a, b) => a + b, 0);
  
  let totalTokens = 0;
  const selectedMessages: ConversationMessage[] = [];
  
  // Select messages backwards (newest first) to prioritize recent context
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const message = conversationHistory[i];
    const messageTokens = estimateTokens(message.content) + 15; // +15 for message structure overhead
    
    if (totalTokens + messageTokens <= AVAILABLE_FOR_HISTORY) {
      selectedMessages.unshift(message); // Add to beginning to maintain chronological order
      totalTokens += messageTokens;
    } else {
      // Stop adding messages when we hit the limit
      break;
    }
  }
  
  // Ensure we have at least the most recent message if history exists
  if (selectedMessages.length === 0 && conversationHistory.length > 0) {
    selectedMessages.push(conversationHistory[conversationHistory.length - 1]);
    console.log(`⚠️ Only including most recent message due to token constraints`);
  }
  
  console.log(`✅ Selected ${selectedMessages.length}/${conversationHistory.length} messages (~${totalTokens} tokens)`);
  return selectedMessages;
} 