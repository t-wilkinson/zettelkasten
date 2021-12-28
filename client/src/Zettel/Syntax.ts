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
export interface TextItem {
  type: 'quote' | 'plaintext' | 'code' | 'operator' | 'blocktex' | 'inlinetex' | 'striked' | 'bold'
  text: string
}

export interface Text {
  type: 'text'
  text: TextItem[]
}

const maketext: <TextType = TextItem['type']>(
  type: TextType,
  p: P.P<string>
) => P.P<{ type: TextType; text: string }> = (type, p) =>
  P.map(p, (text: string) => ({ type, text }))

export const bold = maketext<'bold'>('bold', P.surrounds(P.str('*'), L.not.bold))
export const striked = maketext<'striked'>('striked', P.surrounds(P.str('~~'), L.not.strike))
export const code = maketext<'code'>('code', P.surrounds(P.str('```'), L.not.code))
export const catchall = maketext<'plaintext'>('plaintext', L.catchall)
export const plaintext = maketext('plaintext', L.plaintext)
export const quote = maketext<'quote'>('quote', P.surrounds(P.s`"`, L.not.quote))
export const inlinetex = maketext<'inlinetex'>('inlinetex', P.surrounds(P.s`$`, L.not.inlinetex))
export const blocktex = maketext<'blocktex'>('blocktex', P.surrounds(P.s`$$`, L.not.blocktex))

export const operator: P.P<TextItem> = Seq(seq => {
  const op = seq.next(L.operator)
  return { type: 'operator', text: (op || '').trim() }
})

export const styles = P.any(operator, bold, striked, code, quote, blocktex, inlinetex)

// TODO: this is inefficient
const flattenText = (values: TextItem[]) => {
  // convert any sequence of plaintexts/catchall to a single plaintext because it gets broken up
  const res = values.reduce(
    ({ values, plaintext }, { type, text }) => {
      if (type !== 'plaintext') {
        if (plaintext.length !== 0) {
          values.push({ type: 'plaintext', text: ''.concat(...plaintext) })
          plaintext = []
        }
        values.push({ type, text })
      } else {
        plaintext.push(text)
      }
      return { values, plaintext }
    },
    { values: [] as TextItem[], plaintext: [] as string[] }
  )

  if (res.plaintext.length !== 0) {
    res.values.push({ type: 'plaintext', text: ''.concat(...res.plaintext) })
  }
  values = res.values
  return values
}

export const text: P.P<Text> = Seq(seq => {
  let values: TextItem[] = seq.next(P.some(P.any(styles, plaintext, catchall))) || []
  return { type: 'text', text: flattenText(values) }
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
export interface List {
  type: 'list'
  listitem: string
  text: Text | Link
}
export interface Line {
  type: 'line'
  indent: number
  text: Link | Comment | List
}

export const linktext: P.P<string> = P.surrounds(P.s`[`, P.regexp(/[^\]\n]*/), P.s`]`)
export const linkref: P.P<string> = P.surrounds(P.s`(`, P.regexp(/[^)\n]*/), P.s`)`)

export const link: P.P<Link> = Seq(seq => {
  const text = seq.next(P.any(linktext, P.regexp(/^http\S*/)))
  const link = seq.next(P.optional(linkref))
  return { type: 'link', text, link }
})

export const comment: P.P<Comment> = Seq(seq => {
  seq.next(L.comment)
  const text = seq.next(L.sameline) || ''
  return { type: 'comment', text }
})

export const list: P.P<List> = Seq(seq => {
  const listitem = seq.next(P.any(L.unorderedListItem, L.labledListItem, L.timeListItem))
  const text_ = seq.next(P.optional(P.ignore(L.space, P.any(link, text))))
  return { type: 'list', listitem, text: text_ }
})

export const indent: P.P<number> = P.map(L.startofline, (spaces: string) => spaces.length)

export const line: P.P<Line> = Seq(seq => {
  const indent_ = seq.next(indent) || 0
  const text_ = seq.next(P.any(styles, list, link, comment))
  return { type: 'line', indent: indent_, text: text_ }
})

/***********************************************************************
 * Zettelkasten
 ***********************************************************************/
export interface Tag {
  type: Type
  num: number
  text: Text | Link
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

export type Syntax = {
  comment: Comment
  list: List
  link: Link
} & {
  [key in TextItem['type']]: Text
} & {
  [key in keyof Zettel]: Zettel[key]
}

export type Type = keyof Zettel

export type ZettelLine = Zettel[Type]

export const tag: P.P<Tag> = Seq(seq => {
  const num = seq.next(L.tag)?.length || 0
  const text_ = seq.next(P.any(link, text))
  return { type: 'tag', num, text: text_ }
})

export const zettellines: P.P<ZettelLine[]> = Seq(seq => {
  const lines: ZettelLine[] = seq.next(
    P.many(
      P.any(
        line,
        tag,
        P.map(L.newlines, (newlines: string) => ({ type: 'empty', num: newlines.length - 1 })),
        text
      )
    )
  ) || []
  return lines
})
