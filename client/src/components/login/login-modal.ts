import { ChangelogService, ChangelogEntry } from '../../services/changelog-service';

export class LoginModal {
  private changelogService = new ChangelogService();
  private debugElement     = document.getElementById('changelog-debug');
  private changelogContent = document.getElementById('changelog-content');

  constructor() {
    console.log('LoginModal: Constructor called');

    if (!this.changelogContent) {
      console.error('LoginModal: #changelog-content element not found!');
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
    console.log('LoginModal: Loading changelog…');

    try {
      const changelog: ChangelogEntry[] = await this.changelogService.fetchChangelog();
      console.log('LoginModal: Changelog entries received:', changelog.length);

      if (!changelog.length) {
        this.changelogContent!.innerHTML = '<div class="no-updates">No recent updates</div>';
        return;
      }

      this.changelogContent!.innerHTML = changelog
        .map(entry => this.changelogService.formatChangelogEntry(entry))
        .join('');

      this.updateDebugInfo('Changelog loaded successfully');
    } catch (err: any) {
      console.error('LoginModal: Error loading changelog:', err);
      this.changelogContent!.innerHTML = '<div class="error">Failed to load changelog</div>';
      this.updateDebugInfo(err?.message ?? 'Unknown error');
    }
  }
}