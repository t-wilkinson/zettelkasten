import React from 'react'

import { StoreContext } from './store'
import { Zettel, fileTags } from '../Zettel'
import { api, ZettelFile } from '../Zettel/api'

const escape = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

function search(query: string, files: ZettelFile[], { unique }: { unique: boolean }) {
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

function previewFile({ body }: ZettelFile) {
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
        } else if (element.classList.contains('search__input')) {
          document.querySelector<HTMLElement>('.search__result')?.click()
        }
      }
    }

    const searchResults = document.querySelector<HTMLElement>('.search__results')
    const search = document.querySelector<HTMLElement>('.search')
    searchResults?.addEventListener('keydown', onfocus)
    search?.addEventListener('keydown', searchBar)
    return () => {
      searchResults?.removeEventListener('keydown', onfocus)
      search?.removeEventListener('keydown', searchBar)
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
  query,
  setUnique,
}: {
  query: string
  setUnique: (fn: (unique: boolean) => boolean) => void
}) => {
  const { state, dispatch } = React.useContext(StoreContext)

  const onKeyDown = (e: any) => {
    const close = () => dispatch({ type: 'close-menu' })
    e.key === 'd' &&
      api.deleteFile(state.files[state.index].name) &&
      dispatch({ type: 'remove-file', index: state.index })
    e.key === 'n' &&
      api
        .createFile(query)
        .then(filename => dispatch({ type: 'create-file', file: { name: filename, body: query } }))
    e.key === 'u' && setUnique(unique => !unique)
    if (e.key === 'r') {
      const randomIndex = Math.floor(Math.random() * state.files.length)
      dispatch({ type: 'set-index', index: randomIndex })
    }
    ;['d', 'n', 'u', 'r', 'c'].includes(e.key) && close()
  }

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
            <input value="" autoFocus onKeyDown={onKeyDown} />
            <ul>
              <li>create (n)ew file</li>
              <li>(d)elete file</li>
              <li>(u)nique tags</li>
              <li>(c)lose menu</li>
              <li>(r)andom zettel</li>
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
