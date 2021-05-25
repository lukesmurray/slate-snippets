import { Editor, Range, RangeRef, Transforms } from 'slate';
import { isPointAtBlockStart } from './slateHelpers';
import {
  Placeholder,
  SnippetParser,
  TextmateSnippet,
  VariableResolver,
} from './snippetParser/snippetParser';
import { CompositeSnippetVariableResolver } from './variableResolvers/CompositeSnippetVariableResolver';

export class SnippetSession {
  private _placeholders: Placeholder[];
  private _snippet: TextmateSnippet;
  private _placeholderIdx: number;
  private _placeholderRanges?: Map<Placeholder, RangeRef>;
  private _editor: Editor;
  private _range?: RangeRef;

  constructor(editor: Editor, text: string, resolvers: VariableResolver[]) {
    this._snippet = new SnippetParser().parse(text, true, true);
    this._snippet.resolveVariables(
      new CompositeSnippetVariableResolver([...resolvers])
    );
    this._editor = editor;
    this._placeholders = this._snippet.placeholders;
    this._placeholderIdx = -1;

    // based on https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/snippet/snippetSession.ts especially code in OneSnippet
  }

  public insert(range: Range) {
    this._range = Editor.rangeRef(this._editor, range);
    this._placeholders.sort(Placeholder.compareByIndex);
    this._placeholderRanges = new Map();
    this._placeholderIdx = -1;
    Transforms.insertFragment(this._editor, this._snippet.toFragment(), {
      at: this._range.current!,
    });

    this._placeholders.forEach(placeholder => {
      const placeholderOffset = this._snippet.offsetFragment(placeholder);
      const placeholderLen = this._snippet.fullLenFragment(placeholder);
      const placeholderStartOffset = placeholderOffset;
      const placeholderEndOffset = placeholderOffset + placeholderLen;

      let anchor =
        placeholderStartOffset === 0
          ? range.anchor
          : Editor.after(this._editor, range.anchor, {
              distance: placeholderStartOffset,
              unit: 'character',
            });

      // this fixes a bug when the user inserts a snippet which starts with a placeholder
      // in an empty block .
      // the block starts with an empty {text: ""} and the range will be inside
      // the empty text. the placeholder also starts with an empty text {text: "\u200b"}
      // so the initial empty text is normalized away and the rangeRef is destroyed
      // we increment by offset so that the rangeRef starts in the placeholder empty
      // text
      // TODO(lukemurray): this may not be applicable in generated blocks
      // we may want to check for the structure `[{text: ""}, {text: "\u200b"}]`
      // before we increment
      if (anchor !== undefined && isPointAtBlockStart(this._editor, anchor)) {
        anchor = Editor.after(this._editor, anchor, {
          distance: 1,
          unit: 'offset',
        });
      }

      const focus =
        placeholderEndOffset === 0
          ? range.anchor
          : Editor.after(this._editor, range.anchor, {
              distance: placeholderEndOffset,
              unit: 'character',
            });

      if (anchor === undefined || focus === undefined) {
        throw new Error(
          'anchor or focus could not be defined for a placeholder'
        );
      }

      const rangeRef = Editor.rangeRef(this._editor, { anchor, focus });
      this._placeholderRanges!.set(placeholder, rangeRef);
    });
    return this.move(true);
  }

  public move(fwd: boolean): { done: boolean } {
    let validMove = true;
    if (fwd && this._placeholderIdx < this._placeholders.length - 1) {
      this._placeholderIdx++;
    } else if (!fwd && this._placeholderIdx > 0) {
      this._placeholderIdx--;
    } else {
      validMove = false;
    }

    if (validMove) {
      const nextPlaceholder = this._placeholders[this._placeholderIdx];
      const nextRange = this._placeholderRanges!.get(nextPlaceholder)!.current!;

      Transforms.select(this._editor, {
        anchor: Editor.after(this._editor, nextRange.anchor, {
          unit: 'character',
        })!,
        focus: Editor.before(this._editor, nextRange.focus, {
          unit: 'character',
        })!,
      });

      if (nextPlaceholder.isFinalTabstop) {
        this.dispose();
        return { done: true };
      }
    }

    return { done: false };
  }

  public dispose() {
    for (let rangeRef of this._placeholderRanges?.values() ?? []) {
      rangeRef.unref();
    }
  }

  public get placeholderRanges() {
    const ranges = this._placeholders
      .map(placeholder => {
        const rangeRef = this._placeholderRanges!.get(placeholder);
        return rangeRef;
      })
      .map(rangeRef => rangeRef!.current!);
    return ranges;
  }
}
