/* ============================================================================ *
 * Key
 * ============================================================================ *
 * p := parser
 * r := parser result; p(ctx)
 * fn := function
 * ctx := context passed to parser including text, position, etc.
 */

export interface Ctx {
  text: string
  i: number
}

export interface Response<Value=any> {
  ctx: Ctx
  success: boolean
  value?: Value
  reason?: string
}

export type Parser<Value=any> = (ctx: Ctx) => Response<Value>

export type R<Value=any> = Response<Value>
export type C = Ctx
export type P<Value=any> = Parser<Value>

export const run = (text: string, p: P) => p({text, i: 0})
export const success = (ctx: C, value: any='', i=ctx.i) => ({ ctx: {...ctx, i}, value, success: true })
const failure = (ctx: C, reason="Failed for unknown reason") => ({ctx, reason, success: false })

// Apply parser to ctx and return result along with other variables in scope
export const bind = (fn: (r: R, ctx: C, p: P, ...args: any[]) => R) => (p: P, ...args: any[]) => (ctx: C) => fn(p(ctx), ctx, p, ...args)

export const map = bind((r, _ctx, _p, fn: (value: any) => R) => r.success ? success(r.ctx, fn(r.value)) : r)

export const many = bind((r, ctx, p) => {
  let values = []
  while (true) {
    if (!r.success) {
      return success(ctx, values)
    }
    ctx = r.ctx
    values.push(r.value)
    r = p(ctx)
  }
})

const combine = bind((r1, _ctx, _p1, p2): R => {
  if (!r1.success) return r1
  const r2 = p2(r1.ctx)
  return {...r2, value: r1.value + r2.value }
})
export const not = bind((r, ctx) => r.success ? failure(ctx, `Not supposed to match parser with ${r.value}`) : success(ctx))
export const optional = bind((r, ctx) => r.success ? success(r.ctx, r.value) : success(ctx))
export const either = bind((r, ctx, _p1, p2) => r.success ? r : p2(ctx))
export const some = bind((r, _ctx, p) => {
  if (!r.success) {
    return r
  } else {
    const r2 = many(p)(r.ctx)
    r2.value.unshift(r.value)
    return r2
  }
})
export const any = (...ps: P[]) => ps.length === 0 ? success : ps.reduce(either as any)
export const empty = (ctx: C) => success(ctx, '')
export const seq = (...ps: P[]) => ps.length === 0 ? success : ps.reduce(combine as any)
export const s = (strings: TemplateStringsArray) => str(strings[0])

export const str = (str: string) => (ctx: C) => {
  const s = ctx.i
  const e = s + str.length
  if (ctx.text.substring(s, e) === str) {
    return success(ctx, str, e)
  } else {
    return failure(ctx, `Could not find "${str}" at ${ctx.i}`)
  }
}

export const regexp = (regexp: RegExp) => (ctx: C) => {
  const res = regexp.exec(ctx.text.substring(ctx.i))
  if (!res) {
    return failure(ctx, `Could not match regexp`)
  }
  return success(ctx, res[0], ctx.i + res[0].length)
}

export class Acc {
  r$: R // The last response
  initialCtx: C

  constructor(ctx: C) {
    this.initialCtx = ctx
  }

  next(p: P) {
    if (!this.r$) {
      this.r$ = p(this.initialCtx)
      return this.r$.value
    }
    if (!this.r$.success) return this.r$.value
    this.r$ = p(this.r$.ctx)
    return this.r$.value
  }

  end(value: any) {
    return { ...this.r$, value }
  }
}

// export const ignore = bind((r1, _ctx, _p1, p2) => {
//   if (!r1.success) return r1
//   const r2 = p2(r1.ctx)
//   return {...r2, value: r2.value }
// })

// export const ignoreSeq = (...ps: P[]) => ps.length === 0 ? success : ps.reduce(ignore as any)

// export const merge = (rs: R[], i: number) => ({ ...rs[rs.length - 1], value: rs[i].value })
// export const switchValue = (r: R, value: any) => ({...r, value })

// const satisfy = fn => ctx => fn(ctx.text[ctx.i])
//   ? success(ctx, ctx.text[ctx.i], ctx.i + 1)
//   : failure(ctx, `Could not satisfy parser on ${ctx.text[ctx.i]} at ${ctx.i}`)
