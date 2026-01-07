import React from 'react';
import type GameClient from '../../../../core/gameclient';
import './styles/ConfirmModal.scss';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  gc: GameClient;
  data?: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type?: 'danger' | 'warning' | 'info';
  };
}

export default function ConfirmModal({ isOpen, onClose, gc, data }: ConfirmModalProps) {
  if (!isOpen || !data) return null;

  const {
    title = 'Confirm Action',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'info'
  } = data;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div 
        className={`confirm-modal ${type}`} 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={handleCancel}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="confirm-message">
            {message}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleCancel}>
            {cancelText}
          </button>
          <button className={`btn-primary ${type}`} onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
