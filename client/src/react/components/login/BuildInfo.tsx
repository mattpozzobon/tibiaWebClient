import React, { useEffect, useState } from 'react';
import './styles/BuildInfo.scss';

interface VersionInfo {
  version: string;
}

export default function BuildInfo() {
  const [version, setVersion] = useState<string>('Loading...');

  useEffect(() => {
    // Fetch version directly from the same source as asset-manager
    const fetchVersion = async () => {
      try {
        const response = await fetch('/data/sprites/version.json');
        if (response.ok) {
          const versionInfo: VersionInfo = await response.json();
          setVersion(versionInfo.version);
        } else {
          setVersion('Unknown');
        }
      } catch (error) {
        console.debug('Could not fetch version:', error);
        setVersion('Unknown');
      }
    };

    // Fetch immediately
    fetchVersion();

    // Also check the DOM element as a fallback (in case asset-manager updates it)
    const updateFromDOM = () => {
      const versionElement = document.getElementById("client-version");
      if (versionElement && versionElement.innerHTML) {
        setVersion(versionElement.innerHTML);
      }
    };

    // Poll DOM element periodically as fallback
    const interval = setInterval(updateFromDOM, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="build-info">
      Build: <span className="version">{version}</span>
    </div>
  );
}
