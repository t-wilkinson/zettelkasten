import * as P from './Parser'
import * as L from './Lexer'

/* Zettelkasten ::=
 *    zettel := tag, line item* ;
 *    tag   := "@", <!Line> ;
 *    code := "$", ..., "$" ;
 *    ... := ? any non-newline character ? ;
 *    link := "[", ..., "]", "(", ..., ")" ;
 *    comment := " "*, "> ", ... ;
 *    unordered list := /[-+x!*¿?✘★✓]/, "." ;
 *    labeled list := /[A-Za-z0-9]+/, ".", numbered list label | "" ;
 *    line item := " "*, ( unordered list | labeled list ), " ", ...;
 *    operator := " ", ( ":" | ":=" | "<->" | "<-" | "->" | "~>" | "<=>" | "=>" | "!=" | "==" | "+" | "vs." ), " " ;
 */

interface Tag {
  num: number
  text: string
}

interface Link {
  text: string
  link: string
}

interface Code { code: string }
interface PlainText { text: string }
interface Indent { indent: number }

type Text = (PlainText | Code)[]

interface LineItem {
  lineitem: string | Link
  indent: Indent
  text: Text
}

type Syntax = Link | LineItem | Tag | Code | PlainText | Indent

const syntax: (fn: (acc: P.Acc) => Syntax) => P.P<Syntax> = fn => ctx => {
  const acc = new P.Acc(ctx)
  const value = fn(acc)
  return acc.end(value)
}

export const indent = P.map(L.startofline, (spaces: string) => ({ indent: spaces.length}))
export const plaintext = P.map(L.plaintext, (text: string) => ({ text }))

export const text = syntax(acc => {
  const values = acc.next(P.many(P.either(code, plaintext)))
  return values
})

export const code = syntax(acc => {
  acc.next(P.s`$`)
  const code = acc.next(L.notcode)
  acc.next(P.s`$`)
  return { code }
})

export const link = syntax(acc => {
  acc.next(P.s`[`)
  const text = acc.next(P.regexp(/[^\]]*/))
  acc.next(P.s`](`)
  const link = acc.next(P.regexp(/[^)]*/))
  acc.next(P.s`)`)
  return {text, link}
})

export const tag = syntax(acc => {
  const num = acc.next(L.tag).length
  const text = acc.next(L.sameline)
  return { num, text }
})

export const line = syntax(acc => {
  const indent_ = acc.next(indent)
  const lineitem = acc.next(P.any(L.unorderedListItem, L.labledListItem, link))
  const text = acc.next(P.optional(P.seq(L.space, L.sameline)))
  return { indent: indent_, lineitem, text }
})

// export const zettel = P.seq(P.some(tag), P.many(P.either(line, P.seq(L.startofline, L.sameline))))
