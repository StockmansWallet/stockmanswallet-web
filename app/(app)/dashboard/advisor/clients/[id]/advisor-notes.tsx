"use client";

import { MessageThread } from "@/components/app/advisory/message-thread";
import { MessageInput } from "@/components/app/advisory/message-input";
import { sendAdvisorMessage } from "./actions";
import type { AdvisoryMessage, MessageType } from "@/lib/types/advisory";

interface AdvisorNotesProps {
  connectionId: string;
  currentUserId: string;
  messages: AdvisoryMessage[];
  participants: Record<string, { name: string; role: string }>;
}

export function AdvisorNotes({
  connectionId,
  currentUserId,
  messages,
  participants,
}: AdvisorNotesProps) {
  const handleSend = async (content: string, type: MessageType) => {
    return sendAdvisorMessage(connectionId, content, type);
  };

  return (
    <>
      <MessageThread
        messages={messages}
        currentUserId={currentUserId}
        participants={participants}
      />
      <MessageInput onSend={handleSend} />
    </>
  );
}
