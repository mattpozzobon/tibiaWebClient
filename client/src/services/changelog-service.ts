export interface ChangelogEntry {
  id: string;
  timestamp: string;
  content: string;
  author: {
    username: string;
    avatarUrl?: string;
  };
  attachments?: { url: string; filename: string }[];
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
    const changelog: ChangelogEntry[] = messages.map(msg => {
      // Gather content, embeds, attachments as before
      const parts: string[] = [];
      if (msg.content) parts.push(msg.content);
      if (Array.isArray(msg.embeds)) {
        for (const embed of msg.embeds) {
          if (embed.title) parts.push(embed.title);
          if (embed.description) parts.push(embed.description);
        }
      }
      if (Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.url) parts.push(att.url);
        }
      }

      return {
        id: msg.id,
        timestamp: msg.timestamp,
        content: parts.join('\n\n') || '[no textual content]',
        author: {
          username: msg.author?.username || 'Unknown',
          avatarUrl: msg.author?.avatar
            ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
            : undefined,
        },
        attachments: Array.isArray(msg.attachments)
          ? msg.attachments.map((att: { url: any; filename: any; }) => ({ url: att.url, filename: att.filename }))
          : undefined,
      };
    });

    this.cache = changelog;
    this.lastFetch = Date.now();
    return changelog;
  }

  /** Renders a single entry as HTML, including author and avatar */
  formatChangelogEntry(entry: ChangelogEntry): string {
    const date = new Date(entry.timestamp);
    // sanitize and linkify URLs
    const htmlContent = entry.content.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    );

    const avatarImg = entry.author.avatarUrl
      ? `<img class="changelog-avatar" src="${entry.author.avatarUrl}" alt="${entry.author.username}" />`
      : '';

    return `
      <div class="changelog-entry">
        <div class="changelog-header">
          ${avatarImg}
          <span class="changelog-author">${entry.author.username}</span>
          <span class="changelog-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
        </div>
        <div class="changelog-message">${htmlContent}</div>
      </div>
    `;
  }
}