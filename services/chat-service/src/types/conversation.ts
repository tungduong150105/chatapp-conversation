export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  participantIds: string[];
  createdBy: string;
  directKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
}

export interface CreateConversationInput {
  type?: ConversationType;
  title?: string | null;
  participantIds: string[];
  createdBy: string;
}

export interface ConversationFilter {
  participantId: string;
}

export type ConversationSummary = Conversation;
