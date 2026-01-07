import React, { useRef, forwardRef, useImperativeHandle } from 'react';

interface ChatInputProps {
  value: string;
  isActive: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
  onSend: () => void;
}

export interface ChatInputRef {
  focus: () => void;
  blur: () => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({
  value,
  isActive,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  onClick,
  onSend
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus(), blur: () => inputRef.current?.blur() }));

  return (
    <div className="chat-input-form">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => isActive && onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
        placeholder={isActive ? "Type a message..." : "Press Enter or click to chat"}
        className={`chat-input ${isActive ? 'active' : 'inactive'}`}
        readOnly={!isActive}
      />
      <button type="button" className="chat-send-btn" disabled={!value.trim() || !isActive} onClick={onSend}>Send</button>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;
