export const snippetJSONSchema = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    properties: {
      prefix: {
        description:
          'The prefix to use when selecting the snippet in intellisense',
        type: ['string', 'array'],
      },
      body: {
        description:
          'The snippet content. Use `$1`, `${1:defaultText}` to define cursor positions, use `$0` for the final cursor position. Insert variable values with `${varName}` and `${varName:defaultText}`, e.g. `This is file: $TM_FILENAME`.',
        type: ['string', 'array'],
        items: {
          type: 'string',
        },
      },
      description: {
        description: 'The snippet description.',
        type: ['string', 'array'],
      },
    },
  },
};
