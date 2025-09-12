import BinaryHeap from "../utils/binary-heap";
import HeapEvent from "../utils/heap-event";

export default class EventQueue {
 
  __internalDelta: number;
  private __start: number;
  public heap: BinaryHeap<HeapEvent>;

  constructor() {
    this.__internalDelta = 0;
    this.__start = performance.now();
    this.heap = new BinaryHeap<HeapEvent>();
  }

  public getFrame(): number {
    return Math.floor(this.__internalDelta / window.gameClient.getTickInterval());
  }

  public tick(): void {
    // Update the internal time delta.
    this.__update();
  
    while (true) {
      // If there are no more items in the queue, exit.
      if (this.heap.content.length === 0) {
        return;
      }
  
      // If the next event's scheduled frame is greater than the current delta, exit.
      if (this.heap.content[0].__f > this.__internalDelta) {
        return;
      }
  
      // Pop the next event from the heap.
      const nextEvent = this.heap.pop();
      if (!nextEvent || nextEvent.cancelled) {
        continue;
      }
  
      // Execute the callback for the event.
      nextEvent.callback();
    }
  }
  

  public addEvent(callback: () => void, when: number): HeapEvent | void {
    // Convert the "when" (in ticks) to an absolute frame using the tick interval.
    when = Math.floor(Math.max(when, 0) * window.gameClient.getTickInterval());
    return this.__addEvent(callback, when);
  }

  public addEventMs(callback: () => void, ms: number): HeapEvent | void {
    // Convert milliseconds to ticks (using the tick interval).
    const ticks = Math.floor(ms / window.gameClient.getTickInterval());
    return this.addEvent(callback, ticks);
  }

  private __update(): void {
    this.__internalDelta = performance.now() - this.__start;
  }

  private __isValidFrame(frame: number): boolean {
    return frame >= 0 && !isNaN(frame);
  }

  private __addEvent(callback: () => void, frame: number): HeapEvent | void {
    if (!this.__isValidFrame(frame)) {
      console.error("Could not add event with an invalid frame.");
      return;
    }
    const eventItem = new HeapEvent(callback, frame);
    this.heap.push(eventItem);
    return eventItem;
  }
}
