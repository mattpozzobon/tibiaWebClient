// services/changelog-service.ts
export interface ChangelogEntry {
  id: string;
  timestamp: string;
  title?: string;
  content: string;
  author: {
    username: string;
    globalName?: string;
    avatarUrl?: string;
  };
  attachments?: { url: string; filename: string }[];
  reactions?: {
    emoji: {
      id: string | null;
      name: string;
    };
    count: number;
  }[];
}

export class ChangelogService {
  private cache: ChangelogEntry[] | null = null;
  private lastFetch = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

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
      const parts: string[] = [];
      let title = '';

      if (msg.content) {
        const lines = msg.content.split('\n');
        if (lines[0].startsWith('# ')) {
          title = lines[0].substring(2).trim();
          parts.push(...lines.slice(1));
        } else {
          parts.push(...lines);
        }
      }

      if (Array.isArray(msg.embeds)) {
        for (const embed of msg.embeds) {
          if (embed.title) parts.push(embed.title);
          if (embed.description) parts.push(embed.description);
        }
      }

      return {
        id: msg.id,
        timestamp: msg.timestamp,
        title,
        content: parts.join('\n\n') || '[no textual content]',
        author: {
          username: msg.author?.username || 'Unknown',
          globalName: msg.author?.global_name,
          avatarUrl: msg.author?.avatar
            ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
            : undefined,
        },
        attachments: Array.isArray(msg.attachments)
          ? msg.attachments.map((att: { url: any; filename: any; }) => ({ url: att.url, filename: att.filename }))
          : undefined,
        reactions: msg.reactions ?? [],
      };
    });

    this.cache = changelog;
    this.lastFetch = Date.now();
    return changelog;
  }

  formatChangelogEntry(entry: ChangelogEntry): string {
    const date = new Date(entry.timestamp);
    const imageUrls = new Set(
      (entry.attachments ?? [])
        .filter(att => att.url.match(/\.(png|jpe?g|gif|webp)$/i))
        .map(att => att.url)
    );
  
    const lines = entry.content
      .split('\n')
      .filter((line, i) => !(i === 0 && line.trim() === '')) // Skip possible blank after title
      .map(line => line.trimEnd()); // Trim trailing space
  
    const firstLine = lines[0] || '';
    const restLines = lines.slice(1).map(line => {
      if (line.startsWith('## ')) {
        return `<div class="changelog-subtitle">${line.slice(3).trim()}</div>`;
      }
      return `<div class="changelog-line">${line}</div>`;
    }).join('');
  
    const fullHtmlContent = lines.map(line => {
      if (line.startsWith('## ')) {
        return `<div class="changelog-subtitle">${line.slice(3).trim()}</div>`;
      }
      return `<div class="changelog-line">${line}</div>`;
    }).join('');
  
    const avatarImg = entry.author.avatarUrl
      ? `<img class="changelog-avatar" src="${entry.author.avatarUrl}" alt="${entry.author.username}" />`
      : '';
  
    const name = entry.author.globalName
      ? `${entry.author.username} <span class='global-name'>(${entry.author.globalName})</span>`
      : entry.author.username;
  
    const imageHTML = entry.attachments
      ?.filter(att => /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(att.url))
      .map(att => `<img class="changelog-image" src="${att.url}" alt="${att.filename}" />`)
      .join('') || '';
  
    const title = entry.title ? `<div class="changelog-title">${entry.title}</div>` : '';
    
    const thumbs = entry['reactions']?.filter(r =>
      r.emoji?.name === '👍🏻' || r.emoji?.name === '👎🏻'
    ) || [];
    
    const reactionsHTML = thumbs.length > 0
      ? `<div class="changelog-reactions">
          ${thumbs.map(r => `<span class="reaction">${r.emoji.name} ${r.count}</span>`).join(' ')}
         </div>`
      : '';
      
      return `
      <div class="changelog-entry">
        <div class="changelog-header">
          ${avatarImg}
          <div class="changelog-meta">
            ${title}
            <div class="changelog-meta-row">
              <span class="changelog-author">${name} ${date.toLocaleDateString('en-GB')} </span> 
            </div>
            ${reactionsHTML}
          </div>
        </div>
        <div class="changelog-message">
          ${fullHtmlContent}
          ${imageHTML}
        </div>
      </div>
    `;
  }
  
}
