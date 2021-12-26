import { Line } from '../Zettel/Syntax'
import { getText } from '../Zettel/Render'

interface TOCLine {
  indent: number
  text: string
  i: number
}

const TableOfContents = ({ zettel }) => {
  const shouldRender = (t: Line, i: number) => {
    if (t.type !== 'line') {
      return false
    }
    if (t.text.type === 'comment' || t.text.type === 'link') {
      return false
    }

    const next = zettel.syntax[i + 2]
    return t.type === 'line' && t.indent <= 4 && next?.indent === t.indent + 4
  }

  const lines = zettel.syntax.reduce((acc: TOCLine[], t: Line, i: number) => {
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
      {zettel.tags.map(tag => (
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

export default TableOfContents
