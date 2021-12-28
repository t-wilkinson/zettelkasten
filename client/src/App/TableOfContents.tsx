import React from 'react'

import { Line } from '../Zettel/Syntax'
import { defRender } from '../Zettel/Render'
import { Zettel } from '../Zettel'

const TableOfContents = ({ zettel }: { zettel: Zettel }) => {
  const shouldRender = (line: Line, i: number) => {
    if (line.type !== 'line') {
      return false
    }
    if (line.text.type === 'comment') {
      return false
    }

    const next = zettel.syntax[i + 2] as any
    return line.type === 'line' && line.indent <= 4 && next?.indent === line.indent + 4
  }

  const lines = zettel.syntax.reduce((acc: any[], line: any, i: number) => {
    if (!shouldRender(line, i)) {
      return acc
    }

    if (line.text.type === 'link') {
      acc.push({
        i,
        indent: line.indent,
        text: {
          type: 'plaintext',
          text: line?.text.text, // Line -> Link -> Text
        }
      })
    } else {
      acc.push({
        i,
        indent: line.indent,
        text: line?.text?.text, // Line -> List -> Text
      })
    }

    return acc
  }, [])

  return (
    <aside className="toc">
      {zettel.tags.map(tag => (
        <div className="z-tag">{tag.tag}</div>
      ))}
      <br />
      {lines.map((line: any) => (
        <div className="toc__line">
          {' '.repeat(line.indent)}
          &middot; <a href={`#${line.i}`}>{defRender(line.text as any)}</a>
        </div>
      ))}
    </aside>
  )
}

export default TableOfContents
