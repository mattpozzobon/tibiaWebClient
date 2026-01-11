import React, { useState, useEffect, useRef } from 'react';
import type GameClient from '../../../../core/gameclient';
import { ItemTextWritePacket } from '../../../../core/protocol';
import './styles/LetterModal.scss';

interface LabelModalProps {
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

export default function LabelModal({ isOpen, onClose, gc, data }: LabelModalProps) {
  const [recipientName, setRecipientName] = useState<string>('');
  const [labelImageSize, setLabelImageSize] = useState<{ width: number; height: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const labelModalRef = useRef<HTMLDivElement>(null);

  // Handle window resize for responsive image sizing
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load label image and get its dimensions
  useEffect(() => {
    if (isOpen && data) {
      const labelImage = '/png/modals/label.png';
      const img = new Image();
      
      img.onload = () => {
        setLabelImageSize({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      
      img.onerror = () => {
        // Fallback dimensions if image fails to load
        setLabelImageSize({ width: 500, height: 600 });
      };
      
      img.src = labelImage;
    } else {
      setLabelImageSize(null);
    }
  }, [isOpen, data]);

  // Initialize modal when data changes
  useEffect(() => {
    if (isOpen && data) {
      let recipient = '';

      // Parse the recipient name from content (#Name# format)
      if (data.content) {
        const match = data.content.match(/^#([^#]+)#/);
        if (match) {
          recipient = match[1];
        }
      }

      setRecipientName(recipient);
      
      // Focus logic: focus recipient input if writable
      if (data.writeable && recipientInputRef.current) {
        setTimeout(() => {
          if (recipientInputRef.current) {
            recipientInputRef.current.focus();
          }
        }, 100);
      }
    }
  }, [isOpen, data]);

  // Auto-save on close if writable
  const handleClose = () => {
    if (data?.writeable && data?.item) {
      const currentRecipient = recipientName.trim();
      const originalContent = data.content || '';
      const originalMatch = originalContent.match(/^#([^#]+)#/);
      const originalRecipient = originalMatch ? originalMatch[1] : '';
      
      // Only save if recipient has changed
      if (currentRecipient !== originalRecipient) {
        // Format as #Name# (labels only have recipient name, no content)
        const finalContent = currentRecipient ? `#${currentRecipient}#` : '';
        gc.send(new ItemTextWritePacket(data.item, finalContent));
      }
    }
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Escape to close (and auto-save if writable)
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleClose();
    }
  };

  if (!isOpen || !data) return null;

  // Always use label.png for labels
  const labelImage = '/png/modals/label.png';
  
  // Calculate responsive dimensions - scale down to 40% width and 35% height
  let modalStyle: React.CSSProperties = {
    backgroundImage: `url(${labelImage})`
  };
  
  if (labelImageSize) {
    const quarterWidth = labelImageSize.width * 0.40;
    const quarterHeight = labelImageSize.height * 0.35;
    
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
    <div className="letter-modal-overlay" onClick={handleClose}>
      <div 
        ref={labelModalRef}
        className="letter-modal" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        style={modalStyle}
      >
        <div className="letter-content label-content">
          <div className="letter-recipient-container label-recipient-container">
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
                maxLength={253} // 255 - 2 for # and #
              />
            ) : (
              <div className="letter-recipient-display">
                {recipientName || <span className="no-recipient">(No recipient)</span>}
              </div>
            )}
            <button className="letter-modal-close label-close-btn" onClick={handleClose} aria-label="Close">×</button>
          </div>
        </div>
      </div>
    </div>
  );
}
