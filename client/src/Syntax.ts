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

// TODO: Having { text: string } is extra, which ones can we remove?
interface Quote { text: string }
interface Code { text: string }
interface PlainText { text: string }

type Text = (PlainText | Code | Quote)[]

interface Tag { num: number; text: string }
interface Link { text: string; link: string }
interface Indent { indent: number }
interface Comment { text: string }

interface Line {
  lineitem: string | Link
  indent: Indent
  text: Text
}

type Syntax = Link | Line | Tag | Code | PlainText | Indent

const syntax: <Value>(fn: (acc: P.Acc) => Value) => P.P<Value> = fn => ctx => {
  const acc = new P.Acc(ctx)
  const value = fn(acc)
  return acc.end(value)
}

export const indent: P.P<Indent> = P.map(L.startofline, (spaces: string) => ({ indent: spaces.length}))
export const plaintext: P.P<PlainText> = P.map(L.plaintext, (text: string) => ({ text }))

/*
 * Text
 */
// TODO: bold, etc.

export const quote: P.P<Quote> = syntax(acc => {
  acc.next(P.s`"`)
  const text = acc.next(L.notquote)
  acc.next(P.s`"`)
  return { text }
})

export const code: P.P<Code> = syntax(acc => {
  acc.next(P.s`$`)
  const text = acc.next(L.notcode)
  acc.next(P.s`$`)
  return { text }
})

export const text: P.P<Text> = syntax(acc => {
  const values = acc.next(P.many(P.any(code, quote, plaintext)))
  return values
})

/*
 * Lines
 */
export const link: P.P<Link> = syntax(acc => {
  acc.next(P.s`[`)
  const text = acc.next(P.regexp(/[^\]]*/))
  acc.next(P.s`](`)
  const link = acc.next(P.regexp(/[^)]*/))
  acc.next(P.s`)`)
  return {text, link}
})

export const comment: P.P<Comment> = syntax(acc => {
  acc.next(L.comment)
  const text = acc.next(L.sameline)
  return { text }
})

export const line: P.P<Line> = syntax(acc => {
  const indent_ = acc.next(indent)
  const lineitem = acc.next(P.any(L.unorderedListItem, L.labledListItem, link, comment))
  const text = acc.next(P.optional(P.seq(L.space, L.sameline)))
  return { indent: indent_, lineitem, text }
})

/*
 * Zettelkasten
 */
export const tag: P.P<Tag> = syntax(acc => {
  const num = acc.next(L.tag).length
  const text = acc.next(L.sameline)
  return { num, text }
})

export const zettel: P.P<Syntax[]> = syntax(acc => {
  const tag_ = acc.next(tag)
  const line_ = acc.next(P.many(line))
  return [tag_, ...line_]
})
