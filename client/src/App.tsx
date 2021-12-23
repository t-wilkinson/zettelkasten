import React from 'react'
import { render } from './Renderer'
import { parse } from './Parser'
import { zettel } from './Syntax'
import "./App.css"

function App() {
  const [files, setFiles] = React.useState([])

  React.useEffect(() => {
    fetch('http://localhost:4000/zettels', {
      method: 'GET'
    })
      .then(res => res.json())
      .then(res => {
        setFiles(res)
      })
  }, [])

  const parsed = files[0] && parse(files[0].body, zettel).value

  return (
    <div className="App">
      <div className="files" contentEditable={true}
        onInput={(e) => {
          // console.log(e)
        }}
        // onKeyDown={(e: React.KeyboardEvent) => {
        //   if (e.key === 'Enter') {
        //   }
        // }}
      >
        {files[0] && render(parsed)}
      </div>
    </div>
  );
}

export default App;
