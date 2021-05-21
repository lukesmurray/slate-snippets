import { Variable, VariableResolver } from '../snippetParser/snippetParser';

export class CompositeSnippetVariableResolver implements VariableResolver {
  constructor(private readonly _delegates: VariableResolver[]) {
    //
  }

  resolve(variable: Variable): string | undefined {
    for (const delegate of this._delegates) {
      let value = delegate.resolve(variable);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }
}
