import { BaseElement, BaseRange, BaseText } from 'slate';

export type PlaceholderDecorationRange = {
  type: 'PlaceholderDecorationRange';
  isFinalTabStop: boolean;
} & BaseRange;

export type DefaultRange = {
  type?: undefined;
} & BaseRange;

export type PlaceholderDecorationText = {
  type: 'PlaceholderDecorationRange';
  isFinalTabStop: boolean;
} & BaseText;

export type DefaultText = {
  type?: undefined;
} & BaseText;

export type SnippetReadonlyTextElement = {
  type: 'SnippetReadonlyText';
  label: string;
} & BaseElement;

export type DefaultElement = {
  type?: undefined;
} & BaseElement;

declare module 'slate' {
  interface CustomTypes {
    Range: PlaceholderDecorationRange | DefaultRange;
    Text: PlaceholderDecorationText | DefaultText;
    Element: SnippetReadonlyTextElement | DefaultElement;
  }
}
