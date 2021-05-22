import * as React from 'react';
import 'react-app-polyfill/ie11';
import * as ReactDOM from 'react-dom';
import { Editable, Slate } from 'slate-react';
import {
  useSlateState,
  useSlateWithExtensions,
} from 'use-slate-with-extensions';
import { useSlateSnippetsExtension } from '../.';
import './styles.css';

const Editor = () => {
  const [value, onChange] = useSlateState();

  const plugin = useSlateSnippetsExtension({
    snippets: {
      ex: 'This sentence ${1:contains} in ${2:placeholders}',
      empty: 'for $1 in $2 do { }',
      bar: 'for ${1:foo} in $2 do { }',
      baz: ' ${1:a}${2:b}${3:c}${4:d} ',
      first: '${1:foo} and the rest of the placeholder',
      fempty: '$1 and the rest of the placeholder',
      time:
        '$CURRENT_DATE/$CURRENT_MONTH/$CURRENT_YEAR $CURRENT_HOUR:$CURRENT_MINUTE',
      none: 'the answer is 42',
      order: '${2:this} sentence ${1:contains}',
      blorder: '${2:blah} in ${1:darling} { }',
      multi: 'this snippet\ncontains multiple\nlines',
      smulti: '${3:this} snippet${0}\ncontains ${2:foo} ${1:bar}\nlines',
      fmulti: 'this snippet\n${1:contains} multiple\nlines',
      ffmulti: 'this snippet\n\n\n${1:contains} multiple\nlines',
    },
  });

  const { getEditableProps, getSlateProps } = useSlateWithExtensions({
    onChange,
    value,
    extensions: [plugin],
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
