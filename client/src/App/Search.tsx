import React from 'react'

import { StoreContext } from './store'
import { Zettel, fileTags } from '../Zettel'
import { api, File, Files } from '../Zettel/api'

const escape = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

function search(query: string, files: Files, { unique }: { unique: boolean }) {
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

  let matches = files.reduce((acc, file, i) => {
    const match = rs.every(({ negative, regex }) => {
      const match = regex.test(file.body)
      return negative ? !match : match
    })
    if (match) {
      acc.push(i)
    }
    return acc
  }, [] as number[])

  if (unique) {
    matches = matches.filter(match => fileTags(files[match].body).length === 1)
  }

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

function previewFile({ body }: File) {
  return fileTags(body)
    .map(({ tag }) => tag)
    .join(' ')
    .substring(0, 35)
}

// function getElementIndex(element: HTMLElement) {
//   return element ? Array.from(element.parentNode.children).indexOf(element) : -1
// }

const Search = () => {
  const { state, dispatch } = React.useContext(StoreContext)
  const [query, setQuery] = React.useState('@')
  const [matches, setMatches] = React.useState<number[]>([])
  const [focused, setFocused] = React.useState(-1)
  const [unique, setUnique] = React.useState(false)

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
          document.querySelector<HTMLElement>('.search__result')?.click()
        }
      }
    }

    document.querySelector<HTMLElement>('.search__results')?.addEventListener('keydown', onfocus)
    document.querySelector<HTMLElement>('.search')?.addEventListener('keydown', searchBar)
    return () => {
      document
        .querySelector<HTMLElement>('.search__results')
        ?.removeEventListener('keydown', onfocus)
      document.querySelector<HTMLElement>('.search')?.removeEventListener('keydown', searchBar)
    }
  }, [])

  React.useEffect(() => {
    setFocused(state.index)
  }, [state.index])

  React.useEffect(() => {
    try {
      const matches = search(query, state.files, { unique })
      setMatches(matches)
    } catch {}
  }, [query, state.files, unique])

  return (
    <aside
      className="search"
      onBlurCapture={() => {
        setFocused(-1)
      }}
    >
      <div className="search__input-wrapper">
        <input
          tabIndex={5}
          className="search__input"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Menu setUnique={setUnique} query={query} />
      </div>
      <div className="search__results" tabIndex={-1}>
        {matches.map(match => (
          <div
            id={match.toString()}
            tabIndex={5}
            className={`search__result ${match === state.index ? 'search__result--selected' : ''}`}
            onClick={() => {
              dispatch({ type: 'set-index', index: match })
              window.history.replaceState({ index: match }, '', `?index=${match}`)
            }}
          >
            {previewFile(state.files[match])}
          </div>
        ))}
      </div>
      {state.files[focused] && focused !== state.index && (
        <Preview content={state.files[focused].body} />
      )}
    </aside>
  )
}

const Menu = ({
  setUnique,
  query,
}: {
  setUnique: (fn: (unique: boolean) => boolean) => void
  query: string
}) => {
  const { state, dispatch } = React.useContext(StoreContext)

  return (
    <section className="menu">
      <button className="menu__button" onClick={() => dispatch({ type: 'open-menu' })}>
        <div className="menu__line" />
        <div className="menu__line" />
        <div className="menu__line" />
      </button>
      {state.menuOpen && (
        <aside className="menu__modal-background">
          <div className="menu__modal">
            <button className="menu__close" onClick={() => dispatch({ type: 'close-menu' })}>
              X
            </button>
            <input
              value=""
              autoFocus
              onKeyDown={(e: any) => {
                if (e.key === 'd') {
                  // delete file
                  api.createFile(state.files[state.index].name)
                }
                if (e.key === 'n') {
                  // create new file
                  api.createFile(query)
                }
                if (e.key === 'u') {
                  // toggle unique results
                  setUnique(unique => !unique)
                  dispatch({ type: 'close-menu' })
                }
                if (e.key === 'Escape') {
                  dispatch({ type: 'close-menu' })
                }
              }}
            />
            <ul>
              <li>Create new file</li>
              <li>Delete file</li>
            </ul>
          </div>
        </aside>
      )}
    </section>
  )
}

const Preview = ({ content }: { content: string }) => {
  const zettel = new Zettel(content)
  return <section className="preview">{zettel.render}</section>
}

export default Search
