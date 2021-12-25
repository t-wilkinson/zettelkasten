import React from 'react'
import { renderToString } from 'react-dom/server'
import Zettel from '../Zettel'
import ContentEditable from 'react-contenteditable'
import './index.css'

type File = { name: string; body: string }
type Files = File[]

const getFile = async (name: string): Promise<File> =>
  fetch(`http://localhost:4000/zettels/${name}`, {
    method: 'GET',
  }).then(res => res.json())

const getFiles = async () =>
  fetch('http://localhost:4000/zettels', {
    method: 'GET',
  }).then(res => res.json())

const saveFile = (name: string, body: string) =>
  fetch(`http://localhost:4000/zettels/${name}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
    },
    body,
  })

function App() {
  const [files, setFiles] = React.useState<Files>([])
  const [index, setIndex] = React.useState<number>(null)

  const onChange = React.useCallback(
    event => {
      const fileindex = files.findIndex(file => file.name === event.data)
      const filename = files[fileindex]?.name
      filename &&
        getFile(filename).then(file => {
          setFiles(() => {
            const files_ = files.slice(0)
            files_[index] = file
            return files_
          })
        })
    },
    [index, files]
  )

  React.useEffect(() => {
    const i = Number(window.history.state?.index)
    if (files.length === 0) {
    } else if (i > files.length - 1) {
      window.history.replaceState({ index: null }, null, ``)
      setIndex(null)
    } else if (isNaN(i)) {
      window.history.replaceState({ index: 0 }, null, `index=0`)
      setIndex(0)
    } else {
      setIndex(i)
    }
  }, [files])

  React.useEffect(() => {
    getFiles().then(files => setFiles(files))
    const searchBar = e => {
      if (e.key === 'Enter') {
        const e = document.activeElement as HTMLElement
        if (e.classList.contains('search__result')) {
          e.click()
        } else if (e.classList.contains('search__bar')) {
          document.querySelector('.search__result').click()
        }
      }
    }

    // @ts-ignore
    const focusContent = e => {
      e.key === 'Enter' && e.ctrlKey && document.querySelector('.file__editable-content').focus()
      e.key === 'Enter' && e.shiftKey && document.querySelector('.search__bar').focus()
    }

    document.body.addEventListener('keydown', focusContent)
    document.querySelector('.search').addEventListener('keydown', searchBar)
    return () => {
      document.body.removeEventListener('keydown', focusContent)
      document.querySelector('.search').removeEventListener('keydown', searchBar)
    }
  }, [])

  React.useEffect(() => {
    const socket = new WebSocket('ws://localhost:4000/changes')
    socket.addEventListener('message', event => {
      onChange(event)
    })
    return () => socket.close()
  }, [onChange])

  return (
    <div className="App">
      <Search index={index} setIndex={setIndex} files={files} />
      <DisplayFile index={index} files={files} />
    </div>
  )
}

// innerText sometimes has a weird new line added
const normalizeContent = (content: string) => {
  if (!content) return content
  if (content[content.length - 1] === '\n') content = content.slice(0, -1)
  return content
}

const DisplayFile = ({ index, files }) => {
  const file = files[index]
  const content = React.useMemo(
    () =>
      renderToString(
        <div>
          {normalizeContent(file?.body)
            ?.split('\n')
            .map((line: string) => (
              <span className="pre-white">
                {line}
                <br />
              </span>
            ))}
        </div>
      ),
    [file?.body]
  )

  if (!file) {
    return null
  }

  const saveContent = () => {
    const element = document.querySelector('.file__editable-content') as any
    const innerText = normalizeContent(element.innerText)
    if (innerText !== files[index].body) {
      console.log('saving')
      saveFile(files[index].name, innerText)
    }
  }

  return (
    <div className="file">
      <ContentEditable
        html={content}
        className="file__editable-content"
        onChange={saveContent}
        // @ts-ignore
        onFocus={() => document.activeElement?.blur()}
      />
      <Zettel content={file?.body} />
    </div>
  )
}

const escape = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')

function search(query: string, files: Files) {
  const lowercase = new RegExp(/^[^A-Z]*$/)
  const toRegExp = (q: string) => {
    let negative = false
    let regex: RegExp
    if (q.at(0) === '!') {
      q = q.substring(1)
      negative = true
    }
    q = escape(q)
    if (lowercase.test(q)) {
      regex = new RegExp(q, 'i')
    } else {
      regex = new RegExp(q)
    }

    return {
      regex,
      negative,
    }
  }

  const rs = query.split(' ').map(toRegExp)

  const matches = files.reduce((acc, file, i) => {
    const match = rs.every(({ negative, regex }) => {
      const match = regex.test(file.body)
      return negative ? !match : match
    })
    if (match) {
      acc.push(i)
    }
    return acc
  }, [])

  matches.sort((i1: number, i2: number) => {
    const tags1 = fileTags(files[i1].body)
    const tags2 = fileTags(files[i2].body)
    const t1 = (tags1[0] || '').toLowerCase()
    const t2 = (tags2[0] || '').toLowerCase()
    if (t1 < t2) {
      return -1
    }
    if (t1 > t2) {
      return 1
    }
    return (files[i1].body.match(/@/g) || []).length - (files[i2].body.match(/@/g) || []).length
  })
  return matches
}

function fileTags(content: string) {
  const tags = content.match(/^@.*$/gm)
  return tags
}

function previewFile({ body }: File) {
  return fileTags(body).join(' ').substring(0, 30)
}

function getElementIndex(element: HTMLElement) {
  return element ? Array.from(element.parentNode.children).indexOf(element) : -1
}

const Search = ({ index, setIndex, files }) => {
  const [query, setQuery] = React.useState('@')
  const [matches, setMatches] = React.useState<number[]>([])
  const [focused, setFocused] = React.useState(-1)

  React.useEffect(() => {
    const onfocus = () => {
      setTimeout(() => {
        const selected = getElementIndex(document.querySelector('.search__result:focus'))
        setFocused(selected)
      }, 100)
    }

    document.querySelector('.search__results').addEventListener('keydown', onfocus)
    return () => {
      document.querySelector('.search__results').removeEventListener('keydown', onfocus)
    }
  }, [])

  React.useEffect(() => {
    try {
      const matches = search(query, files)
      setMatches(matches)
    } catch {}
  }, [query, files])

  return (
    <div className="search">
      <input className="search__bar" value={query} onChange={e => setQuery(e.target.value)} tabIndex={5} />
      <div className="search__results" tabIndex={-1}>
        {matches.map(match => (
          <div
            id={match.toString()}
            tabIndex={0}
            className={`search__result ${match === index ? 'search__result--selected' : ''}`}
            onClick={() => {
              setIndex(match)
              window.history.replaceState({ index: match }, null, `index=${match}`)
            }}
          >
            {previewFile(files[match])}
          </div>
        ))}
      </div>
      {files[focused] && focused !== index && <Preview content={files[focused].body} />}
    </div>
  )
}

const Preview = ({ content }) => {
  return null
  // TODO
  return (
    <div className="preview">
      <Zettel content={content} />
    </div>
  )
}

export default App
