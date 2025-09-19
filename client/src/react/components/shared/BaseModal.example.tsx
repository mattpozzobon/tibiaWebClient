import React, { useState } from 'react';
import BaseModal from './BaseModal';

// Example of how to use the standardized BaseModal component

interface ExampleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExampleModal({ isOpen, onClose }: ExampleModalProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    console.log('Submitted:', inputValue);
    onClose();
  };

  // Define footer buttons
  const footer = (
    <>
      <button className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button 
        className="btn-primary" 
        onClick={handleSubmit}
        disabled={!inputValue.trim()}
      >
        Submit
      </button>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Example Modal"
      footer={footer}
      size="medium" // small, medium, large, extra-large
    >
      {/* Only the body content is customizable */}
      <div className="form-group">
        <label>Enter some text:</label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type something..."
        />
      </div>

      <div className="form-group">
        <label>Select an option:</label>
        <select>
          <option value="option1">Option 1</option>
          <option value="option2">Option 2</option>
          <option value="option3">Option 3</option>
        </select>
      </div>

      <p>This is example content that shows how the modal body can be customized while maintaining consistent header and footer styling.</p>
    </BaseModal>
  );
}

/* 
Usage Examples:

1. Simple modal with just content:
<BaseModal isOpen={isOpen} onClose={onClose} title="Simple Modal">
  <p>Just some content</p>
</BaseModal>

2. Modal with footer buttons:
<BaseModal 
  isOpen={isOpen} 
  onClose={onClose} 
  title="Modal with Footer"
  footer={<button className="btn-primary">OK</button>}
>
  <p>Content here</p>
</BaseModal>

3. Large modal without close button:
<BaseModal 
  isOpen={isOpen} 
  onClose={onClose} 
  title="Large Modal"
  size="large"
  showCloseButton={false}
>
  <p>Large content area</p>
</BaseModal>

4. Custom styled modal:
<BaseModal 
  isOpen={isOpen} 
  onClose={onClose} 
  title="Custom Modal"
  className="my-custom-modal"
>
  <p>Content with custom styling</p>
</BaseModal>
*/
