import * as P from './Parser'

export const space = P.s` `
export const spaces = P.regexp(/ */)
export const newlines = P.regexp(/^\n+/)
export const sameline = P.regexp(/[^\n]+/)
export const startofline = P.regexp(/^ */)
export const comment = P.s`> `
export const tag = P.regexp(/^@+/)

export const not = {
  newline: P.regexp(/^[^\n]/),
  inlinetex: P.regexp(/^[^$\n]+/),
  blocktex: P.regexp(/^[^$$]+/),
  quote: P.regexp(/[^"\n]+/),
  code: P.regexp(/[^`]+/),
  strike: P.regexp(/[^~]+/),
  bold: P.regexp(/[^*]+/),
}

export const alphanumeric = P.regexp(/^[A-Za-z0-9]+/)
export const operator = P.regexp(/^ (:|:=|<->|<-|->|~>|<=>|=>|!=|==|\+|vs\.) /)

const ignorechars = '$~`"* '
export const plaintext = P.regexp(new RegExp(`^[^${ignorechars}\\n]+`))
export const catchall = P.regexp(new RegExp(`^[${ignorechars}]`))

export const unorderedListItem = P.regexp(/^[-+!*¿?✘★✓]/)
export const labledListItem = (ctx: P.C) =>
  P.sequence(alphanumeric, P.s`.`, P.either(labledListItem, P.success))(ctx)
