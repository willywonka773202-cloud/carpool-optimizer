function inRange(arr: unknown[], index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < arr.length;
}

export function moveItemUp<T>(arr: T[], index: number): T[] {
  if (!inRange(arr, index) || index === 0) return [...arr];
  const next = [...arr];
  [next[index - 1], next[index]] = [next[index], next[index - 1]];
  return next;
}

export function moveItemDown<T>(arr: T[], index: number): T[] {
  if (!inRange(arr, index) || index === arr.length - 1) return [...arr];
  const next = [...arr];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];
  return next;
}

export function duplicateItem<T>(arr: T[], index: number): T[] {
  if (!inRange(arr, index)) return [...arr];
  const copy = arr[index];
  const next = [...arr];
  next.splice(index + 1, 0, copy);
  return next;
}

export function removeItem<T>(arr: T[], index: number): T[] {
  if (!inRange(arr, index)) return [...arr];
  const next = [...arr];
  next.splice(index, 1);
  return next;
}
