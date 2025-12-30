import React, { useState, useEffect } from 'react';
import { MapMarker, MARKER_ICONS } from '../../../../types/map-marker';
import './styles/CreateMarkerModal.scss'; // Reusing styles

interface EditMarkerModalProps {
  visible: boolean;
  marker: MapMarker | null;
  onClose: () => void;
  onUpdate: (marker: MapMarker) => void;
  onDelete: (markerId: string) => void;
}

const EditMarkerModal: React.FC<EditMarkerModalProps> = ({
  visible,
  marker,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<typeof MARKER_ICONS[number]>('flag0.png');

  useEffect(() => {
    if (marker) {
      setDescription(marker.description);
      setSelectedIcon(marker.icon as typeof MARKER_ICONS[number]);
    }
  }, [marker]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!marker) return;
    
    // Description is optional, no validation needed

    onUpdate({
      ...marker,
      description: description.trim(),
      icon: selectedIcon
    });

    onClose();
  };

  const handleDelete = () => {
    if (!marker) return;
    
    if (confirm('Are you sure you want to delete this marker?')) {
      onDelete(marker.id);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!visible || !marker) return null;

  return (
    <div className="modal-backdrop" onClick={handleCancel}>
      <div className="create-marker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Map Marker</h3>
          <button className="close-button" onClick={handleCancel}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="position-info">
            <p>Position: ({marker.x}, {marker.y}) Floor: {marker.floor}</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="description">Description:</label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter marker description..."
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
              <button type="button" onClick={handleDelete} className="delete-button">
                Delete
              </button>
              <button type="submit">
                Update Marker
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditMarkerModal;
