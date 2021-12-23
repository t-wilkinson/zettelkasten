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
  type: 'quote'
  text: string
}
export interface Code {
  type: 'code'
  text: string
}
export interface PlainText {
  type: 'plaintext'
  text: string
}
export interface Text {
  type: 'text'
  text: (PlainText | Code | Quote)[]
}

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

export const text: P.P<Text> = syntax(acc => {
  const values: Text['text'] = acc.next(P.some(P.any(code, quote, plaintext)))
  return { type: 'text', text: values }
})

/***********************************************************************
 * Lines
 ***********************************************************************/
export interface Link {
  type: 'link'
  text: string
  link: string
}
export interface Comment {
  type: 'comment'
  text: string
}
export interface Line {
  type: Type
  lineitem: string | Link | Comment
  indent: number
  text: Text
}

const linktext: P.P<string> = syntax(acc => {
  acc.next(P.s`[`)
  const text = acc.next(P.regexp(/[^\]\n]*/))
  acc.next(P.s`]`)
  return text
})

const linkref: P.P<string> = syntax(acc => {
  acc.next(P.s`(`)
  const link = acc.next(P.regexp(/[^)\n]*/))
  acc.next(P.s`)`)
  return link
})

export const link: P.P<Link> = syntax(acc => {
  const text = acc.next(linktext)
  const link = acc.next(P.optional(linkref))
  return { type: 'link', text, link }
})

export const comment: P.P<Comment> = syntax(acc => {
  acc.next(L.comment)
  const text = acc.next(L.sameline)
  return { type: 'comment', text }
})

export const indent: P.P<number> = P.map(L.startofline, (spaces: string) => spaces.length)

//TODO: should we separate listitems / link + comment? Then combine them in this `line()` function
export const line: P.P<Line> = syntax(acc => {
  const indent_ = acc.next(indent)
  const lineitem = acc.next(P.any(L.unorderedListItem, L.labledListItem, link, comment))
  if (lineitem?.type === 'link' || lineitem?.type === 'comment') {
    return { type: 'line', indent: indent_, lineitem, text: { type: 'text', text: [] } }
  }
  const text_ = acc.next(P.optional(P.ignore(L.space, text)))
  return { type: 'line', indent: indent_, lineitem, text: text_ }
})

/***********************************************************************
 * Zettelkasten
 ***********************************************************************/
export interface Tag {
  type: Type
  num: number
  text: string
}

export interface Empty {
  type: 'empty'
  num: number
}

export interface Zettel {
  line: Line
  tag: Tag
  text: Text
  empty: Empty
}

export interface Syntax {
  comment: Comment
  link: Link
  code: Code
  plaintext: PlainText
  quote: Quote
}

export type Type = keyof Zettel

export type ZettelLine = Zettel[Type]

export const tag: P.P<Tag> = syntax(acc => {
  const num = acc.next(L.tag)?.length
  const text = acc.next(L.sameline)
  return { type: 'tag', num, text }
})

export const zettel: P.P<ZettelLine[]> = syntax(acc => {
  const lines: ZettelLine[] = acc.next(
    P.many(
      P.any(
        text,
        P.map(L.newlines, (newlines: string) => ({ type: 'empty', num: newlines.length - 1 })),
        tag,
        line
      )
    )
  )
  return lines
})
