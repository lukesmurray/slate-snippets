import isHotkey from 'is-hotkey';
import React, { useState } from 'react';
import {
  Editor,
  Location,
  Node,
  Point,
  Range,
  RangeRef,
  Selection,
  Text,
  Transforms,
} from 'slate';
import { SlateExtension } from 'use-slate-with-extensions';
import { PlaceholderDecorationRange } from './customTypes';
import {
  Placeholder,
  SnippetParser,
  TextmateSnippet,
  VariableResolver,
} from './snippetParser/snippetParser';
import { CompositeSnippetVariableResolver } from './variableResolvers/CompositeSnippetVariableResolver';

/**
 * Is a point at the end of a word
 */
const isPointAtWordEnd = (editor: Editor, point: Point) => {
  const AFTER_MATCH_REGEX = /^(\s|$)/;

  // Point after point
  const after = Editor.after(editor, point);

  // From point to after
  const afterRange = Editor.range(editor, point, after);
  const afterText = getEditorText(editor, afterRange);

  // Match regex on after text
  return !!afterText.match(AFTER_MATCH_REGEX);
};

const isRangeContained = (outer: Range, inner: Range) => {
  const [outer_start, outer_end] = Range.edges(outer);
  const [inner_start, inner_end] = Range.edges(inner);
  return (
    Point.compare(outer_start, inner_start) < 1 &&
    Point.compare(outer_end, inner_end) > -1
  );
};

const getEditorEnd = (e: Editor) => {
  return Editor.end(e, []);
};

const getEditorStart = (e: Editor) => {
  return Editor.start(e, []);
};

const getEditorEndToEndRange = (e: Editor): Range => {
  return { anchor: getEditorStart(e), focus: getEditorEnd(e) };
};

const isSelectionCollapsed = (s: Selection) => {
  return s !== null && Range.isCollapsed(s);
};

const getEditorText = (e: Editor, at?: Location | null) => {
  if (at !== null && at !== undefined) {
    return Editor.string(e, at);
  }
  return '';
};

const isPointAtBlockStart = (e: Editor, point: Point) => {
  const [_, path] = Editor.above(e, {
    at: point,
    match: n => Editor.isBlock(e, n),
  }) ?? [undefined, undefined];
  return path !== undefined && Editor.isStart(e, point, path);
};

const escapeRegExp = (r: string) => {
  return r.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

function disposeSnippetSession(
  snippetSession: SnippetSession | undefined,
  setSnippetSession: React.Dispatch<
    React.SetStateAction<SnippetSession | undefined>
  >
) {
  if (snippetSession !== undefined) {
    snippetSession.dispose();
    setSnippetSession(undefined);
  }
}

const matchesTriggerAndPattern = (
  editor: Editor,
  { at, trigger, pattern }: { at: Point; trigger: string; pattern: string }
) => {
  // Point at the start of line
  const lineStart = Editor.before(editor, at, { unit: 'line' });

  // Range from before to start
  const beforeRange = lineStart && Editor.range(editor, lineStart, at);

  // Before text
  const beforeText = getEditorText(editor, beforeRange);

  // Starts with char and ends with word characters
  const escapedTrigger = escapeRegExp(trigger);

  const beforeRegex = new RegExp(`(?:^|\\s)${escapedTrigger}(${pattern})$`);

  // Match regex on before text
  const match = !!beforeText && beforeText.match(beforeRegex);

  // Point at the start of mention
  const mentionStart = match
    ? Editor.before(editor, at, {
        unit: 'character',
        distance: match[1].length + trigger.length,
      })
    : null;

  // Range from mention to start
  const mentionRange = mentionStart && Editor.range(editor, mentionStart, at);

  return {
    range: mentionRange,
    match,
  };
};

export interface useSlateSnippetsExtensionOptions {
  snippets: Record<string, string>;
  trigger?: string;
  placeholderColor?: string;
  pattern?: string;
  variableResolvers?: VariableResolver[];
}

export const useSlateSnippetsExtension = (
  options: useSlateSnippetsExtensionOptions
): SlateExtension => {
  const {
    snippets,
    trigger = '$',
    placeholderColor = '#d2f1ff',
    pattern = '\\S+',
    variableResolvers = [],
  } = options;
  // defined if currently inserting a snippet otherwise undefined
  const [snippetSession, setSnippetSession] = useState<
    SnippetSession | undefined
  >();

  return {
    decorate: ([node, path], editor) => {
      if (snippetSession !== undefined && Text.isText(node)) {
        const [start, end] = Editor.edges(editor, path);
        const nodeRange = { anchor: start, focus: end };

        const placeholderRanges = snippetSession.placeholderRanges
          .filter(placeholderRange =>
            isRangeContained(nodeRange, placeholderRange)
          )
          .map(r => {
            const decorationRange: PlaceholderDecorationRange = {
              ...r,
              type: 'PlaceholderDecorationRange',
            };
            return decorationRange;
          });

        return placeholderRanges;
      }
      return undefined;
    },
    decorateDeps: [snippetSession],
    renderLeaf: props => {
      if (props.leaf.type === 'PlaceholderDecorationRange') {
        if (props.leaf.text.replaceAll('\u200B', '').length === 0) {
          return (
            <span
              style={{
                background: placeholderColor,
                display: 'inline-block',
                minWidth: '2px',
              }}
            >
              {props.children}
            </span>
          );
        }
        return (
          <span style={{ background: placeholderColor }}>{props.children}</span>
        );
      }
      return undefined;
    },
    renderLeafDeps: [snippetSession, placeholderColor],
    onBlur: (e, editor, next) => {
      disposeSnippetSession(snippetSession, setSnippetSession);
      return next?.(e, editor);
    },
    onBlurDeps: [snippetSession],
    onChange: (editor, next) => {
      if (snippetSession === undefined) {
        const { selection } = editor;
        if (selection && isSelectionCollapsed(selection)) {
          const cursor = Range.start(editor.selection!);

          const { range, match: beforeMatch } = matchesTriggerAndPattern(
            editor,
            {
              at: cursor,
              trigger: trigger,
              pattern: pattern,
            }
          );

          if (
            beforeMatch &&
            isPointAtWordEnd(editor, cursor) &&
            beforeMatch[1] in snippets &&
            range
          ) {
            const session = new SnippetSession(
              editor,
              (snippets as any)[beforeMatch[1]],
              variableResolvers
            );
            Editor.withoutNormalizing(editor, () => {
              const { done } = session.insert(range);
              if (!done) {
                setSnippetSession(session);
              }
            });
          }
        }
      } else {
        const { selection } = editor;
        if (selection !== null && selection.focus) {
          if (
            !snippetSession.placeholderRanges.some(placeholderRange =>
              isRangeContained(placeholderRange, selection)
            )
          ) {
            disposeSnippetSession(snippetSession, setSnippetSession);
          }
        }
      }
      next(editor);
    },
    onChangeDeps: [
      snippetSession,
      snippets,
      trigger,
      pattern,
      variableResolvers,
    ],
    onKeyDown: (e, editor, next) => {
      if (snippetSession !== undefined) {
        if (isHotkey('tab', e as any) || isHotkey('shift+tab', e as any)) {
          e.preventDefault();
          const { done } = snippetSession.move(!e.shiftKey);
          if (done) {
            setSnippetSession(undefined);
          }
        }
      }
      return next?.(e, editor);
    },
    onKeyDownDeps: [snippetSession],
    normalizeNode: (entry, editor, next) => {
      const [node, path] = entry;
      if (snippetSession === undefined && Text.isText(node)) {
        if (Node.string(node).includes('\u200B')) {
          Transforms.insertText(
            editor,
            Node.string(node).replaceAll('\u200B', ''),
            { at: path }
          );
          return;
        }
      }
      next(entry, editor);
    },
    normalizeNodeDeps: [snippetSession],
  };
};

class SnippetSession {
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
