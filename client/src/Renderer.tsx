import React from 'react'
import { Syntax, Zettel, ZettelLine } from './Syntax'

type Renderers<Obj> = {
  [key in keyof Obj]: (syntax: Obj[key]) => any
}

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
      {s.text}
    </div>
  ),
  text: ({ text }) => text.map(t => components[t.type](t as any)),
  empty: s => '\n'.repeat(s.num),
}

// prettier-ignore
const components: Renderers<Syntax> = {
  comment: s => <span>{'>'} {s.text}</span>,
  link: s => <a href={s.link}>{s.text}</a>,
  plaintext: s => <span>{s.text}</span>,
  quote: s => <q className="z-quote">{s.text}</q>,
  code: s => <code>{s.text}</code>,
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
