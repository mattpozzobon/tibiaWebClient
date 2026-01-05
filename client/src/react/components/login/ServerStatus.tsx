import React, { useEffect, useState } from 'react';
import ApiEndpoints from '../../../utils/api-endpoints';
import './styles/ServerStatus.scss';

interface ServerStatusData {
  status: 'open' | 'opening' | 'closing' | 'closed';
  playersOnline: number;
  uptime: number | null;
  activeMonsters: number;
  worldTime: string;
}

function formatUptime(ms: number | null): string {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

export default function ServerStatus() {
  const [status, setStatus] = useState<ServerStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const statusUrl = ApiEndpoints.getStatusUrl();
    if (!statusUrl) {
      setError("Server configuration unavailable");
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(statusUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const data: ServerStatusData = await response.json();
        setStatus(data);
        setError(null);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch server status:', err);
        setError(err?.message || 'Server unavailable');
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="server-status">
        <span className="status-label">Server:</span>
        <span className="status-value">Loading...</span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="server-status">
        <span className="status-label">Server:</span>
        <span className="status-value status-error">Offline</span>
      </div>
    );
  }

  const statusClass = `status-${status.status}`;

  return (
    <div className="server-status">
      <span className="status-label">Server:</span>
      <span className={`status-value ${statusClass}`}>{status.status}</span>
      <span className="status-separator">|</span>
      <span className="status-label">Players:</span>
      <span className="status-value">{status.playersOnline}</span>
      <span className="status-separator">|</span>
      <span className="status-label">Uptime:</span>
      <span className="status-value">{formatUptime(status.uptime)}</span>
      <span className="status-separator">|</span>
      <span className="status-label">Time:</span>
      <span className="status-value">{status.worldTime}</span>
    </div>
  );
}
