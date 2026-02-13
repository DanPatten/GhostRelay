export interface TaggedElement {
  index: number;
  type?: "tag" | "snip";
  selector?: string;
  innerText?: string;
  outerHTML?: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pageURL: string;
  timestamp: string;
  screenshot?: string; // base64 data URI, optional
  annotation?: string;
  tagName?: string;
  attributes?: Record<string, string>;
  parentContext?: string[];
  pageTitle?: string;
  scrollPosition?: { x: number; y: number };
  computedStyles?: Record<string, string>;
  sourceInfo?: {
    component?: {
      framework: string;
      fileName: string;
      lineNumber?: number;
      columnNumber?: number;
      componentName?: string;
    };
    stylesheets?: {
      href: string;
      sourceFiles?: string[];
    }[];
  };
}

type ClearListener = () => void;
type EventListener = (event: string, data: unknown) => void;

class TagStore {
  private tags: Map<string, TaggedElement[]> = new Map();
  private clearListeners: Set<ClearListener> = new Set();
  private eventListeners: Set<EventListener> = new Set();
  private processingIndices: Set<number> = new Set();

  setTags(pageURL: string, elements: TaggedElement[]): void {
    if (elements.length === 0) {
      this.tags.delete(pageURL);
    } else {
      this.tags.set(pageURL, elements);
    }
  }

  getAllTags(): TaggedElement[] {
    const all: TaggedElement[] = [];
    for (const elements of this.tags.values()) {
      all.push(...elements);
    }
    return all;
  }

  getTagsByURL(pageURL: string): TaggedElement[] {
    return this.tags.get(pageURL) ?? [];
  }

  getTagCount(): number {
    let count = 0;
    for (const elements of this.tags.values()) {
      count += elements.length;
    }
    return count;
  }

  getPageURLs(): string[] {
    return Array.from(this.tags.keys());
  }

  markProcessing(indices: number[]): void {
    for (const i of indices) {
      this.processingIndices.add(i);
    }
    this.emitEvent("processing", { indices });
  }

  removeByIndices(indices: number[]): TaggedElement[] {
    const removed: TaggedElement[] = [];
    const indexSet = new Set(indices);
    for (const [pageURL, elements] of this.tags.entries()) {
      const kept: TaggedElement[] = [];
      for (const el of elements) {
        if (indexSet.has(el.index)) {
          removed.push(el);
        } else {
          kept.push(el);
        }
      }
      if (kept.length === 0) {
        this.tags.delete(pageURL);
      } else if (kept.length !== elements.length) {
        this.tags.set(pageURL, kept);
      }
    }
    for (const i of indices) {
      this.processingIndices.delete(i);
    }
    this.emitEvent("remove", { indices });
    return removed;
  }

  clear(): void {
    this.tags.clear();
    this.processingIndices.clear();
    for (const listener of this.clearListeners) {
      listener();
    }
  }

  onClear(listener: ClearListener): () => void {
    this.clearListeners.add(listener);
    return () => this.clearListeners.delete(listener);
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emitEvent(event: string, data: unknown): void {
    for (const listener of this.eventListeners) {
      listener(event, data);
    }
  }
}

export const store = new TagStore();
