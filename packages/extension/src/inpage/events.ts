/**
 * Simple EventEmitter for the injected provider
 */

type EventCallback = (...args: unknown[]) => void;

export class EventEmitter {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return this;
  }

  once(event: string, callback: EventCallback): this {
    const onceCallback = (...args: unknown[]) => {
      this.off(event, onceCallback);
      callback(...args);
    };
    return this.on(event, onceCallback);
  }

  off(event: string, callback: EventCallback): this {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
    return this;
  }

  removeListener(event: string, callback: EventCallback): this {
    return this.off(event, callback);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const callbacks = this.events.get(event);
    if (!callbacks || callbacks.size === 0) {
      return false;
    }

    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });

    return true;
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.size ?? 0;
  }

  listeners(event: string): EventCallback[] {
    return Array.from(this.events.get(event) ?? []);
  }

  addListener(event: string, callback: EventCallback): this {
    return this.on(event, callback);
  }
}
