// @vitest-environment jsdom
import { FormRenderer } from '../dist/index.js';
import { field, repeatable } from './fixtures/diagnostic-conformance.js';
import { runChoiceEventRendererTests } from './choice-events.fixture.jsx';
runChoiceEventRendererTests(FormRenderer, field, repeatable, 'React');
