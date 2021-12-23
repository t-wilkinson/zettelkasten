import React from 'react'
import { Syntax, Syntaxes} from './Syntax'


type Renderers = {
  [key in keyof Syntax]?: (syntax: Syntax[key]) => any
}

const renderers: Renderers = {
  code: s => <div>{s.text}</div>,
  comment: (s) => <div>{s.text}</div>,
  lineitem: s => <div>{s.text}</div>,
  link: s => <div>{s.text}</div>,
  plaintext: s => <div>{s.text}</div>,
  quote: s => <div>{s.text}</div>,
  tag: s => <div>{s.text}</div>,
}

export const render = (syntaxes: Syntaxes[]) => {
  return syntaxes.map((syntax: Syntaxes) => {
    if (!syntax) {
      return null
    } else if (Array.isArray(syntax)) {
      return render(syntax)
    } else {
      return renderers[syntax.type](syntax as any)
    }
  })
}

