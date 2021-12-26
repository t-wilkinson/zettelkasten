import React from 'react'
import { Syntax, TextItem, ZettelLine } from './Syntax'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import './styles.css'

type Renderers<Obj> = {
  [key in keyof Obj]: (syntax: Obj[key], i?: number) => any
}

const defRender = (s: Syntax[keyof Syntax]) => components[s.type]?.(s as any)

// prettier-ignore
const parseLink = ({ link, text }: Syntax['link']) => {
  const href = text.startsWith('http')
    ? text
    : !link
    ? '#'
    : link.startsWith('/home')
    ? `http://localhost:4000/files${link}`
    : link
  const target = href.startsWith('#') ? '_self' : '_blank'
  return { href, target }
}

// prettier-ignore
export const components: Renderers<Syntax> = {
  list: s => <span className="z-list"><span className="z-listitem">{s.listitem}</span> {defRender(s.text)}</span>,
  operator: s => <span className="z-operator"> {s.text} </span>,
  comment: s => <span className="z-comment">{'>'} {s.text}</span>,
  link: s => <a {...parseLink(s)} className="z-link">{s.text}</a>,
  plaintext: s => s.text,
  quote: s => <q className="z-quote">{s.text}</q>,
  inlinetex: s => <InlineMath>{s.text}</InlineMath>,
  blocktex: s => <BlockMath>{s.text}</BlockMath>,
  code: s => <code>{s.text}</code>,
  striked: s => <span className="z-striked">{s.text}</span>,
  bold: s => <span className="z-bold">{s.text}</span>,

  line: (s, i) => <div id={i.toString()}className="z-line">{' '.repeat(s.indent)}{defRender(s.text)}</div>,
  tag: s => (
    <div className="z-tag">
      {'@'.repeat(s.num)}
      {defRender(s.text)}
    </div>
  ),
  text: ({ text }) => text?.map((t) => defRender(t as any)),
  empty: s => Array(s.num).fill(<br />),
}

export const getText = ({ text, type }) => {
  switch (type) {
    case 'list':
      return getText(text)
    case 'text':
      return text.map((t: TextItem) => t.text).join('')
    default:
      return text?.text
  }
}

export const render = (syntaxes: ZettelLine[]) =>
  syntaxes.map((syntax: ZettelLine, i) => {
    if (!syntax) {
      return null
    } else if (Array.isArray(syntax)) {
      return render(syntax)
    } else {
      return components[syntax.type](syntax as any, i)
    }
  })
