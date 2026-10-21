import assert from 'node:assert/strict';
import { it } from 'vitest';
import { eventConformance } from './fixtures/event-conformance.js';

eventConformance(it, assert);
