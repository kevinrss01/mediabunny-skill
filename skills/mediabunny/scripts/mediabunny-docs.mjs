#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cacheDirectory = process.env.MEDIABUNNY_DOCS_CACHE
  ? path.resolve(process.env.MEDIABUNNY_DOCS_CACHE)
  : path.join(os.tmpdir(), 'mediabunny-docs');

const documents = [
  {
    name: 'llms.txt',
    url: 'https://mediabunny.dev/llms.txt',
  },
  {
    name: 'llms-full.txt',
    url: 'https://mediabunny.dev/llms-full.txt',
  },
  {
    name: 'mediabunny.d.ts',
    url: 'https://mediabunny.dev/mediabunny.d.ts',
  },
  {
    name: 'npm-latest.json',
    url: 'https://registry.npmjs.org/mediabunny/latest',
  },
];

const usage = `Usage:
  mediabunny-docs.mjs cache
  mediabunny-docs.mjs refresh
  mediabunny-docs.mjs search <text-or-regex>
  mediabunny-docs.mjs symbol <ExportName>

Cache directory: ${cacheDirectory}`;

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'codex-mediabunny-skill',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
};

const documentPath = (name) => path.join(cacheDirectory, name);

const refreshCache = async () => {
  await mkdir(cacheDirectory, { recursive: true });

  await Promise.all(documents.map(async (document) => {
    const content = await fetchText(document.url);
    await writeFile(documentPath(document.name), content, 'utf8');
  }));

  console.log(`Cached Mediabunny docs in ${cacheDirectory}`);
};

const ensureCache = async () => {
  const hasAllDocuments = documents.every((document) => existsSync(documentPath(document.name)));
  if (!hasAllDocuments) {
    await refreshCache();
  }
};

const readCachedDocuments = async () => {
  await ensureCache();

  return Promise.all(documents.map(async (document) => ({
    name: document.name,
    content: await readFile(documentPath(document.name), 'utf8'),
  })));
};

const buildSearchPattern = (rawPattern) => {
  try {
    return new RegExp(rawPattern, 'i');
  } catch {
    return new RegExp(rawPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
};

const searchDocuments = async (rawPattern) => {
  if (!rawPattern) {
    throw new Error('Missing search pattern.');
  }

  const pattern = buildSearchPattern(rawPattern);
  const cachedDocuments = await readCachedDocuments();
  let matchCount = 0;

  for (const document of cachedDocuments) {
    const lines = document.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matchCount += 1;
        console.log(`${document.name}:${index + 1}: ${line.slice(0, 240)}`);
      }
    });
  }

  if (matchCount === 0) {
    console.log('No matches.');
  }
};

const printWindow = (content, lineIndex, radius = 24) => {
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, lineIndex - radius);
  const end = Math.min(lines.length, lineIndex + radius + 1);

  for (let index = start; index < end; index += 1) {
    const lineNumber = String(index + 1).padStart(5, ' ');
    console.log(`${lineNumber}: ${lines[index]}`);
  }
};

const showSymbol = async (symbolName) => {
  if (!symbolName) {
    throw new Error('Missing symbol name.');
  }

  const cachedDocuments = await readCachedDocuments();
  const declarationDocument = cachedDocuments.find((document) => document.name === 'mediabunny.d.ts');
  const guideDocument = cachedDocuments.find((document) => document.name === 'llms-full.txt');

  if (!declarationDocument || !guideDocument) {
    throw new Error('Cache is missing required documents.');
  }

  const escapedSymbolName = symbolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declarationPattern = new RegExp(
    `export declare (class|type|const|function|abstract class) ${escapedSymbolName}\\b|export \\{ .*\\b${escapedSymbolName}\\b.* \\}`,
  );
  const declarationLines = declarationDocument.content.split(/\r?\n/);
  const declarationIndex = declarationLines.findIndex((line) => declarationPattern.test(line));

  if (declarationIndex !== -1) {
    console.log(`\n# mediabunny.d.ts: ${symbolName}\n`);
    printWindow(declarationDocument.content, declarationIndex, 36);
  } else {
    console.log(`No direct declaration match for ${symbolName} in mediabunny.d.ts.`);
  }

  const headingPattern = new RegExp(`^#{1,4} .*\\b${escapedSymbolName}\\b`, 'i');
  const guideLines = guideDocument.content.split(/\r?\n/);
  const headingIndex = guideLines.findIndex((line) => headingPattern.test(line));

  if (headingIndex !== -1) {
    console.log(`\n# llms-full.txt heading: ${symbolName}\n`);
    printWindow(guideDocument.content, headingIndex, 24);
    return;
  }

  const bodyPattern = new RegExp(`\\b${escapedSymbolName}\\b`, 'i');
  const bodyIndex = guideLines.findIndex((line) => bodyPattern.test(line));
  if (bodyIndex !== -1) {
    console.log(`\n# llms-full.txt first mention: ${symbolName}\n`);
    printWindow(guideDocument.content, bodyIndex, 18);
  }
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage);
    return;
  }

  if (command === 'cache' || command === 'refresh') {
    await refreshCache();
    return;
  }

  if (command === 'search') {
    await searchDocuments(args.join(' '));
    return;
  }

  if (command === 'symbol') {
    await showSymbol(args[0]);
    return;
  }

  throw new Error(`Unknown command: ${command}\n${usage}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
