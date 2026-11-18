// One-off upgrade for databases created before the October 2026 redesign:
//  • adds the new Manifesto section straight after the hero
//  • applies the "Made to stand apart" campaign copy to the hero and new-drop sections,
//    but only where the old demo wording is still in place (owner edits are kept)
// Safe to run more than once.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { homepageSections } from './seed-data.js';

const prisma = new PrismaClient();
const OLD_HERO_HEADING = 'The New Collection';
const OLD_DROP_EYEBROW = 'New drop';

const main = async () => {
  const sections = await prisma.homepageSection.findMany({ orderBy: { position: 'asc' } });

  if (!sections.some((section) => section.type === 'MANIFESTO')) {
    const content = homepageSections.find((section) => section.type === 'MANIFESTO').content;
    const created = await prisma.homepageSection.create({ data: { type: 'MANIFESTO', content, enabled: true } });
    const heroIndex = sections.findIndex((section) => section.type === 'HERO');
    const order = [...sections];
    order.splice(heroIndex + 1, 0, created);
    await prisma.$transaction(order.map((section, position) => prisma.homepageSection.update({ where: { id: section.id }, data: { position } })));
    console.log('Added the Manifesto section after the hero.');
  }

  const hero = sections.find((section) => section.type === 'HERO');
  if (hero?.content?.heading === OLD_HERO_HEADING) {
    const copy = homepageSections.find((section) => section.type === 'HERO').content;
    await prisma.homepageSection.update({
      where: { id: hero.id },
      data: {
        content: {
          ...hero.content,
          eyebrow: copy.eyebrow,
          heading: copy.heading,
          subheading: copy.subheading,
          ctaLabel: copy.ctaLabel,
        },
      },
    });
    console.log('Updated the hero copy.');
  }

  const drop = sections.find((section) => section.type === 'NEW_DROP');
  if (drop?.content?.eyebrow === OLD_DROP_EYEBROW) {
    await prisma.homepageSection.update({
      where: { id: drop.id },
      data: { content: { ...drop.content, eyebrow: 'Drop 001 — The Collection' } },
    });
    console.log('Updated the new-drop label.');
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
