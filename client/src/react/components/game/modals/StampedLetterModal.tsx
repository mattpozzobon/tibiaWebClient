import React, { useState, useEffect, useRef } from 'react';
import type GameClient from '../../../../core/gameclient';
import { ItemTextWritePacket } from '../../../../core/protocol';
import './styles/LetterModal.scss';

interface StampedLetterModalProps {
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

export default function StampedLetterModal({ isOpen, onClose, gc, data }: StampedLetterModalProps) {
  const [text, setText] = useState<string>('');
  const [letterImageSize, setLetterImageSize] = useState<{ width: number; height: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const letterModalRef = useRef<HTMLDivElement>(null);

  // Handle window resize for responsive image sizing
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load letter-wax image and get its dimensions
  useEffect(() => {
    if (isOpen && data) {
      const letterImage = '/png/modals/letter-wax.png';
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
  }, [isOpen, data]);

  // Initialize modal when data changes
  useEffect(() => {
    if (isOpen && data) {
      const content = data.content || '';
      setText(content);
      
      // Focus logic: focus textarea if writable
      if (data.writeable && textAreaRef.current) {
        setTimeout(() => {
          if (textAreaRef.current) {
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

  // Auto-save on close if writable
  const handleClose = () => {
    if (data?.writeable && data?.item && text.trim() !== (data.content || '').trim()) {
      // Only save if content has changed
      let finalContent = text.trim();
      // Truncate to 255 characters if needed
      if (finalContent.length > 255) {
        finalContent = finalContent.substring(0, 255);
      }
      gc.send(new ItemTextWritePacket(data.item, finalContent));
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

  // Always use letter-wax.png for stamped letters
  const letterImage = '/png/modals/letter-wax.png';
  
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
    <div className="letter-modal-overlay" onClick={handleClose}>
      <div 
        ref={letterModalRef}
        className="letter-modal" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        style={modalStyle}
      >
        <button className="letter-modal-close" onClick={handleClose} aria-label="Close">×</button>
        
        <div className="letter-content">
          <textarea
            ref={textAreaRef}
            className={`letter-textarea stamped-letter-textarea ${data.writeable ? 'writable' : 'read-only'}`}
            value={text}
            onChange={(e) => data.writeable && setText(e.target.value)}
            readOnly={!data.writeable}
            placeholder=""
            spellCheck={data.writeable}
            maxLength={255}
          />
        </div>
      </div>
    </div>
  );
}
