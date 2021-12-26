import React from 'react'
import { renderToString } from 'react-dom/server'
import Zettel from '../Zettel'
import ContentEditable from 'react-contenteditable'
import './index.css'

import { parse } from '../Zettel/Parser'
import { zettel, Line } from '../Zettel/Syntax'
import { getText } from '../Zettel/Render'

const EVENT_LEVEL = 'debug'

type File = { name: string; body: string }
type Files = File[]

const getFile = async (name: string): Promise<File> =>
  fetch(`http://localhost:4000/zettels/${name}`, {
    method: 'GET',
  })
    .then(res => res.json())
    .then(res => {
      dispatch({ type: 'get-file', data: name, status: 'debug' })
      return res
    })

const getFiles = async () =>
  fetch('http://localhost:4000/zettels', {
    method: 'GET',
  })
    .then(res => res.json())
    .then(res => {
      dispatch({ type: 'get-files', status: 'debug' })
      return res
    })

const saveFile = (name: string, body: string) =>
  fetch(`http://localhost:4000/zettels/${name}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
    },
    body,
  }).then(res => {
    dispatch({ type: 'save-file', data: name, status: 'success' })
    return res
  })

interface ZettelEvent {
  type: string
  data?: any
  status: 'error' | 'default' | 'success' | 'debug'
}

const dispatch = ({ type, data, status = 'default' }: ZettelEvent) => {
  if (EVENT_LEVEL !== 'debug' && status === 'debug') {
    return
  }
  const event = new CustomEvent('zettel', { detail: { type, data, status } })
  document.dispatchEvent(event)
}

const Events = () => {
  const [events, setEvents] = React.useState({})
  React.useEffect(() => {
    const onEvent = (e: CustomEvent<ZettelEvent>) => {
      setEvents(events => ({ ...events, [e.timeStamp]: e.detail }))
      setTimeout(() => {
        setEvents(events => {
          let eventsNew = { ...events }
          delete eventsNew[e.timeStamp]
          return eventsNew
        })
      }, 3000)
    }
    document.addEventListener('zettel', onEvent)
    return () => document.removeEventListener('zettel', onEvent)
  }, [])

  return (
    <article className="events">
      {Object.values(events)
        .reverse()
        .map((event: ZettelEvent) => (
          <div className={`events__event events__event--${event.status}`}>
            {event.status === 'debug' && event.type}
            {event.data}
          </div>
        ))}
    </article>
  )
}

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
    // @ts-ignore
    const focusContent = e => {
      e.key === 'Enter' && e.ctrlKey && document.querySelector('.file__editable-content').focus()
      e.key === 'Enter' && e.shiftKey && document.querySelector('.search__bar').focus()
    }

    document.body.addEventListener('keydown', focusContent)
    return () => {
      document.body.removeEventListener('keydown', focusContent)
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
    <main className="App">
      <Events />
      <TableOfContents content={files[index]?.body} />
      <DisplayFile index={index} files={files} />
      <Search index={index} setIndex={setIndex} files={files} />
    </main>
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
    <section className="file">
      <ContentEditable
        html={content}
        className="file__editable-content"
        onChange={saveContent}
        // @ts-ignore
        onFocus={() => {
          document.activeElement?.blur()
          document.querySelector('.search__bar').focus()
        }}
      />
      <Zettel content={file?.body} />
    </section>
  )
}

interface TOCLine {
  indent: number
  text: string
  i: number
}

const TableOfContents = ({ content }) => {
  const parsed = parse(content || '', zettel)
  const shouldRender = (t: Line, i: number) => {
    if (t.type !== 'line') {
      return false
    }
    if (t.text.type === 'comment' || t.text.type === 'link') {
      return false
    }

    const next = parsed.value?.[i + 2]
    return t.type === 'line' && t.indent <= 4 && next?.indent === t.indent + 4
  }

  const lines = parsed.value?.reduce((acc: TOCLine[], t: Line, i: number) => {
    if (!shouldRender(t, i)) {
      return acc
    }

    acc.push({
      indent: t.indent,
      text: getText(t.text),
      i,
    })

    return acc
  }, [])

  return (
    <aside className="toc">
      {fileTags(content)?.map(tag => (
        <div className="z-tag">{tag.tag}</div>
      ))}
      <br />
      {lines.map((line: TOCLine) => (
        <div className="toc__line">
          {' '.repeat(line.indent)}
          <a href={`#${line.i}`}>{line.text}</a>
        </div>
      ))}
    </aside>
  )
}

const escape = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

function search(query: string, files: Files) {
  const lowercase = new RegExp(/^[^A-Z]*$/)
  const toRegExp = (q: string) => {
    let negative = false
    let regex: RegExp
    if (q[0] === '!') {
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
    const t1 = (tags1[0].tag || '').toLowerCase()
    const t2 = (tags2[0].tag || '').toLowerCase()
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
  const tags = content?.match(/^@.*$/gm)
  return tags?.map(tag => ({ tag, num: (tag.match(/^@+/g)[0] || []).length }))
}

function previewFile({ body }: File) {
  return fileTags(body)
    .map(({ tag }) => tag)
    .join(' ')
    .substring(0, 30)
}

// function getElementIndex(element: HTMLElement) {
//   return element ? Array.from(element.parentNode.children).indexOf(element) : -1
// }

const Search = ({ index, setIndex, files }) => {
  const [query, setQuery] = React.useState('@')
  const [matches, setMatches] = React.useState<number[]>([])
  const [focused, setFocused] = React.useState(-1)

  React.useEffect(() => {
    const onfocus = () => {
      setTimeout(() => {
        const result = document.querySelector('.search__result:focus') as HTMLElement
        setFocused(Number(result?.id))
      }, 100)
    }

    const searchBar = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const element = document.activeElement as HTMLElement
        if (element.classList.contains('search__result')) {
          element.click()
        } else if (element.classList.contains('search__bar')) {
          document.querySelector('.search__result').click()
        }
      }
    }

    document.querySelector('.search__results').addEventListener('keydown', onfocus)
    document.querySelector('.search').addEventListener('keydown', searchBar)
    return () => {
      document.querySelector('.search__results').removeEventListener('keydown', onfocus)
      document.querySelector('.search').removeEventListener('keydown', searchBar)
    }
  }, [])

  React.useEffect(() => {
    setFocused(index)
  }, [index])

  React.useEffect(() => {
    try {
      const matches = search(query, files)
      setMatches(matches)
    } catch {}
  }, [query, files])

  return (
    <aside className="search">
      <input
        className="search__bar"
        value={query}
        onChange={e => setQuery(e.target.value)}
        tabIndex={5}
      />
      <div className="search__results" tabIndex={5}>
        {matches.map(match => (
          <div
            id={match.toString()}
            tabIndex={5}
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
    </aside>
  )
}

const Preview = ({ content }) => {
  return (
    <section className="preview">
      <Zettel content={content} />
    </section>
  )
}

export default App
