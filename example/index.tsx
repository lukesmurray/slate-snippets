import * as React from 'react';
import 'react-app-polyfill/ie11';
import * as ReactDOM from 'react-dom';
import { Editable, Slate } from 'slate-react';
import {
  useSlateState,
  useSlateWithExtensions,
} from 'use-slate-with-extensions';
import { useSlatePlaceholdersExtension } from '../.';
import './styles.css';

const Editor = () => {
  const [value, onChange] = useSlateState();

  const slatePlaceholderPlugin = useSlatePlaceholdersExtension();

  const { getEditableProps, getSlateProps } = useSlateWithExtensions({
    onChange,
    value,
    extensions: [slatePlaceholderPlugin],
  });

  return (
    <Slate {...getSlateProps()}>
      <Editable {...getEditableProps()} />
    </Slate>
  );
};

const App = () => {
  return (
    <div>
      <Editor />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
