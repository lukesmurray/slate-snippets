import React from 'react';
import { RenderLeafProps } from 'slate-react';
import { PlaceholderDecorationText } from '../customTypes';

export const PlaceholderDecoration = ({
  attributes,
  children,
  leaf,
  text,
  placeholderColor,
}: Omit<RenderLeafProps, 'leaf' | 'text'> & {
  leaf: PlaceholderDecorationText;
  text: PlaceholderDecorationText;
  placeholderColor: string;
}) => {
  if (leaf.text.replaceAll('\u200B', '').length === 0) {
    return (
      <span
        style={{
          padding: '0px 1px',
          border: `2px solid ${
            leaf.isFinalTabStop ? 'grey' : placeholderColor
          }`,
          display: 'inline-block',
          minWidth: '2ch',
        }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      style={{
        padding: '0px 1px',
        border: `2px solid ${leaf.isFinalTabStop ? 'grey' : placeholderColor}`,
      }}
    >
      {children}
    </span>
  );
};
