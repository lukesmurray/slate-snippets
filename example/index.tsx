import { default as MonacoEditor, useMonaco } from '@monaco-editor/react';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import 'react-app-polyfill/ie11';
import * as ReactDOM from 'react-dom';
import { Editable, Slate } from 'slate-react';
import {
  useSlateState,
  useSlateWithExtensions,
} from 'use-slate-with-extensions';
import { TimeBasedVariableResolver, useSlateSnippetsExtension } from '../.';
import { parseJSONSnippetSpecification } from './parseJSONSnippetSpecification';
import { snippetJSONSchema } from './snippetJsonSchema';
import './styles.css';

const Editor = (props: { snippets: Record<string, string> }) => {
  const [value, onChange] = useSlateState();

  const plugin = useSlateSnippetsExtension({
    snippets: props.snippets,
    variableResolvers: [new TimeBasedVariableResolver()],
    trigger: '$',
  });

  const { getEditableProps, getSlateProps } = useSlateWithExtensions({
    onChange,
    value,
    extensions: [plugin],
  });

  return (
    <Slate {...getSlateProps()}>
      <Editable placeholder="Try typing $datetime" {...getEditableProps()} />
    </Slate>
  );
};

const App = () => {
  const monaco = useMonaco();

  const monacoPath = 'foo://snippets';

  useEffect(() => {
    monaco?.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'http://vscode/snippets-schema.json', // id of the first schema
          fileMatch: [monacoPath], // associate with our model
          schema: snippetJSONSchema,
        },
      ],
    });
  }, [monaco]);

  const [value, setValue] = useState(`{
  "Insert Current Date Time": {
    "prefix": "datetime",
    "body": "$CURRENT_DATE/$CURRENT_MONTH/$CURRENT_YEAR $CURRENT_HOUR:$CURRENT_MINUTE",
    "description": "You can add your own variable resolutions!"
  },
  "Insert Multiple Tab Stops": {
    "prefix": "tabstops",
    "body": "This $1 snippet $2 contains multiple tab $3 stops"
  },
  "Insert Placeholders in any order": {
    "prefix": "placeholders",
    "body": "This \${2:snippet} \${1:contains} multiple \${3:placeholders}"
  },
  "Insert multiple lines": {
    "prefix": "placeholders",
    "body": ["this snippet $0", "\${1:contains} a couple", "lines of text!"]
  }
}`);

  const handleEditorChange = useCallback((value: string) => {
    setValue(value);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header>
        <h2>Slate Extension Snippets</h2>
        <p>
          A port of{' '}
          <a href="https://code.visualstudio.com/docs/editor/userdefinedsnippets">
            visual studio code snippets
          </a>{' '}
          to <a href="https://www.slatejs.org/">SlateJS</a>. The json editor can
          be used to define snippets which can be inserted in the slate editor
          on the left.
        </p>
        <p>
          In order to keep this example small snippets are inserted using a
          trigger followed by the snippet prefix. The trigger character "$".
        </p>
      </header>
      <main
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(32ch, 1fr))',
          flex: 1,
        }}
      >
        <Editor snippets={parseJSONSnippetSpecification(value) ?? {}} />
        <MonacoEditor
          defaultPath={monacoPath}
          defaultLanguage={'json'}
          onChange={handleEditorChange}
          value={value}
        />
      </main>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
