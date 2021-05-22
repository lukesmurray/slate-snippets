import Ajv from 'ajv';
import { snippetJSONSchema } from './snippetJsonSchema';

const ajv = new Ajv();

export const parseJSONSnippetSpecification = (
  spec: string
): Record<string, string> | undefined => {
  try {
    const specObj = JSON.parse(spec);
    const valid = ajv.validate(snippetJSONSchema, specObj);
    if (!valid) {
      throw new Error(ajv.errors?.toString());
    }

    const result: Record<string, string> = {};

    for (let [snippetName, se] of Object.entries(specObj)) {
      const snippetEntry = se as any;
      const prefixes =
        typeof snippetEntry.prefix === 'string'
          ? [snippetEntry.prefix]
          : snippetEntry.prefix;
      const body =
        typeof snippetEntry.body === 'string'
          ? snippetEntry.body
          : snippetEntry.body.join('\n');

      for (let prefix of prefixes) {
        result[prefix] = body;
      }
    }
    return result;
  } catch (e) {
    return undefined;
  }
};
