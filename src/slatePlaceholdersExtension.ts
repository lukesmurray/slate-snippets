import isHotkey from 'is-hotkey';
import {
  Editor,
  Location,
  Point,
  Range,
  RangeRef,
  Selection,
  Transforms,
} from 'slate';
import { SlateExtension } from 'use-slate-with-extensions';
import {
  Placeholder,
  SnippetParser,
  TextmateSnippet,
} from './snippetParser/snippetParser';

/**
 * Is a point at the end of a word
 */
export const isPointAtWordEnd = (editor: Editor, point: Point) => {
  const AFTER_MATCH_REGEX = /^(\s|$)/;

  // Point after point
  const after = Editor.after(editor, point);

  // From point to after
  const afterRange = Editor.range(editor, point, after);
  const afterText = getEditorText(editor, afterRange);

  // Match regex on after text
  return !!afterText.match(AFTER_MATCH_REGEX);
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

const isEditorEmpty = (e: Editor) => {
  return !Editor.string(e, getEditorEndToEndRange(e));
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

const escapeRegExp = (r: string) => {
  return r.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const snippets = {
  foo: 'for $1 in $2 do { }',
};

export const matchesTriggerAndPattern = (
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

const insertSnippet = (e: Editor, at: Location, snippetString: string) => {
  const snippet = new SnippetParser().parse(snippetString);

  Transforms.insertText(e, snippetString, {
    at: at,
  });
};

export const useSlateSnippetsExtension = (): SlateExtension => {
  return {
    onChange: (editor, next) => {
      const { selection } = editor;
      if (selection && isSelectionCollapsed(selection)) {
        const cursor = Range.start(editor.selection!);

        const { range, match: beforeMatch } = matchesTriggerAndPattern(editor, {
          at: cursor,
          trigger: '$',
          pattern: '\\S+',
        });

        if (
          beforeMatch &&
          isPointAtWordEnd(editor, cursor) &&
          beforeMatch[1] in snippets &&
          range
        ) {
          insertSnippet(editor, range, (snippets as any)[beforeMatch[1]]);
        }
      }
      next(editor);
    },
    onKeyDown: (e, editor, next) => {
      if (isHotkey('tab', e as any)) {
        console.log('pressed tab');
        e.preventDefault();
      }
      return next?.(e, editor);
    },
  };
};

class SnippetSession {
  private _placeholders: Placeholder[];
  private _snippet: TextmateSnippet;
  private _placeholderGroupIdx: number;
  private _placeholderRanges?: Map<Placeholder, RangeRef>;
  private _editor: Editor;

  constructor(editor: Editor, snippet: TextmateSnippet) {
    this._editor = editor;
    this._placeholders = snippet.placeholders;
    this._snippet = snippet;
    this._placeholderGroupIdx = -1;

    // this._placeholderRanges = this._placeholders.map()
  }
}
