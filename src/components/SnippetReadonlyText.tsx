import React from 'react';
import { RenderElementProps, useFocused, useSelected } from 'slate-react';
import { SnippetReadonlyTextElement } from '../customTypes';

export const SnippetReadonlyText = ({
  attributes,
  children,
  element,
}: Omit<RenderElementProps, 'element'> & {
  element: SnippetReadonlyTextElement;
}) => {
  const selected = useSelected();
  const focused = useFocused();
  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        padding: '3px 3px 2px',
        margin: '0 1px',
        verticalAlign: 'baseline',
        display: 'inline-block',
        borderRadius: '4px',
        backgroundColor: '#eee',
        fontSize: '0.9em',
        boxShadow: selected && focused ? '0 0 0 2px #B4D5FF' : 'none',
      }}
    >
      {element.label}
      {children}
    </span>
  );
};
