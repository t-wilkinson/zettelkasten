import React from 'react'
import { renderToString } from 'react-dom/server'
import ContentEditable from 'react-contenteditable'
import './styles.css'

import Zettel from '../Zettel'
import { Events } from '../Events'
import { api, ZettelFile } from '../Zettel/api'
import TableOfContents from './TableOfContents'
import Search from './Search'
import { StoreContext, reducer, initialState, State, Action } from './store'

function App() {
  const [state, dispatch] = React.useReducer<(state: State, action: Action) => State>(reducer, initialState)

  const onChange = React.useCallback(
    (event: any) => {
      const fileindex = state.files.findIndex((file: ZettelFile) => file.name === event.data)
      const filename = state.files[fileindex]?.name
      filename &&
        api.getFile(filename).then(file => {
          dispatch({ type: 'update-file', file })
        })
    },
    [state.files]
  )

  React.useEffect(() => {
    const i = Number(window.history.state?.index)
    if (state.files.length === 0) {
      dispatch({ type: 'clear-index' })
    } else if (i > state.files.length - 1) {
      window.history.replaceState({index: 0}, '', `?index=0`)
      dispatch({ type: 'clear-index' })
    } else if (isNaN(i)) {
      window.history.replaceState({ index: 0 }, '', `?index=0`)
      dispatch({ type: 'reset-index' })
    } else {
      dispatch({ type: 'set-index', index: i })
    }
  }, [state.files])

  React.useEffect(() => {
    api.getFiles().then(files => dispatch({ type: 'update-files', files }))
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'm' && e.ctrlKey) {
        e.preventDefault()
        dispatch({ type: 'toggle-menu' })
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        document.querySelector<HTMLElement>('.file__editable-content')?.focus()
      }
      if (e.key === 'Enter' && e.shiftKey) {
        document.querySelector<HTMLElement>('.search__input')?.focus()
      }
    }

    document.body.addEventListener('keydown', onKeydown, true)
    return () => {
      document.body.removeEventListener('keydown', onKeydown, true)
    }
  }, [])

  React.useEffect(() => {
    const socket = new WebSocket('ws://localhost:4000/changes')
    socket.addEventListener('message', event => {
      onChange(event)
    })
    return () => socket.close()
  }, [onChange])

  const zettel = new Zettel(state.files[state.index]?.body)

  return (
    <main className="App">
      <StoreContext.Provider value={{ state, dispatch }}>
        <Events />
        <TableOfContents zettel={zettel} />
        <DisplayFile zettel={zettel} />
        <Search />
      </StoreContext.Provider>
    </main>
  )
}

// innerText sometimes has a weird new line added
const normalizeContent = (content: string) => {
  if (!content) return content
  if (content[content.length - 1] === '\n') content = content.slice(0, -1)
  return content
}

const DisplayFile = ({ zettel }) => {
  const { state } = React.useContext(StoreContext)

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
    if (innerText !== state.files[state.index].body) {
      api.saveFile(state.files[state.index].name, innerText)
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
          ;(document.activeElement as HTMLElement).blur()
          document.querySelector<HTMLElement>('.search__input')?.focus()
        }}
      />
      {zettel.render}
    </section>
  )
}

export default App
