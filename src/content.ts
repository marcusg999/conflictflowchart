import flowJson from '../content/flow.json';
import resourcesJson from '../content/resources.json';
import { parseFlow } from './schema/flow.ts';
import { parseResources } from './schema/resources.ts';

/**
 * The validated chart and resources. Parsing happens once, at app start.
 * If either file is malformed this throws, so the problem shows up in dev and
 * in CI (the tests import these same files) — never silently in front of a user.
 */
export const flow = parseFlow(flowJson);
export const resources = parseResources(resourcesJson);
