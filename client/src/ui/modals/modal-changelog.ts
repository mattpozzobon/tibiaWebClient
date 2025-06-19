import { ChangelogService } from '../../services/changelog-service';

export class ChangelogModal {
  private changelogService: ChangelogService;
  private debugElement: HTMLElement | null;
  private changelogContent: HTMLElement | null;

  constructor() {
    this.changelogService = new ChangelogService();
    this.debugElement = document.getElementById('changelog-debug');
    this.changelogContent = document.getElementById('changelog-content');

    if (this.changelogContent) {
      this.loadChangelog();
    }
  }

  private updateDebugInfo(message: string): void {
    if (this.debugElement) {
      this.debugElement.style.display = 'block';
      this.debugElement.textContent = `Debug: ${message}`;
    }
  }

  private async loadChangelog(): Promise<void> {
    if (!this.changelogContent) return;

    try {
      const changelog = await this.changelogService.fetchChangelog();

      if (changelog.length === 0) {
        this.changelogContent.innerHTML = '<div class="no-updates">No recent updates</div>';
        return;
      }

      const changelogHTML = changelog.map(entry => this.changelogService.formatChangelogEntry(entry)).join('');

      this.changelogContent.innerHTML = changelogHTML;
      this.updateDebugInfo('Changelog loaded successfully');
      this.attachEntryToggleEvents();

    } catch (error: any) {
      this.changelogContent.innerHTML = '<div class="error">Failed to load changelog</div>';
      this.updateDebugInfo(error.message || 'Unknown error occurred');
    }
  }

  private attachEntryToggleEvents(): void {
    if (!this.changelogContent) return;
  
    const entries = Array.from(this.changelogContent.querySelectorAll('.changelog-entry'));
  
    entries.forEach(entry => {
      entry.addEventListener('click', () => {
        const isExpanded = entry.classList.contains('expanded');
  
        entries.forEach(e => {
          e.classList.remove('expanded', 'hidden');
        });
  
        if (!isExpanded) {
          // Expand clicked, hide others
          entries.forEach(e => {
            if (e !== entry) e.classList.add('hidden');
          });
          entry.classList.add('expanded');
        }
      });
    });
  }
}
