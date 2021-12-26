import React from 'react'
import { renderToString } from 'react-dom/server'
import ContentEditable from 'react-contenteditable'
import './styles.css'

import Zettel from '../Zettel'
import { Events } from '../Events'
import { Files, api } from '../Zettel/api'
import TableOfContents from './TableOfContents'
import Search from './Search'

function App() {
  const [files, setFiles] = React.useState<Files>([])
  const [index, setIndex] = React.useState<number>(null)

  const onChange = React.useCallback(
    event => {
      const fileindex = files.findIndex(file => file.name === event.data)
      const filename = files[fileindex]?.name
      filename &&
        api.getFile(filename).then(file => {
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
      window.history.replaceState({ index: null }, null, `?`)
      setIndex(null)
    } else if (isNaN(i)) {
      window.history.replaceState({ index: 0 }, null, `?index=0`)
      setIndex(0)
    } else {
      setIndex(i)
    }
  }, [files])

  React.useEffect(() => {
    api.getFiles().then(files => setFiles(files))
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

  const zettel = new Zettel(files[index]?.body)

  return (
    <main className="App">
      <Events />
      <TableOfContents zettel={zettel} />
      <DisplayFile index={index} files={files} zettel={zettel} />
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

const DisplayFile = ({ index, files, zettel}) => {
  const content = React.useMemo(
    () =>
      renderToString(
        <div>
          {normalizeContent(zettel.content)
            ?.split('\n')
            .map((line: string) => (
              <span className="pre-white">
                {line}
                <br />
              </span>
            ))}
        </div>
      ),
    [zettel.content]
  )

  if (!zettel.content) {
    return null
  }

  const saveContent = () => {
    const element = document.querySelector('.file__editable-content') as any
    const innerText = normalizeContent(element.innerText)
    if (innerText !== files[index].body) {
      api.saveFile(files[index].name, innerText)
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
      {zettel.render}
    </section>
  )
}

export default App
