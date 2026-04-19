#!/usr/bin/env node
/**
 * One-shot migration: copies existing images from /images/ and videos from /videos/
 * into the new /content/ folder structure with the new naming convention.
 *
 * Run once with: node scripts/migrate.mjs
 * After migration, the /images/ and /videos/ folders can remain for archival
 * (the build won't touch them) and the content lives in /content/ with the
 * conventional NN-LAYOUT[-VARIANT].ext names.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const IMAGES = path.join(ROOT, 'images');
const VIDEOS = path.join(ROOT, 'videos');
const CONTENT = path.join(ROOT, 'content');

async function mkdir(p) { await fs.mkdir(p, { recursive: true }); }
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
async function copy(src, dst) {
  if (!(await exists(src))) { console.warn(`  missing: ${src}`); return; }
  await mkdir(path.dirname(dst));
  await fs.copyFile(src, dst);
}
async function writeFile(p, content) {
  await mkdir(path.dirname(p));
  await fs.writeFile(p, content);
}

function img(n) { return path.join(IMAGES, n); }
function vid(n) { return path.join(VIDEOS, n); }

// -----------------------------------------------------------------------------
// HOME PAGE — 8 projects, sorted bottom-up.
//   Folder number = position on page (highest = top of page).
//
//   Top of page ──────────────────────────────
//   08-solanaps (newest / most prominent)
//   07-elqi
//   06-arsubvert
//   05-rampvlucht
//   04-midjourney
//   03-paulina
//   02-intersection
//   01-index-insight (bottom)
//   ──────────────────────────────────────────
// -----------------------------------------------------------------------------

const HOME_ABOUT = `---
name: Thanh Nguyen
links:
  - { label: Email, href: "mailto:mail@thaanh.com" }
  - { label: LinkedIn, href: "https://www.linkedin.com/in/thaanh/", newTab: true }
---
Digital product designer focusing on UX and UI, interactive prototyping, product design, and creative direction.

---

`;

const HOME_PROJECTS = [
  {
    folder: '08-solanaps',
    meta: {
      id: 'solanaps',
      title: 'Sunrise Simulation Device for Sleep Improvement',
      body: '2020\nSolanaps\nProduct Design and UI',
      button: { label: 'Explore Process', href: '/solanaps/' },
      linkHref: '/solanaps/',
    },
    files: [
      { name: '01-hh-l.png', src: img('thaanh-com-8938327487348.png') },
      { name: '02-hh-r.png', src: img('thaanh-com-982745024.png') },
    ],
  },
  {
    folder: '07-elqi',
    meta: {
      id: 'elqi',
      title: 'MVP app for mental wellbeing',
      body: '2023\nElqi\nUI and UX',
      button: { label: 'Explore Process', href: '/elqi/' },
      linkHref: '/elqi/',
    },
    files: [
      { name: '01-w-xl.png', src: img('thanh-com-23948813928.png') },
    ],
  },
  {
    folder: '06-arsubvert',
    meta: {
      id: 'arsubvert',
      title: 'Interactive AR Poster',
      body: '2021\nAR Subvert\nPhysical trackers and Augmented Reality\n\nAR Subvert is an Augmented Reality project utilizing Meta Spark AR. The project employs a physical poster as a marker, and the virtual object’s shape alters in relation to the distance from the poster.',
    },
    files: [
      { name: '01-hw-l.mp4',        src: vid('arsubvert-1.mp4') },
      { name: '02-hw-r-top.png',    src: img('thanh-com-1289748374.png') },
      { name: '03-hw-r-bottom.png', src: img('thanh-com-2384732871.png') },
    ],
  },
  {
    folder: '05-rampvlucht',
    meta: {
      id: 'rampvlucht',
      title: 'Immersive Reconstruction of an Airplane Crash',
      body: '2022\nRampvlucht\nSpatial Web Environment\n\nRampvlucht is an interactive online experience developed for KRO-NCRV, a Dutch television broadcaster, commemorating the 30th anniversary of the crash of El Al Flight 1862. This immersive digital portrayal takes users through a 3D storytelling journey, delving into the event and its consequences. Divided into four distinct acts, the experience incorporates archival content and audio to invite users to delve into the historical narrative and grapple with the complexities surrounding the investigation of the incident.',
    },
    files: [
      { name: '01-w-16-9.mp4', src: vid('rampvlucht-1.mp4') },
      { name: '02-hh-l.mp4',   src: vid('rampvlucht-2.mp4') },
      { name: '03-hh-r.mp4',   src: vid('rampvlucht-3.mp4') },
    ],
  },
  {
    folder: '04-midjourney',
    meta: {
      id: 'midjourney',
      title: 'Famous Novels seen through Midjourney',
      body: '2023\nImage Generation Self Project\nAI prompting\n\nThis experiment explores AI process automation possibilities in creating artworks and illustrations. Prompting chatGPT, I have collected AI-generated descriptions and used them in Midjourney to illustrate significant scenes from famous novels like Fahrenheit 451 by Ray Bradbury and Brief History of Time by Stephen Hawking. The goal was to look at the intersection of AI-generated text and AI-generated art, probing the potential for AI systems to work together creatively.',
    },
    files: [
      { name: '01-w-xl.png', src: img('thanh-com-23948723847.png') },
    ],
  },
  {
    folder: '03-paulina',
    meta: {
      id: 'paulina',
      title: 'Product Catalogue and Portfolio for Client',
      body: '2023\npaulinameyle.com\nFront End Development\n\nThe project involved creating a minimalist, visually-driven website for a client that doubles as an online shop to display her knit-wear collection. Focused on simplicity, the site features design that highlights her work and includes an easy-to-use table-based editor for content management.',
      button: { label: 'Open Website', href: 'https://paulinameyle.com/', newTab: true },
    },
    files: [
      { name: '01-w-xl.mp4', src: vid('paulina-1.mp4') },
      { name: '02-ww-l.mp4', src: vid('paulina-2.mp4') },
      { name: '03-ww-r.mp4', src: vid('paulina-3.mp4') },
    ],
  },
  {
    folder: '02-intersection',
    meta: {
      id: 'intersection',
      title: 'Alternative Vehicle Controls inspired by Bicycle Handlebars',
      body: '2021\nIntersection\nRapid Prototyping\n\nAn automotive control system prototype was created using Arduino and designed after bicycle handlebars. Acceleration is controlled by pulling the grips inward, braking by pushing them outward, and steering by tilting the handlebar, emulating intuitive cyclist’s motion.\n\nCollaborators\n---\nAndre Hieber\n(Hardware, Prototyping)\n\nIna Kaller\n(Testing, Photography)',
    },
    files: [
      { name: '01-w-xl.png',  src: img('thaanh-com-93178314183294.png') },
      { name: '02-w-xl.png',  src: img('thanh-com-1289748374.png') },
      { name: '03-qqq-1.png', src: img('thaanh-com-2837476521.png') },
      { name: '04-qqq-2.png', src: img('thaanh-com-2847576535.png') },
      { name: '05-qqq-3.png', src: img('thaanh-com-12874619832.png') },
      { name: '06-hh-l.mp4',  src: vid('intersection-1.mp4') },
      { name: '07-hh-r.mp4',  src: vid('intersection-2.mp4') },
    ],
  },
  {
    folder: '01-index-insight',
    meta: {
      id: 'index-insight',
      title: 'Interactive Investment Funds Visualization',
      body: '2020\nindex_insight\nData Visualisation\n\nIndex Insight is an interactive data visualization platform, designed to provide an overview of large index funds. It lets the users explore the complex financial sector through graphic illustrations, highlighting the proportions of various assets within these funds.',
    },
    files: [
      { name: '01-w-xl.mp4', src: vid('index-insight.mp4') },
    ],
  },
];

function metaMd(p) {
  const yaml = ['---'];
  yaml.push(`id: ${p.meta.id}`);
  yaml.push(`title: "${p.meta.title.replace(/"/g, '\\"')}"`);
  if (p.meta.button) {
    yaml.push('button:');
    yaml.push(`  label: "${p.meta.button.label}"`);
    yaml.push(`  href: "${p.meta.button.href}"`);
    if (p.meta.button.newTab) yaml.push('  newTab: true');
  }
  if (p.meta.linkHref) yaml.push(`linkHref: "${p.meta.linkHref}"`);
  yaml.push('---');
  yaml.push(p.meta.body);
  return yaml.join('\n') + '\n';
}

async function migrateHome() {
  console.log('\n== Migrating home ==');
  await writeFile(path.join(CONTENT, 'home', 'about.md'), HOME_ABOUT);
  for (const proj of HOME_PROJECTS) {
    const folder = path.join(CONTENT, 'home', proj.folder);
    await mkdir(folder);
    await writeFile(path.join(folder, 'meta.md'), metaMd(proj));
    for (const f of proj.files) {
      await copy(f.src, path.join(folder, f.name));
    }
    console.log(`  ✓ ${proj.folder} (${proj.files.length} files)`);
  }
}

// -----------------------------------------------------------------------------
// DETAIL PAGES — elqi.html and solanaps.html reconstructed from their source.
// Each block is either a media section (with a NN-LAYOUT name) or a NN-text.md.
// -----------------------------------------------------------------------------

const ELQI = {
  slug: 'elqi',
  metaHeader: {
    title: 'elqi',
    intro: 'elqi is a mental wellness app that uses breathing as a way to fight app addiction. Its design elements support both its cause and development.',
    bodyClass: 'body-3',
  },
  footerBody: '2023\nApp fostering mental wellbeing\nUI and UX\n\nElqi is an MVP app designed for improving mental wellbeing and supporting healthy relationships. It is intended to transform addictive app habits into mindful breathing exercises. The design is tailored for rapid development and scalability, ensuring a cohesive and adaptable design system.',
  blocks: [
    { name: '01-w.png',       src: img('thaanh-com-9832475.png') },
    { name: '02-h.png',       src: img('thaanh-com-019874834784.png') },
    { name: '03-text.md',     text: 'The app design is based on a strategy developed for a resource-strapped MVP. It relies on dominant, large numbers and titles rather than icons or visuals so that the app could be easily developed and tested.' },
    { name: '04-h.png',       src: img('thaanh-com-98347530493.png') },
    { name: '05-text.md',     text: 'Many standard UI components were used to make the development easier for the single swift developer on board.' },
    { name: '06-w.png',       src: img('thaanh-com-8372458749.png') },
    { name: '07-qqq-1.png',   src: img('thaanh-com-208475875.png') },
    { name: '08-qqq-2.png',   src: img('thaanh-com-9827347535.png') },
    { name: '09-qqq-3.png',   src: img('thaanh-com-983745345.png') },
    { name: '10-qqq-1.png',   src: img('thaanh-com-9874875345.png') },
    { name: '11-qqq-2.png',   src: img('thaanh-com-982745234r.png') },
    { name: '12-qqq-3.png',   src: img('thaanh-com-98237485435.png') },
    { name: '13-text.md',     text: 'The bloom design element reflects breathing rhythms and differs from method to method.' },
    { name: '14-w.png',       src: img('thaanh-com-98374589123.png') },
    { name: '15-text.md',     text: 'The process involved creating and animating symmetrical, blooming-like patterns in Figma. Designing in Figma components and using replication allowed to quickly and precisely modify elements.' },
    { name: '16-w.png',       src: img('thaanh-com-93284787235.png') },
    { name: '17-hhh-1.png',   src: img('thaanh-com-984751434.png') },
    { name: '18-hhh-2.png',   src: img('thaanh-com-91823743.png') },
    { name: '19-hhh-3.png',   src: img('thaanh-com-91834789345.png') },
    { name: '20-text.md',     text: 'The visuals for the onboarding screen were designed with consistency in mind. The circle leitmotif comes back and provides a scalable medium for expansion and marketing asset creation.' },
  ],
};

const SOLANAPS = {
  slug: 'solanaps',
  metaHeader: {
    title: 'solanaps',
    intro: 'Align your napping and sleeping sessions with your natural REM cycles with a head device that simulates sunrise conditions.',
    bodyClass: 'body-2',
  },
  footerBody: '2022\nSunrise simulation device for sleep improvement\nProduct Design and UI\n\nOur team’s research revealed a common preference for visual over auditory wake-up cues. Solanap took this preference and transferred it into a sleep improvement tool. A custom head device simulates sunrise with soft light and gently wakes up its user. It helps users align naps and night sleep with their natural REM cycles, leading to better sleep quality.\n\nCollaborators\n---\nAndré Hieber\n(Hardware & Prototype & Testing)',
  blocks: [
    { name: '01-w.png',       src: img('thaanh-com-203431085.png') },
    { name: '02-text.md',     text: 'Sleep is cyclical. To feel vitalised, it matters during which part of the cycle a person wakes up - ideally, when sleep is the lightest.' },
    { name: '03-hh-small-l.png', src: img('thaanh-com-2864659123.png') },
    { name: '04-hh-small-r.png', src: img('thaanh-com-13298479345.png') },
    { name: '05-text.md',     text: 'Our research showed that people prefer visual signals over audio ones for waking up. That is why our team came up with a design solution that replicates sunrise light. To optimise glaring reduction, we used a darker central spot within the gradient, which makes it more pleasant for the eye and optimises comfort.' },
    { name: '06-hh-small-l.png', src: img('thaanh-com-19820834958.png') },
    { name: '07-hh-small-r.png', src: img('thaanh-com-19238781234.png') },
    { name: '08-w.png',       src: img('thaanh-com-1398740359.png') },
    { name: '09-text.md',     text: 'We tested an early-stage proof of concept, where we disassembled a VR headset and repurposed it by attaching a phone to display the Wake Up sequence simulation through various prototyping methods, including video animation. This approach allowed for quick validation testing using the smartphone as an effective tool.' },
    { name: '10-hh-small-l.png', src: img('thaanh-com-109395834.png') },
    { name: '11-hh-small-r.png', src: img('thaanh-com-123987235.png') },
    { name: '12-w-xl.png',    src: img('thaanh-com-8544234750.png') },
    { name: '13-w-xl.png',    src: img('thaanh-com-29347988910239.png') },
    { name: '14-w-xl.mp4',    src: vid('solanaps-1.mp4') },
    { name: '15-h.png',       src: img('thaanh-com-2387632409.png') },
    { name: '16-w.png',       src: img('thaanh-com-374675877.png') },
    { name: '17-hh-small-l.mp4', src: vid('solanaps-2.mp4') },
    { name: '18-hh-small-r.mp4', src: vid('solanaps-3.mp4') },
    { name: '19-w.mp4',       src: vid('solanaps-4.mp4') },
    { name: '20-text.md',     text: 'After user testing, adjustments were made to the product design as the users had difficulties changing light intensity via the app prototype. A knob was added to the case so that the user could adjust the light haptically.' },
    { name: '21-hw-l.png',    src: img('thaanh.com-2347856487623.png') },
    { name: '22-hw-r.png',    src: img('thaanh-com-81237478634.png') },
    { name: '23-qqq-1.png',   src: img('thaanh-com-198378374.png') },
    { name: '24-qqq-2.png',   src: img('thaanh-com-193873184.png') },
    { name: '25-qqq-3.png',   src: img('thaanh-com-0234878435.png') },
    { name: '26-text.md',     text: 'Moving away from the prototyping stage, the head-device is intended to be folded and charged inside the case.' },
    { name: '27-h.png',       src: img('thaanh-com-9276476453254.png') },
    { name: '28-hh-l.png',    src: img('thaanh-com-824872943.png') },
    { name: '29-hh-r.png',    src: img('thaanh-com-982745024.png') },
  ],
};

function detailMetaMd(p) {
  const yaml = ['---'];
  yaml.push(`title: "${p.metaHeader.title.replace(/"/g, '\\"')}"`);
  yaml.push(`intro: "${p.metaHeader.intro.replace(/"/g, '\\"')}"`);
  yaml.push(`bodyClass: "${p.metaHeader.bodyClass}"`);
  yaml.push('---');
  yaml.push(p.footerBody);
  return yaml.join('\n') + '\n';
}

async function migrateDetails() {
  console.log('\n== Migrating details ==');
  for (const proj of [ELQI, SOLANAPS]) {
    const folder = path.join(CONTENT, 'details', proj.slug);
    await mkdir(folder);
    await writeFile(path.join(folder, 'meta.md'), detailMetaMd(proj));
    for (const b of proj.blocks) {
      const dst = path.join(folder, b.name);
      if (b.text !== undefined) {
        await writeFile(dst, b.text + '\n');
      } else {
        await copy(b.src, dst);
      }
    }
    console.log(`  ✓ details/${proj.slug} (${proj.blocks.length} blocks)`);
  }
}

async function main() {
  await migrateHome();
  await migrateDetails();
  console.log('\nMigration complete. You can now run `npm run build`.');
}

main().catch(err => { console.error(err); process.exit(1); });
