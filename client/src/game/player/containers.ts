import Container from '../container';

export default class Containers {
  private containers: Map<number, Container> = new Map();

  constructor() {
    /*
     * Class Containers
     * Manages all player containers
     */
  }

  /**
   * Add a container to the containers map
   */
  addContainer(container: Container): void {
    this.containers.set(container.__containerId, container);
  }

  /**
   * Remove a container from the containers map by GUID
   */
  removeContainer(containerGuid: number): void {
    // Find container by GUID
    for (const [clientId, container] of this.containers.entries()) {
      if (container.id === containerGuid) {
        // Dispatch close event
        container.dispatchContainerClose();
        this.containers.delete(clientId);
        break;
      }
    }
  }

  /**
   * Get a container by ID (client ID or GUID)
   */
  getContainer(containerId: number): Container | null {
    // First try to find by client ID (legacy behavior)
    let container = this.containers.get(containerId);
    if (container) return container;
    
    // If not found, search by GUID
    for (const c of this.containers.values()) {
      if (c.id === containerId) {
        return c;
      }
    }
    
    return null;
  }

  /**
   * Get all containers
   */
  getAllContainers(): Container[] {
    return Array.from(this.containers.values());
  }

  /**
   * Check if a container exists
   */
  hasContainer(containerId: number): boolean {
    return this.containers.has(containerId);
  }

  /**
   * Get the number of open containers
   */
  getContainerCount(): number {
    return this.containers.size;
  }

  /**
   * Close all containers
   */
  closeAllContainers(): void {
    const containerIds = Array.from(this.containers.keys());
    containerIds.forEach(id => this.removeContainer(id));
  }

  /**
   * Clear all containers (for cleanup)
   */
  clear(): void {
    this.containers.clear();
  }
}
