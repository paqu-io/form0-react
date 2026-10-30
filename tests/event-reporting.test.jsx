// @vitest-environment jsdom
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';
import { runEventReportingTests } from './event-reporting.fixture.jsx';

runEventReportingTests(FormRenderer, field, repeatable, 'form0-react');
