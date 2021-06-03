import isHotkey from 'is-hotkey';
import React, { useCallback, useState } from 'react';
import { Editor, Node, Range, Text, Transforms } from 'slate';
import { SlateExtension } from 'use-slate-with-extensions';
import { PlaceholderDecoration } from './components/PlaceholderDecoration';
import { SnippetReadonlyText } from './components/SnippetReadonlyText';
import {
  isPointAtWordEnd,
  isRangeContained,
  isSelectionCollapsed,
  matchesTriggerAndPattern,
} from './slateHelpers';
import { VariableResolver } from './snippetParser/snippetParser';
import { SnippetSession } from './SnippetSession';

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

  const disposeSnippetSession = useCallback(() => {
    if (snippetSession !== undefined) {
      snippetSession.dispose();
      setSnippetSession(undefined);
    }
  }, [snippetSession]);

  return {
    isVoid: (element, editor, next) => {
      if (element.type === 'SnippetReadonlyText') {
        return true;
      }

      return next(element, editor);
    },
    isVoidDeps: [],
    isInline: (element, editor, next) => {
      if (element.type === 'SnippetReadonlyText') {
        return true;
      }
      return next(element, editor);
    },
    isInlineDeps: [],
    decorate: ([node, path], editor) => {
      if (snippetSession !== undefined && Text.isText(node)) {
        const [start, end] = Editor.edges(editor, path);
        const nodeRange = { anchor: start, focus: end };

        const placeholderRanges = snippetSession.placeholderRanges
          .map(placeholderRange =>
            snippetSession.transformPlaceholderRangeToSelectionRange(
              placeholderRange
            )
          )
          .filter(placeholderRange =>
            isRangeContained(nodeRange, placeholderRange)
          );

        return placeholderRanges;
      }
      return undefined;
    },
    decorateDeps: [snippetSession],
    renderElement: props => {
      const { element } = props;
      if (element.type === 'SnippetReadonlyText') {
        return <SnippetReadonlyText {...(props as any)} />;
      }
      return undefined;
    },
    renderElementDeps: [],
    renderLeaf: props => {
      if (props.leaf.type === 'PlaceholderDecorationRange') {
        return (
          <PlaceholderDecoration
            {...(props as any)}
            placeholderColor={placeholderColor}
          />
        );
      }
      return undefined;
    },
    renderLeafDeps: [snippetSession, placeholderColor],
    onBlur: (e, editor, next) => {
      disposeSnippetSession();
      return next?.(e, editor);
    },
    onBlurDeps: [snippetSession],
    onChange: (editor, next) => {
      if (snippetSession === undefined) {
        const { selection } = editor;
        if (isSelectionCollapsed(selection)) {
          const cursor = Range.start(selection!);

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
            disposeSnippetSession();
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
            { at: path, voids: true }
          );
          return;
        }
      }
      next(entry, editor);
    },
    normalizeNodeDeps: [snippetSession],
  };
};
