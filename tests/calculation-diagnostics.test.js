import { it } from 'vitest';
import assert from 'node:assert/strict';
import { diagnosticConformance } from './fixtures/diagnostic-conformance.js';
diagnosticConformance(it, assert);
