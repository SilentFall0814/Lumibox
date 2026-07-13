import type { UndoEntry, UndoResult } from '../../shared/types';

export class UndoStack {
  private entries: UndoEntry[] = [];

  push(entry: UndoEntry): void {
    this.entries.push(entry);
    if (this.entries.length > 50) this.entries.shift();
  }

  canUndo(): boolean {
    return this.entries.length > 0;
  }

  undo(): UndoResult {
    const entry = this.entries.pop();
    if (!entry) return { ok: false, error: '没有可撤销的操作' };
    return { ok: true, undone: entry };
  }

  clear(): void {
    this.entries = [];
  }

  peek(): UndoEntry | null {
    return this.entries[this.entries.length - 1] ?? null;
  }
}

export const undoStack = new UndoStack();
