import React from 'react'

import { Zettel, fileTags } from '../Zettel'
import { File, Files } from '../Zettel/api'

const escape = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

function search(query: string, files: Files, {unique}: {unique: boolean}) {
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
  }, [])

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

const Search = ({ index, setIndex, files }) => {
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
      if (e.key === 'u' && e.ctrlKey) {
        e.preventDefault()
        setUnique(unique => !unique)
      }
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
      const matches = search(query, files, {unique})
      setMatches(matches)
    } catch {}
  }, [query, files, unique])

  return (
    <aside className="search">
      <input
        className="search__bar"
        value={query}
        onChange={e => setQuery(e.target.value)}
        tabIndex={5}
      />
      <div className="search__results" tabIndex={-1}>
        {matches.map(match => (
          <div
            id={match.toString()}
            tabIndex={5}
            className={`search__result ${match === index ? 'search__result--selected' : ''}`}
            onClick={() => {
              setIndex(match)
              window.history.replaceState({ index: match }, null, `?index=${match}`)
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
  const zettel = new Zettel(content)
  return (
    <section className="preview">
      {zettel.render}
    </section>
  )
}

export default Search
