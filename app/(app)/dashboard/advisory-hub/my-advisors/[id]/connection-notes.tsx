"use client";

import { MessageThread } from "@/components/app/advisory/message-thread";
import { MessageInput } from "@/components/app/advisory/message-input";
import { sendMessage } from "./actions";
import type { AdvisoryMessage, MessageType } from "@/lib/types/advisory";

interface ConnectionNotesProps {
  connectionId: string;
  currentUserId: string;
  messages: AdvisoryMessage[];
  participants: Record<string, { name: string; role: string }>;
}

export function ConnectionNotes({
  connectionId,
  currentUserId,
  messages,
  participants,
}: ConnectionNotesProps) {
  const handleSend = async (content: string, type: MessageType) => {
    return sendMessage(connectionId, content, type);
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
