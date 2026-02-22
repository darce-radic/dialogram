const COLORS = [
  "#958DF1",
  "#F98181",
  "#FBBC88",
  "#FAF594",
  "#70CFF8",
  "#94FADB",
  "#B9F18D",
  "#E8A0BF",
  "#C4B5FD",
  "#67E8F9",
  "#FCA5A5",
  "#FDE68A",
];

export function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
