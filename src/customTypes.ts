import { BaseRange, BaseText } from 'slate';

export type PlaceholderDecorationRange = {
  type: 'PlaceholderDecorationRange';
} & BaseRange;

export type DefaultRange = {
  type?: undefined;
} & BaseRange;

export type PlaceholderDecorationText = {
  type: 'PlaceholderDecorationRange';
} & BaseText;

export type DefaultText = {
  type?: undefined;
} & BaseText;

declare module 'slate' {
  interface CustomTypes {
    Range: PlaceholderDecorationRange | DefaultRange;
    Text: PlaceholderDecorationText | DefaultText;
  }
}
