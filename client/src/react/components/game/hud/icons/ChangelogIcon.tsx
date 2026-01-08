import React from 'react';
import '../styles/IconButton.scss';

interface ChangelogIconProps {
  gc?: any;
}

export default function ChangelogIcon({ gc }: ChangelogIconProps) {
  const handleChangelog = () => {
    (window as any).reactUIManager?.openModal('changelog');
  };

  return (
    <div className="changelog-icon-wrapper">
      <div className="icon-button" title="Changelog (Ctrl+N)" onClick={handleChangelog}>
        <span className="changelog-icon">📋</span>
      </div>
    </div>
  );
}
