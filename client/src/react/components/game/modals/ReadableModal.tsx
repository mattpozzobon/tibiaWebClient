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
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Safety checks: Letters, stamped letters, and labels are handled by their respective modals
  if (isOpen && data) {
    const normalizedName = data.name?.toLowerCase();
    
    if (normalizedName === 'letter') {
      console.warn('LetterModal should handle letters, not ReadableModal');
      return null;
    }
    
    if (normalizedName === 'stamped letter' || normalizedName === 'stampedletter') {
      console.warn('StampedLetterModal should handle stamped letters, not ReadableModal');
      return null;
    }
    
    if (normalizedName === 'label') {
      console.warn('LabelModal should handle labels, not ReadableModal');
      return null;
    }
  }

  // Initialize modal when data changes
  useEffect(() => {
    if (isOpen && data) {
      const content = data.content || '';
      setText(content);
      
      // Focus textarea when writable
      if (data.writeable && textAreaRef.current) {
        setTimeout(() => {
          if (textAreaRef.current) {
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
  }, [isOpen, data]);

  const handleSave = () => {
    if (!data?.writeable || !data?.item) return;
    
    // Save text content as-is
    const finalContent = text.trim();
    
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

  // Standard modal layout for readable items (books, scrolls, etc.)
  // Letters, stamped letters, and labels are handled by their dedicated modals
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
          <textarea
            ref={textAreaRef}
            className={`readable-textarea ${data.writeable ? 'writable' : 'read-only'}`}
            value={text}
            onChange={(e) => data.writeable && setText(e.target.value)}
            readOnly={!data.writeable}
            placeholder={data.writeable ? 'Start writing...' : ''}
            spellCheck={data.writeable}
          />
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
