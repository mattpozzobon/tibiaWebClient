import React, { useState, useEffect } from 'react';
import { ChangelogService, ChangelogEntry } from '../../../services/changelog-service';
import './styles/ChangelogSidebar.scss';



export default function ChangelogSidebar() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChangelog();
  }, []);

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

  const renderChangelogEntry = (entry: ChangelogEntry, index: number) => {
    const isExpanded = expandedEntry === entry.id;
    const date = new Date(entry.timestamp);
    
    const imageUrls = (entry.attachments ?? [])
      .filter((att: { url: string; filename: string }) => {
        // Check both filename and URL for image extensions, handling query parameters
        const filenameIsImage = att.filename.match(/\.(png|jpe?g|gif|webp)$/i);
        const urlIsImage = att.url.match(/\.(png|jpe?g|gif|webp)(\?|$)/i);
        return filenameIsImage || urlIsImage;
      })
      .map((att: { url: string; filename: string }) => att.url);
    
    const authorName = entry.author.globalName
      ? `${entry.author.username} (${entry.author.globalName})`
      : entry.author.username;

    const reactions = entry.reactions?.filter((r: any) =>
      r.emoji?.name === '👍🏻' || r.emoji?.name === '👎🏻'
    ) || [];

    // Hide other items when one is expanded, or show all when none are expanded
    const shouldShow = !expandedEntry || isExpanded;
    
    // When expanded, position at the very top; otherwise use normal stacking with less spacing
    const topPosition = isExpanded ? 16 : 16 + (index * 70);

    return (
      <div
        key={entry.id}
        className={`changelog-sidebar-item-standalone ${isExpanded ? 'expanded' : ''}`}
        style={{ 
          top: `${topPosition}px`,
          display: shouldShow ? 'block' : 'none'
        }}
        onClick={() => handleEntryClick(entry.id)}
      >
        <div className="changelog-sidebar-item-header">
          {entry.author.avatarUrl && (
            <img 
              className="changelog-sidebar-avatar" 
              src={entry.author.avatarUrl} 
              alt={entry.author.username} 
            />
          )}
          <div className="changelog-sidebar-meta">
            {entry.title && (
              <div className="changelog-sidebar-item-title">{entry.title}</div>
            )}
            <div className="changelog-sidebar-meta-row">
              <span className="changelog-sidebar-author">
                {authorName} {date.toLocaleDateString('en-GB')}
              </span>
            </div>
            {reactions.length > 0 && (
              <div className="changelog-sidebar-reactions">
                {reactions.map((reaction: any, index: number) => (
                  <span key={index} className="reaction">
                    {reaction.emoji.name} {reaction.count}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="changelog-sidebar-item-toggle">
            {isExpanded ? '−' : '+'}
          </div>
        </div>
        
        {isExpanded && (
          <div className="changelog-sidebar-item-content">
            {formatChangelogContent(entry.content)}
            {imageUrls.map((url: string, index: number) => (
              <img 
                key={index}
                className="changelog-sidebar-image" 
                src={url} 
                alt="Changelog attachment"
              />
            ))}
          </div>
        )}
      </div>
    );
  };


  if (loading) {
    return (
      <div className="changelog-sidebar-loading">
        <div className="loading-spinner"></div>
        <p>Loading changelog...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="changelog-sidebar-error">
        <p>{error}</p>
        <button onClick={loadChangelog} className="btn-primary">Retry</button>
      </div>
    );
  }
  
  if (!loading && !error && changelog.length === 0) {
    return (
      <div className="changelog-sidebar-empty">
        <p>No recent updates</p>
      </div>
    );
  }

  return (
    <div className="changelog-sidebar-container">
      {changelog.map((entry, index) => renderChangelogEntry(entry, index))}
    </div>
  );
}
