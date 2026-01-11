import React, { useState, useEffect, useRef } from 'react';
import type GameClient from '../../../../core/gameclient';
import { ItemTextWritePacket } from '../../../../core/protocol';
import './styles/LetterModal.scss';

interface LetterModalProps {
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

export default function LetterModal({ isOpen, onClose, gc, data }: LetterModalProps) {
  const [text, setText] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [letterImageSize, setLetterImageSize] = useState<{ width: number; height: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const letterModalRef = useRef<HTMLDivElement>(null);

  // Handle window resize for responsive image sizing
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load letter image and get its dimensions
  useEffect(() => {
    if (isOpen && data) {
      const letterImage = !data.writeable ? '/png/modals/letter-wax.png' : '/png/modals/letter.png';
      const img = new Image();
      
      img.onload = () => {
        setLetterImageSize({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      
      img.onerror = () => {
        // Fallback dimensions if image fails to load
        setLetterImageSize({ width: 500, height: 600 });
      };
      
      img.src = letterImage;
    } else {
      setLetterImageSize(null);
    }
  }, [isOpen, data?.writeable]);

  // Initialize modal when data changes
  useEffect(() => {
    if (isOpen && data) {
      let content = data.content || '';
      let recipient = '';

      // Parse the recipient name from content (#Name# format)
      if (content) {
        const match = content.match(/^#([^#]+)#\s*/);
        if (match) {
          recipient = match[1];
          // Remove the #Name# prefix and keep the content
          content = content.replace(/^#([^#]+)#\s*/, '').trim();
        }
      }

      setText(content);
      setRecipientName(recipient);
      
      // Focus logic: focus recipient input first, then textarea
      if (data.writeable) {
        setTimeout(() => {
          if (recipientInputRef.current) {
            recipientInputRef.current.focus();
          } else if (textAreaRef.current) {
            textAreaRef.current.focus();
            textAreaRef.current.setSelectionRange(
              textAreaRef.current.value.length,
              textAreaRef.current.value.length
            );
          }
        }, 100);
      }
    }
  }, [isOpen, data]);

  // Calculate total character count including recipient formatting
  const getTotalCharacterCount = (): number => {
    const recipient = recipientName.trim();
    const letterText = text.trim();
    
    if (recipient) {
      // Format: #Recipient# [content]
      return letterText 
        ? recipient.length + 2 + 1 + letterText.length // # + recipient + # + space + content
        : recipient.length + 2; // # + recipient + #
    } else {
      return letterText.length;
    }
  };

  const handleSave = () => {
    if (!data?.writeable || !data?.item) return;
    
    let letterText = text.trim();
    // Remove any existing #Name# prefix
    letterText = letterText.replace(/^#([^#]+)#\s*/, '');
    
    // Format content with recipient name
    let finalContent = '';
    if (recipientName.trim()) {
      const recipient = recipientName.trim();
      finalContent = letterText 
        ? `#${recipient}# ${letterText}` 
        : `#${recipient}#`;
    } else {
      finalContent = letterText;
    }
    
    // Truncate to 255 characters if needed (though maxLength should prevent this)
    if (finalContent.length > 255) {
      finalContent = finalContent.substring(0, 255);
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

  // Determine which image to use - letter-wax for sealed (read-only) letters, letter.png for writable
  const letterImage = !data.writeable ? '/png/modals/letter-wax.png' : '/png/modals/letter.png';
  
  // Calculate responsive dimensions - scale down to 25% of image size
  let modalStyle: React.CSSProperties = {
    backgroundImage: `url(${letterImage})`
  };
  
  if (letterImageSize) {
    // Reduce size to 40% width and 35% height
    const quarterWidth = letterImageSize.width * 0.40;
    const quarterHeight = letterImageSize.height * 0.35;
    
    // Use windowSize state which updates on resize
    const maxWidth = windowSize.width * 0.95;
    const maxHeight = windowSize.height * 0.90;
    
    // If size is still larger than viewport, scale down further
    if (quarterWidth > maxWidth || quarterHeight > maxHeight) {
      // Scale down proportionally
      const scaleX = maxWidth / quarterWidth;
      const scaleY = maxHeight / quarterHeight;
      const scale = Math.min(scaleX, scaleY);
      
      modalStyle.width = `${quarterWidth * scale}px`;
      modalStyle.height = `${quarterHeight * scale}px`;
    } else {
      // Use calculated size
      modalStyle.width = `${quarterWidth}px`;
      modalStyle.height = `${quarterHeight}px`;
    }
  }
  
  return (
    <div className="letter-modal-overlay" onClick={onClose}>
      <div 
        ref={letterModalRef}
        className="letter-modal" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        style={modalStyle}
      >
        <button className="letter-modal-close" onClick={onClose} aria-label="Close">×</button>
        
        <div className="letter-content">
          <div className="letter-recipient-container">
            <label htmlFor="recipient-input" className="letter-label">To:</label>
            {data.writeable ? (
              <input
                id="recipient-input"
                ref={recipientInputRef}
                type="text"
                className="letter-recipient-input"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder=""
                spellCheck={false}
              />
            ) : (
              <div className="letter-recipient-display">
                {recipientName || <span className="no-recipient">(No recipient)</span>}
              </div>
            )}
          </div>
          
          <div className="letter-message-container">
            <label className="letter-label">Message:</label>
            <textarea
              ref={textAreaRef}
              className={`letter-textarea ${data.writeable ? 'writable' : 'read-only'}`}
              value={text}
              onChange={(e) => {
                if (data.writeable) {
                  const newText = e.target.value;
                  const recipient = recipientName.trim();
                  
                  // Calculate total length if we used this text
                  let testLength = newText.trim().length;
                  if (recipient) {
                    // Format would be: #Recipient# [content]
                    testLength = newText.trim()
                      ? recipient.length + 2 + 1 + newText.trim().length // # + recipient + # + space + content
                      : recipient.length + 2; // # + recipient + #
                  }
                  
                  // Only allow update if total would be within limit
                  // Estimate: recipient name likely max 30 chars, so allow up to 223 chars in textarea
                  // But better: check actual total
                  if (testLength <= 255) {
                    setText(newText);
                  }
                }
              }}
              readOnly={!data.writeable}
              placeholder=""
              spellCheck={data.writeable}
              maxLength={255} // HTML maxLength, but we'll enforce total limit including recipient in onChange
            />
          </div>
        </div>
        
        {data.writeable && (
          <>
            <div className={`letter-char-counter letter-char-counter-beside-button ${getTotalCharacterCount() > 255 ? 'over-limit' : ''}`}>
              {getTotalCharacterCount()} / 255 max
            </div>
            <button 
              className="letter-save-btn" 
              onClick={handleSave}
              disabled={getTotalCharacterCount() > 255}
            >
              Write
            </button>
          </>
        )}
        
        {!data.writeable && (
          <button className="letter-save-btn" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
