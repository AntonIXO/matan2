import { lessons, ticketOrder } from '../src/lessons';

const site = 'https://math.devpins.org/s2/';
type SceneLink = { title: string; url: string; lesson: string; step: number };
const tickets: Record<string, SceneLink[]> = {};
for (const lesson of lessons) {
  for (const ticket of lesson.tickets) {
    const step = lesson.entrySteps?.[ticket] ?? 0;
    (tickets[ticket] ??= []).push({
      title: lesson.title,
      url: site + '#' + lesson.id + '?step=' + step,
      lesson: lesson.id,
      step,
    });
  }
}
const sorted = Object.fromEntries(
  Object.entries(tickets).sort(([a], [b]) => ticketOrder(a) - ticketOrder(b)),
);
await Bun.write(
  new URL('../../web-scenes.json', import.meta.url),
  JSON.stringify({ site, tickets: sorted }, null, 2) + '\n',
);
console.log(`Synced scene links for ${Object.keys(tickets).length} tickets`);
