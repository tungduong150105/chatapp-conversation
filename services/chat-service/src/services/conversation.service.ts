import { HttpError } from '@chatapp/common';
import type {
  Conversation,
  ConversationFilter,
  ConversationSummary,
  CreateConversationInput,
} from '@/types/conversation';

import { conversationCache } from '@/cache/conversation.cache';
import { conversationRepository } from '@/repositories/conversation.repository';

export const conversationService = {
  async createConversation(input: CreateConversationInput): Promise<{ conversation: Conversation; created: boolean }> {
    const type = input.type ?? (input.participantIds.length === 2 ? 'direct' : 'group');

    if (type === 'direct' && input.participantIds.length === 2) {
      const result = await conversationRepository.findOrCreateDirect({
        ...input,
        type: 'direct',
      });
      await conversationCache.set(result.conversation);
      return result;
    }

    if (type === 'group' && !input.title?.trim()) {
      throw new HttpError(422, 'Group conversations require a title');
    }

    const conversation = await conversationRepository.create({
      ...input,
      type,
    });
    await conversationCache.set(conversation);
    return { conversation, created: true };
  },

  async getConversationById(id: string): Promise<Conversation> {
    const conversation = await conversationRepository.findById(id);

    if (!conversation) {
      await conversationCache.delete(id);
      throw new HttpError(404, 'Conversation not found');
    }

    await conversationCache.set(conversation);
    return conversation;
  },

  async listConversation(filter: ConversationFilter): Promise<ConversationSummary[]> {
    return conversationRepository.findSummaries(filter);
  },

  async touchConversation(conversationId: string, preview: string, lastMessageAt: Date): Promise<void> {
    await conversationRepository.touchConversation(conversationId, preview, lastMessageAt);
    await conversationCache.delete(conversationId);
  },
};
