import * as P from './Parser'
import * as L from './Lexer'

/* Zettel ::=
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

const syntax: <Value>(fn: (acc: P.Acc) => Value) => P.P<Value> = fn => ctx => {
  const acc = new P.Acc(ctx)
  const value = fn(acc)
  return acc.end(value)
}

/***********************************************************************
 * Text
 ***********************************************************************/
//  TODO: bold, etc.
export interface Quote {
  type: Type
  text: string
}
export interface Code {
  type: Type
  text: string
}
export interface PlainText {
  type: Type
  text: string
}
type Text = (PlainText | Code | Quote)[]

export const plaintext: P.P<PlainText> = P.map(L.plaintext, (text: string) => ({
  type: 'plaintext',
  text,
}))

export const quote: P.P<Quote> = syntax(acc => {
  acc.next(P.s`"`)
  const text = acc.next(L.notquote)
  acc.next(P.s`"`)
  return { type: 'quote', text }
})

export const code: P.P<Code> = syntax(acc => {
  acc.next(P.s`$`)
  const text = acc.next(L.notcode)
  acc.next(P.s`$`)
  return { type: 'code', text }
})

export const text: P.P<Text[]> = syntax(acc => {
  const values: Text[] = acc.next(P.some(P.any(code, quote, plaintext)))
  return values
})

/***********************************************************************
 * Lines
 ***********************************************************************/
export interface Link {
  type: Type
  text: string
  link: string
}
export interface Comment {
  type: Type
  text: string
}
export interface LineItem {
  type: Type
  lineitem: string | Link | Comment
  indent: number
  text: Text
}

export const comment: P.P<Comment> = syntax(acc => {
  acc.next(L.comment)
  const text = acc.next(L.sameline)
  return { type: 'comment', text }
})

export const link: P.P<Link> = syntax(acc => {
  acc.next(P.s`[`)
  const text = acc.next(P.regexp(/[^\]\n]*/))
  acc.next(P.s`](`)
  const link = acc.next(P.regexp(/[^)\n]*/))
  acc.next(P.s`)`)
  return { type: 'link', text, link }
})

export const indent: P.P<number> = P.map(L.startofline, (spaces: string) => spaces.length)

export const lineitem: P.P<LineItem> = syntax(acc => {
  const indent_ = acc.next(indent)
  const lineitem = acc.next(P.any(L.unorderedListItem, L.labledListItem, link, comment))
  if (lineitem?.type === 'link') {
    return { type: 'lineitem', indent: indent_, lineitem, text: '' }
  }
  acc.next(P.optional(L.space))
  const text = acc.next(P.optional(L.sameline))
  return { type: 'lineitem', indent: indent_, lineitem, text }
})

/***********************************************************************
 * Zettelkasten
 ***********************************************************************/
export interface Tag {
  type: Type
  num: number
  text: string
}

export type Syntax = {
  code: Code
  comment: Comment
  lineitem: LineItem
  link: Link
  plaintext: PlainText
  quote: Quote
  tag: Tag
}

export type Type = keyof Syntax

export type Syntaxes = Syntax[Type]

export const tag: P.P<Tag> = syntax(acc => {
  const num = acc.next(L.tag)?.length
  const text = acc.next(L.sameline)
  return { type: 'tag', num, text }
})

export const zettel: P.P<Syntaxes[]> = syntax(acc => {
  const lines: Syntaxes[] = acc.next(P.many(P.any(text, P.map(L.newline, () => null), tag, lineitem)))
  return lines
})
