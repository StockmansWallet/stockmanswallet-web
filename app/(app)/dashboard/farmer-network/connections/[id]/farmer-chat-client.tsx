"use client";

import { MessageThread } from "@/components/app/advisory/message-thread";
import { MessageInput } from "@/components/app/advisory/message-input";
import { sendFarmerMessage } from "./actions";
import type { AdvisoryMessage, MessageType } from "@/lib/types/advisory";

interface FarmerChatClientProps {
  connectionId: string;
  currentUserId: string;
  messages: AdvisoryMessage[];
  participants: Record<string, { name: string; role: string }>;
}

export function FarmerChatClient({
  connectionId,
  currentUserId,
  messages,
  participants,
}: FarmerChatClientProps) {
  const handleSend = async (content: string, type: MessageType) => {
    return sendFarmerMessage(connectionId, content, type);
  };

  return (
    <>
      <MessageThread
        messages={messages}
        currentUserId={currentUserId}
        participants={participants}
      />
      <MessageInput
        onSend={handleSend}
        hideTypeSelector
        placeholder="Write a message..."
      />
    </>
  );
}
