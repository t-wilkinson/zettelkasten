import * as P from './Parser'

export const space = P.s` `
export const spaces = P.regexp(/ */)
export const newlines = P.regexp(/^\n+/)
export const sameline = P.regexp(/[^\n]+/)
export const startofline = P.regexp(/^ */)
export const comment = P.s`> `
export const tag = P.regexp(/^@+/)

export const notnewline = P.regexp(/^[^\n]/)
export const notinlinetex = P.regexp(/^[^$\n]+/)
export const notblocktex = P.regexp(/^[^$$]+/)
export const notquote = P.regexp(/[^"\n]+/)

export const plaintext = P.regexp(/^[^$"\n]+/)
export const alphanumeric = P.regexp(/^[A-Za-z0-9]+/)
export const operator = P.regexp(/^ (:|:=|<->|<-|->|~>|<=>|=>|!=|==|\+|vs\.) /)
export const catchall = P.regexp(/^[$"]/)

export const unorderedListItem = P.regexp(/^[-+!*¿?✘★✓]/)
export const labledListItem = (ctx: P.C) =>
  P.sequence(alphanumeric, P.s`.`, P.either(labledListItem, P.success))(ctx)
