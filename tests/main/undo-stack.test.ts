import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UndoStack } from '../../src/main/services/undo-stack';
import type { UndoEntry } from '../../src/shared/types';

describe('UndoStack', () => {
  let stack: UndoStack;

  beforeEach(() => {
    stack = new UndoStack();
  });

  it('push 后 canUndo 为 true', () => {
    expect(stack.canUndo()).toBe(false);
    stack.push({ type: 'move', data: { moves: [{ from: 'a', to: 'b' }] } });
    expect(stack.canUndo()).toBe(true);
  });

  it('undo 返回最后一条并弹出', () => {
    const entry: UndoEntry = { type: 'move', data: { moves: [{ from: 'a', to: 'b' }] } };
    stack.push(entry);
    const result = stack.undo();
    expect(result.ok).toBe(true);
    expect(result.undone).toEqual(entry);
    expect(stack.canUndo()).toBe(false);
  });

  it('空栈 undo 返回失败', () => {
    const result = stack.undo();
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('LIFO 顺序', () => {
    stack.push({ type: 'move', data: { moves: [{ from: 'a', to: 'b' }] } });
    stack.push({ type: 'delete', data: { trashIds: [1] } });
    const r = stack.undo();
    expect(r.undone?.type).toBe('delete');
  });
});
