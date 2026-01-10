import React, { useState, useEffect, useRef } from 'react';
import type GameClient from '../../../../core/gameclient';
import { ItemTextWritePacket } from '../../../../core/protocol';
import './styles/ReadableModal.scss';

interface ReadableModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
  data?: {
    readable: boolean;
    writeable: boolean;
    content: string;
    name: string;
    item?: any; // The item object used to open the modal (for writing back)
  };
}

export default function ReadableModal({ isOpen, onClose, gc, data }: ReadableModalProps) {
  const [text, setText] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);

  // Check if this is a letter or label (case-insensitive)
  const normalizedName = data?.name?.toLowerCase();
  const isLetter = normalizedName === 'letter';
  const isLabel = normalizedName === 'label';
  const isLetterOrLabel = isLetter || isLabel;

  // Initialize modal when data changes
  useEffect(() => {
    if (isOpen && data) {
      let content = data.content || '';
      let recipient = '';

      // If letter/label, parse the recipient name from content (#Name# format)
      if (isLetterOrLabel && content) {
        const match = content.match(/^#([^#]+)#\s*/);
        if (match) {
          recipient = match[1];
          // For labels, remove everything after #Name# since they don't have content
          // For letters, remove only the #Name# prefix and keep the content
          if (isLabel) {
            content = ''; // Labels don't have text content
          } else {
            content = content.replace(/^#([^#]+)#\s*/, '').trim();
          }
        }
      }

      setText(content);
      setRecipientName(recipient);
      
      // Focus logic: labels always focus recipient input, letters focus recipient input first, others focus textarea
      if (data.writeable) {
        setTimeout(() => {
          if (isLetterOrLabel && recipientInputRef.current) {
            recipientInputRef.current.focus();
          } else if (textAreaRef.current) {
            textAreaRef.current.focus();
            // Move cursor to end
            textAreaRef.current.setSelectionRange(
              textAreaRef.current.value.length,
              textAreaRef.current.value.length
            );
          }
        }, 100);
      }
    }
  }, [isOpen, data, isLetterOrLabel]);

  const handleSave = () => {
    if (!data?.writeable || !data?.item) return;
    
    let finalContent = '';

    // Handle labels: only save recipient name in #Name# format (no text content)
    if (isLabel) {
      if (recipientName.trim()) {
        finalContent = `#${recipientName.trim()}#`;
      }
      // If no recipient name, send empty string for labels
    } 
    // Handle letters: save recipient name + text content
    else if (isLetter) {
      let letterText = text.trim();
      // Remove any existing #Name# prefix (and any whitespace after it)
      letterText = letterText.replace(/^#([^#]+)#\s*/, '');
      
      // If recipient name is provided, prepend #Name# to content
      if (recipientName.trim()) {
        const recipient = recipientName.trim();
        // Format: #Name# followed by content (with space if content exists)
        finalContent = letterText 
          ? `#${recipient}# ${letterText}` 
          : `#${recipient}#`;
      } else {
        // If no recipient name, just send the text content
        finalContent = letterText;
      }
    }
    // Handle other items: save text content as-is
    else {
      finalContent = text.trim();
    }
    
    // Send the text back to the server with the item information
    gc.send(new ItemTextWritePacket(data.item, finalContent));
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to save (if writable)
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && data?.writeable) {
      event.preventDefault();
      event.stopPropagation();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  if (!isOpen || !data) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="readable-modal" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2>{data.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          {isLetterOrLabel && (
            <div className="recipient-input-container">
              <label htmlFor="recipient-input">To:</label>
              {data.writeable ? (
                <input
                  id="recipient-input"
                  ref={recipientInputRef}
                  type="text"
                  className="recipient-input"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Enter player name"
                  spellCheck={false}
                />
              ) : (
                <div className="recipient-display">
                  {recipientName || <span className="no-recipient">(No recipient)</span>}
                </div>
              )}
            </div>
          )}
          {!isLabel && (
            <textarea
              ref={textAreaRef}
              className={`readable-textarea ${data.writeable ? 'writable' : 'read-only'}`}
              value={text}
              onChange={(e) => data.writeable && setText(e.target.value)}
              readOnly={!data.writeable}
              placeholder={data.writeable ? 'Start writing...' : ''}
              spellCheck={data.writeable}
            />
          )}
        </div>
        
        {data.writeable && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        )}
        
        {!data.writeable && (
          <div className="modal-footer">
            <button className="btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
