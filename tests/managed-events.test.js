import assert from 'node:assert/strict';
import { it } from 'vitest';
import { eventConformance } from './fixtures/event-conformance.js';

eventConformance(it, assert);

import { messageBoxConformance } from './fixtures/messagebox-conformance.js';
messageBoxConformance(it, assert);
