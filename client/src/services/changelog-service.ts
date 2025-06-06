// services/changelog-service.ts

export interface ChangelogEntry {
  id: string;
  content: string;
  timestamp: string;
}

export class ChangelogService {
  private cache: ChangelogEntry[] | null = null;
  private lastFetch = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 min

  /** Fetches last 10 messages from your /api/changelog proxy, caches for 5m */
  async fetchChangelog(): Promise<ChangelogEntry[]> {
    if (this.cache && Date.now() - this.lastFetch < this.CACHE_DURATION) {
      return this.cache;
    }

    const resp = await fetch('/api/changelog');
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Changelog proxy error: ${resp.status} ${txt}`);
    }

    const messages: any[] = await resp.json();
    const changelog = messages.map(msg => {
      const parts: string[] = [];

      // 1) plain-text content
      if (msg.content) {
        parts.push(msg.content);
      }

      // 2) any embeds (title + description)
      if (Array.isArray(msg.embeds)) {
        for (const embed of msg.embeds) {
          if (embed.title)       parts.push(embed.title);
          if (embed.description) parts.push(embed.description);
        }
      }

      // 3) attachments (just link to them)
      if (Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.url) parts.push(att.url);
        }
      }

      return {
        id:        msg.id,
        timestamp: msg.timestamp,
        content:   parts.join('\n\n') || '[no textual content]',
      };
    });

    this.cache     = changelog;
    this.lastFetch = Date.now();
    return changelog;
  }

  /** Renders a single entry as HTML */
  formatChangelogEntry(entry: ChangelogEntry): string {
    const date = new Date(entry.timestamp);
    // simple linkify of any URLs
    const htmlContent = entry.content.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    );

    return `
      <div class="changelog-entry">
        <div class="changelog-date">
          ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
        </div>
        <div class="changelog-message">${htmlContent}</div>
      </div>
    `;
  }
}
