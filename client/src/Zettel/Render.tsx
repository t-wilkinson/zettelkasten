import React from 'react'
import { Syntax, Zettel, ZettelLine } from './Syntax'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import './index.css'

type Renderers<Obj> = {
  [key in keyof Obj]: (syntax: Obj[key]) => any
}

// TODO: performance: avoid defining functions, etc. in these renderers
const renderers: Renderers<Zettel> = {
  line: s => {
    const lineitem =
      typeof s.lineitem === 'string' ? (
        <span className="z-lineitem">{s.lineitem}</span>
      ) : (
        components[s.lineitem.type](s.lineitem as any)
      )
    // prettier-ignore
    return (
      <div className="z-line">{' '.repeat(s.indent)}{lineitem} {renderers.text(s.text)}</div>
    )
  },
  tag: s => (
    <div className="z-tag">
      {'@'.repeat(s.num)}
      {components[s.text.type](s.text)}
    </div>
  ),
  text: ({ text }) => text?.map(t => components[t.type](t as any)),
  empty: s => Array(s.num).fill(<br />),
}

const parseLink = (link: string) =>{
  return !link ? '#' : link.startsWith('/home') ? `file://${link}` : link
}

// prettier-ignore
const components: Renderers<Syntax> = {
  operator: s => <span className="z-operator"> {s.text} </span>,
  comment: s => <span className="z-comment">{'>'} {s.text}</span>,
  link: s => <a href={parseLink(s.link)} className="z-link">{s.text}</a>,
  plaintext: s => s.text,
  quote: s => <q className="z-quote">{s.text}</q>,
  inlinetex: s => <InlineMath>{s.text}</InlineMath>,
  blocktex: s => <BlockMath>{s.text}</BlockMath>,
  code: s => <code>{s.text}</code>,
  striked: s => <span className="z-striked">{s.text}</span>,
  bold: s => <span className="z-bold">{s.text}</span>,
  ...renderers,
}

export const render = (syntaxes: ZettelLine[]) => {
  return syntaxes.map((syntax: ZettelLine) => {
    if (!syntax) {
      return null
    } else if (Array.isArray(syntax)) {
      return render(syntax)
    } else {
      return renderers[syntax.type](syntax as any)
    }
  })
}
