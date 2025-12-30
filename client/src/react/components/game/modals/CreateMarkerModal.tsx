import React, { useState } from 'react';
import { MapMarker, MARKER_ICONS } from '../../../../types/map-marker';
import './styles/CreateMarkerModal.scss';

interface CreateMarkerModalProps {
  visible: boolean;
  x: number;
  y: number;
  floor: number;
  onClose: () => void;
  onCreate: (marker: Omit<MapMarker, 'id' | 'createdAt'>) => void;
}

const CreateMarkerModal: React.FC<CreateMarkerModalProps> = ({
  visible,
  x,
  y,
  floor,
  onClose,
  onCreate
}) => {
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<typeof MARKER_ICONS[number]>('flag0.png');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreate({
      x,
      y,
      floor,
      description: description.trim(),
      icon: selectedIcon
    });

    // Reset form
    setDescription('');
    setSelectedIcon('flag0.png');
    onClose();
  };

  const handleCancel = () => {
    setDescription('');
    setSelectedIcon('flag0.png');
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="modal-backdrop" onClick={handleCancel}>
      <div className="create-marker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Map Marker</h3>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="position-info">
            <p>Position: ({x}, {y}) Floor: {floor}</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="description">Description:</label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter marker description (optional)..."
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label>Icon:</label>
              <div className="icon-selection">
                {MARKER_ICONS.map((icon: typeof MARKER_ICONS[number]) => (
                  <div
                    key={icon}
                    className={`icon-option ${selectedIcon === icon ? 'selected' : ''}`}
                    onClick={() => setSelectedIcon(icon)}
                  >
                    <img 
                      src={`/data/minimap/${icon}`} 
                      alt={icon}
                      className="icon-preview"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-actions">
              <button type="button" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit">
                Create Marker
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMarkerModal;
