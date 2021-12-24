import * as P from './Parser'
import * as L from './Lexer'
import { Seq } from './Parser'

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

/***********************************************************************
 * Text
 ***********************************************************************/
// TODO: can abstract something here
export interface Quote {
  type: 'quote'
  text: string
}
export interface Tex {
  type: 'blocktex' | 'inlinetex'
  text: string
}
export interface PlainText {
  type: 'plaintext'
  text: string
}
export interface Operator {
  type: 'operator'
  text: string
}
export interface Code {
  type: 'code'
  text: string
}
export interface Text {
  type: 'text'
  text: (PlainText | Tex | Quote)[]
}

export const catchall: P.P<PlainText> = P.map(L.catchall, (text: string) => ({
  type: 'plaintext',
  text,
}))

export const plaintext: P.P<PlainText> = P.map(L.plaintext, (text: string) => ({
  type: 'plaintext',
  text,
}))

export const quote: P.P<Quote> = P.map(P.surrounds(P.s`"`, L.notquote), text => ({
  type: 'quote',
  text,
}))
export const inlinetex: P.P<Tex> = P.map(P.surrounds(P.s`$`, L.notinlinetex), text => ({ type: 'inlinetex', text }))
export const blocktex: P.P<Tex> = P.map(P.surrounds(P.s`$$`, L.notblocktex), text => ({ type: 'blocktex', text }))

export const operator: P.P<Operator> = Seq(seq => {
  const op = seq.next(L.operator)
  return { type: 'operator', text: op?.trim() }
})

export const text: P.P<Text> = Seq(seq => {
  const values: Text['text'] = seq.next(P.some(P.any(catchall, inlinetex, blocktex, quote, plaintext)))
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

export const linktext: P.P<string> = P.surrounds(P.s`[`, P.regexp(/[^\]\n]*/), P.s`]`)
export const linkref: P.P<string> = P.surrounds(P.s`(`, P.regexp(/[^)\n]*/), P.s`)`)

export const link: P.P<Link> = Seq(seq => {
  const text = seq.next(linktext)
  const link = seq.next(P.optional(linkref))
  return { type: 'link', text, link }
})

export const comment: P.P<Comment> = Seq(seq => {
  seq.next(L.comment)
  const text = seq.next(L.sameline)
  return { type: 'comment', text }
})

export const indent: P.P<number> = P.map(L.startofline, (spaces: string) => spaces.length)

//TODO: separate listitems / link + comment? Then combine them in this `line()` function
//TODO: instead have { type: 'line', indent: number, item: Link | comment | List }
export const line: P.P<Line> = Seq(seq => {
  const indent_ = seq.next(indent)
  const lineitem = seq.next(P.any(L.unorderedListItem, L.labledListItem, link, comment))
  if (lineitem?.type === 'link' || lineitem?.type === 'comment') {
    return { type: 'line', indent: indent_, lineitem, text: { type: 'text', text: [] } }
  }
  const text_ = seq.next(P.optional(P.ignore(L.space, text)))
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
  blocktex: Tex
  inlinetex: Tex
  plaintext: PlainText
  quote: Quote
  operator: Operator
}

export type Type = keyof Zettel

export type ZettelLine = Zettel[Type]

export const tag: P.P<Tag> = Seq(seq => {
  const num = seq.next(L.tag)?.length
  const text = seq.next(L.sameline)
  return { type: 'tag', num, text }
})

export const zettel: P.P<ZettelLine[]> = Seq(seq => {
  const lines: ZettelLine[] = seq.next(
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
