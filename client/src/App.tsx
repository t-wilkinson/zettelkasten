import React from 'react'
import { render } from './Renderer'
import { parse } from './Parser'
import { zettel } from './Syntax'
import './App.css'

type File = { name: string; body: string }
type Files = File[]

function App() {
  const [files, setFiles] = React.useState<Files>([])
  const [index, setIndex] = React.useState<number>(null)

  React.useEffect(() => {
    fetch('http://localhost:4000/zettels', {
      method: 'GET',
    })
      .then(res => res.json())
      .then(res => {
        setFiles(res)
        setIndex(0)
      })
  }, [])

  return (
    <div className="App">
      <Search setIndex={setIndex} files={files} />
      <DisplayFile index={index} files={files} />
    </div>
  )
}

const saveFile = (name: string, body: string) => {
  fetch(`http://localhost:4000/zettels/${name}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
    },
    body,
  })
}

const DisplayFile = ({ index, files }) => {
  const file = files[index]
  const parsed = files[index] && parse(files[index].body, zettel).value

  return (
    <div className="file">
      <button
        className="file__save"
        onClick={() => {
          const content = document.querySelector('.file__editable-content').textContent
          saveFile(files[index].name, content)
        }}
      >
        Save
      </button>
      <div className="file__editable-content" contentEditable={true}>
        {file?.body.split('\n').map(line => <div className="pre-white">{line}</div>)}
      </div>
      {file && render(parsed)}
    </div>
  )
}

// const escape = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
function search(query: string, files: Files) {
  const lowercase = new RegExp(/^[^A-Z]*$/)
  // TODO: allow prefixing string with ! to negate
  const toRegExp = (q: string) => {
    // q = escape(q)
    return lowercase.test(q) ? new RegExp(q, 'i') : new RegExp(q)
  }
  const rs = query.split(' ').map(toRegExp)

  const matches = files.reduce((acc, file, i) => {
    if (rs.every(r => r.test(file.body))) {
      acc.push(i)
    }
    return acc
  }, [])
  return matches
}

const Search = ({ setIndex, files }) => {
  const [open, setOpen] = React.useState(true)
  const [query, setQuery] = React.useState('@')
  const [matches, setMatches] = React.useState<number[]>([])

  React.useEffect(() => {
    try {
      const matches = search(query, files)
      setMatches(matches)
    } catch {}
  }, [query, files])

  return (
    <div className="search">
      {/* <button className="search__open" onClick={() => setOpen(!open)}> */}
      {/*   Open search */}
      {/* </button> */}
      {open && (
        <input className="search__bar" value={query} onChange={e => setQuery(e.target.value)} />
      )}
      <div className="search__results">
        {matches.map(match => (
          <div id={match.toString()} className="search__result" onClick={() => setIndex(match)}>
            {files[match].body.substr(0, 40)}
          </div>
          // {files[match].name.replace(/^\D*/, '')}
        ))}
      </div>
    </div>
  )
}

export default App
