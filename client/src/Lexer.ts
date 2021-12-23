import * as P from './Parser'

export const space = P.s` `
export const spaces = P.regexp(/ */)
export const newline = P.regexp(/\n/)
export const sameline = P.regexp(/[^\n]+/)
export const startofline = P.regexp(/\n? */)
export const comment = P.s`> `
export const tag = P.regexp(/@+/)

export const notnewline = P.regexp(/^[^\n]/)
export const notcode = P.regexp(/[^$]+/)
export const plaintext = P.regexp(/^[^$\n]+/)

export const alphanumeric = P.regexp(/^[A-Za-z0-9]+/)
export const operator = P.regexp(/^ (:|:=|<->|<-|->|~>|<=>|=>|!=|==|\+|vs\.) /)

export const unorderedListItem = P.regexp(/^[-+!*¿?✘★✓]/)
export const labledListItem = (ctx: P.C) => P.seq(alphanumeric, P.s`.`, P.either(labledListItem, P.empty))(ctx)
