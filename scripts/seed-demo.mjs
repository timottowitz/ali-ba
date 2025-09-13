#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // Try .env.local first, then fallback to .env
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
  dotenv.config();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.VITE_CONVEX_URL || process.env.CONVEX_DEPLOYMENT_URL;
  if (!url) {
    console.error('ERROR: Set NEXT_PUBLIC_CONVEX_URL or VITE_CONVEX_URL or CONVEX_DEPLOYMENT_URL');
    process.exit(1);
  }
  console.log('Using Convex deployment:', url);
  const client = new ConvexHttpClient(url);
  try {
    const res = await client.mutation(api.seed.createScrewManufacturerDemo, {});
    console.log('Seeded:', res);
  } catch (err) {
    console.error('Seeding failed:', err?.response?.data || err?.message || err);
    process.exit(1);
  }
}

main();
