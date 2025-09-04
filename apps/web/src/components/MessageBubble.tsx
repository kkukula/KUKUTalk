// src/components/MessageBubble.tsx
import { MessageItem } from '@/api';

export default function MessageBubble({
  msg,
  isMine,
  authorName,
}: {
  msg: MessageItem;
  isMine: boolean;
  authorName?: string | null;
}) {
  return (
    <div className={`msg-row ${isMine ? 'mine' : ''}`}>
      {!isMine && <div className="msg-author">{authorName || 'Użytkownik'}</div>}
      <div className="msg-bubble">
        <div className="msg-content">{msg.content}</div>
        <div className="msg-meta">
          {new Date(msg.createdAt).toLocaleString()}
          {isMine && msg.status ? ` · ${msg.status}` : ''}
        </div>
      </div>
    </div>
  );
}
