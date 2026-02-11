export interface TaggedElement {
  index: number;
  selector: string;
  innerText: string;
  outerHTML: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pageURL: string;
  timestamp: string;
  screenshot?: string; // base64 data URI, optional
}

type ClearListener = () => void;

class TagStore {
  private tags: Map<string, TaggedElement[]> = new Map();
  private context: Map<string, string> = new Map();
  private clearListeners: Set<ClearListener> = new Set();

  setTags(pageURL: string, elements: TaggedElement[], context?: string): void {
    if (elements.length === 0) {
      this.tags.delete(pageURL);
      this.context.delete(pageURL);
    } else {
      this.tags.set(pageURL, elements);
      if (context) {
        this.context.set(pageURL, context);
      } else {
        this.context.delete(pageURL);
      }
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

  getAllContext(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [url, ctx] of this.context.entries()) {
      result[url] = ctx;
    }
    return result;
  }

  clear(): void {
    this.tags.clear();
    this.context.clear();
    for (const listener of this.clearListeners) {
      listener();
    }
  }

  onClear(listener: ClearListener): () => void {
    this.clearListeners.add(listener);
    return () => this.clearListeners.delete(listener);
  }
}

export const store = new TagStore();
