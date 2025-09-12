import React, { useState, useEffect } from 'react';
import { ChangelogService, ChangelogEntry } from '../../services/changelog-service';
import './styles/ChangelogModal.scss';

interface ChangelogModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ isVisible, onClose }: ChangelogModalProps) {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      loadChangelog();
    }
  }, [isVisible]);

  const loadChangelog = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const changelogService = new ChangelogService();
      const entries = await changelogService.fetchChangelog();
      setChangelog(entries);
    } catch (err: any) {
      setError('Failed to load changelog');
      console.error('Changelog loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEntryClick = (entryId: string) => {
    if (expandedEntry === entryId) {
      setExpandedEntry(null);
    } else {
      setExpandedEntry(entryId);
    }
  };

  const formatChangelogContent = (content: string): React.ReactNode => {
    const lines = content.split('\n').filter((line, i) => !(i === 0 && line.trim() === ''));
    
    return lines.map((line, index) => {
      const trimmedLine = line.trimEnd();
      
      if (trimmedLine.startsWith('## ')) {
        return (
          <div key={index} className="changelog-subtitle">
            {trimmedLine.slice(3).trim()}
          </div>
        );
      }
      
      return (
        <div key={index} className="changelog-line">
          {trimmedLine}
        </div>
      );
    });
  };

  const renderChangelogEntry = (entry: ChangelogEntry) => {
    const isExpanded = expandedEntry === entry.id;
    const date = new Date(entry.timestamp);
    
    const imageUrls = (entry.attachments ?? [])
      .filter(att => att.url.match(/\.(png|jpe?g|gif|webp)$/i))
      .map(att => att.url);
    
    const authorName = entry.author.globalName
      ? `${entry.author.username} (${entry.author.globalName})`
      : entry.author.username;

    const reactions = entry.reactions?.filter(r =>
      r.emoji?.name === '👍🏻' || r.emoji?.name === '👎🏻'
    ) || [];

    return (
      <div
        key={entry.id}
        className={`changelog-entry ${isExpanded ? 'expanded' : ''} ${expandedEntry && expandedEntry !== entry.id ? 'hidden' : ''}`}
        onClick={() => handleEntryClick(entry.id)}
      >
        <div className="changelog-header">
          {entry.author.avatarUrl && (
            <img 
              className="changelog-avatar" 
              src={entry.author.avatarUrl} 
              alt={entry.author.username} 
            />
          )}
          <div className="changelog-meta">
            {entry.title && (
              <div className="changelog-title">{entry.title}</div>
            )}
            <div className="changelog-meta-row">
              <span className="changelog-author">
                {authorName} {date.toLocaleDateString('en-GB')}
              </span>
            </div>
            {reactions.length > 0 && (
              <div className="changelog-reactions">
                {reactions.map((reaction, index) => (
                  <span key={index} className="reaction">
                    {reaction.emoji.name} {reaction.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className={`changelog-message ${isExpanded ? 'expanded' : ''}`}>
          {formatChangelogContent(entry.content)}
          {imageUrls.map((url, index) => (
            <img 
              key={index}
              className="changelog-image" 
              src={url} 
              alt="Changelog attachment" 
            />
          ))}
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="changelog-modal-overlay" onClick={onClose}>
      <div className="changelog-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="changelog-modal-header">
          <h2>Changelog</h2>
          <button className="changelog-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="changelog-modal-content">
          {loading && (
            <div className="changelog-loading">
              <div className="loading-spinner"></div>
              <p>Loading changelog...</p>
            </div>
          )}
          
          {error && (
            <div className="changelog-error">
              <p>{error}</p>
              <button onClick={loadChangelog} className="btn-primary">Retry</button>
            </div>
          )}
          
          {!loading && !error && changelog.length === 0 && (
            <div className="changelog-empty">
              <p>No recent updates</p>
            </div>
          )}
          
          {!loading && !error && changelog.length > 0 && (
            <div className="changelog-entries">
              {changelog.map(renderChangelogEntry)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
