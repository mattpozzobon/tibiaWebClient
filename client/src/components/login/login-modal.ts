import { ChangelogService } from '../../services/changelog-service';

export class LoginModal {
  private changelogService: ChangelogService;
  private debugElement: HTMLElement | null;
  private changelogContent: HTMLElement | null;

  constructor() {
    this.changelogService = new ChangelogService();
    this.debugElement = document.getElementById('changelog-debug');
    this.changelogContent = document.getElementById('changelog-content');

    if (!this.changelogContent) {
      return;
    }

    this.loadChangelog();
  }

  private updateDebugInfo(message: string): void {
    if (this.debugElement) {
      this.debugElement.style.display = 'block';
      this.debugElement.textContent   = `Debug: ${message}`;
    }
  }

  private async loadChangelog(): Promise<void> {
    if (!this.changelogContent) {
      return;
    }

    try {
      const changelog = await this.changelogService.fetchChangelog();

      if (changelog.length === 0) {
        this.changelogContent.innerHTML = '<div class="no-updates">No recent updates</div>';
        return;
      }

      const changelogHTML = changelog
        .map((entry) => {
          const date = new Date(entry.timestamp).toLocaleDateString();
          return `
            <div class="changelog-entry">
              <div class="changelog-date">${date}</div>
              <div class="changelog-message">${entry.content}</div>
            </div>
          `;
        })
        .join('');

      this.changelogContent.innerHTML = changelogHTML;
      this.updateDebugInfo('Changelog loaded successfully');
    } catch (error: any) {
      this.changelogContent.innerHTML = '<div class="error">Failed to load changelog</div>';
      this.updateDebugInfo(error.message || 'Unknown error occurred');
    }
  }
}