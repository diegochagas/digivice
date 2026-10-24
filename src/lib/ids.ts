/** Short random id for quests, rewards and todos. Example: newId() → "k3f9ax". */
export function newId(): string {
  return Math.random().toString(36).slice(2, 8)
}
