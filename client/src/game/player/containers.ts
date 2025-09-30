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
   * Remove a container from the containers map
   */
  removeContainer(containerId: number): void {
    const container = this.containers.get(containerId);
    if (container) {
      // Dispatch close event
      container.dispatchContainerClose();
      this.containers.delete(containerId);
    }
  }

  /**
   * Get a container by ID
   */
  getContainer(containerId: number): Container | null {
    return this.containers.get(containerId) || null;
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
