import React from 'react'
import Render from './Render'
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

  return (
    <div className="App">
      <div className="files" contentEditable={true} style={{
        whiteSpace: 'pre'
        }}>
        {files[0] && <Render file={files[0]} />}
        {/* {files.map(file => <Render key={file.name} file={file} /> )} */}
      </div>
    </div>
  );
}

export default App;
