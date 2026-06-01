import type { Coord } from "./orsTypes";

export type StopAssignment = {
  address: string;
  riderName: string | null;
  coord: Coord | null;
};

export function collectStopAssignments(
  stops: string[],
  riderNames: (string | null)[] = [],
  coords: (Coord | null)[] = []
): StopAssignment[] {
  return stops.flatMap((stop, index) => {
    const address = stop.trim();
    if (!address) return [];
    return [
      {
        address,
        riderName: riderNames[index] ?? null,
        coord: coords[index] ?? null,
      },
    ];
  });
}

export function matchAssignmentsInOrder(
  orderedStops: string[],
  assignments: StopAssignment[]
): StopAssignment[] {
  const queues = new Map<string, StopAssignment[]>();

  assignments.forEach((assignment) => {
    const key = assignment.address.trim();
    if (!key) return;
    const queue = queues.get(key) ?? [];
    queue.push(assignment);
    queues.set(key, queue);
  });

  return orderedStops.flatMap((stop) => {
    const key = stop.trim();
    const queue = queues.get(key);
    const next = queue?.shift();
    return next ? [next] : [];
  });
}
