export default class BinaryHeap<T extends { __f: number }> {
  public content: T[];

  constructor() {
    this.content = [];
  }

  public push(element: T): void {
    // Add the new element to the end of the array.
    this.content.push(element);
    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  }

  public pop(): T | undefined {
    // Store the first element so we can return it later.
    const result = this.content[0];
    // Get the element at the end of the array.
    const end = this.content.pop();
    // If there are any elements left, put the end element at the start, and let it bubble up.
    if (this.content.length > 0 && end !== undefined) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  }

  public remove(node: T): void {
    const length = this.content.length;
    // Search for the node to remove.
    for (let i = 0; i < length; i++) {
      if (this.content[i] !== node) {
        continue;
      }
      // Remove the element and fill the gap as in pop().
      const end = this.content.pop();
      if (i === length - 1 || end === undefined) {
        break;
      }
      this.content[i] = end;
      this.bubbleUp(i);
      this.sinkDown(i);
      break;
    }
  }

  public size(): number {
    return this.content.length;
  }

  public rescoreElement(node: T): void {
    const index = this.content.indexOf(node);
    if (index !== -1) {
      this.sinkDown(index);
    }
  }

  public sinkDown(n: number): void {
    const element = this.content[n];
    while (n > 0) {
      // Compute the parent's index.
      const parentN = ((n + 1) >> 1) - 1;
      const parent = this.content[parentN];
      // If the parent's score is less than or equal, break.
      if (element.__f >= parent.__f) {
        break;
      }
      // Otherwise, swap the element with its parent.
      this.content[parentN] = element;
      this.content[n] = parent;
      n = parentN;
    }
  }

  public bubbleUp(n: number): void {
    const length = this.content.length;
    const element = this.content[n];
    const elemScore = element.__f;
  
    while (true) {
      const child2N = (n + 1) << 1; // index of the right child
      const child1N = child2N - 1;   // index of the left child
      let swap: number | null = null;
      let child1Score: number = Infinity; // Initialize to Infinity
  
      if (child1N < length) {
        const child1 = this.content[child1N];
        child1Score = child1.__f;
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }
  
      if (child2N < length) {
        const child2 = this.content[child2N];
        const child2Score = child2.__f;
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }
  
      if (swap === null) {
        break;
      }
  
      // Swap element with the smaller child.
      this.content[n] = this.content[swap];
      this.content[swap] = element;
      n = swap;
    }
  }
  
}
