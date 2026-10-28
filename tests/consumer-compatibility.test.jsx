// @vitest-environment jsdom
import { FormRenderer } from '../dist/index.js';
import { runConsumerCompatibility } from './consumer-compatibility.fixture.jsx';
runConsumerCompatibility(FormRenderer, 'React');
