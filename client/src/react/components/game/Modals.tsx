import React from 'react';

interface Modal {
  id: string;
  component: React.ReactNode;
  visible: boolean;
}

interface ModalsProps {
  modals: Modal[];
  onCloseModal: (id: string) => void;
}

const Modals: React.FC<ModalsProps> = ({ modals, onCloseModal }) => {
  return (
    <div id="modals-overlay" className="modals-overlay">
      {modals
        .filter(modal => modal.visible)
        .map(modal => (
          <div key={modal.id} className="modal-backdrop">
            <div className="modal-container">
              {modal.component}
            </div>
          </div>
        ))
      }
    </div>
  );
};

export default Modals;
