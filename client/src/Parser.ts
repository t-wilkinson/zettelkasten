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

export interface Response<Value = any> {
  ctx: Ctx
  success: boolean
  value?: Value
  reason?: string
}

export type Parser<Value = any> = (ctx: Ctx) => Response<Value>

export type R<Value = any> = Response<Value>
export type C = Ctx
export type P<Value = any> = Parser<Value>

export const parse = (text: string, p: P) => p({ text, i: 0 })
export const success = <Value = any>(ctx: C, value: Value = '' as any, i = ctx.i) => ({
  ctx: { ...ctx, i },
  value,
  success: true,
})
const failure = (ctx: C, reason = 'Failed for unknown reason') => ({
  ctx,
  reason,
  success: false,
})

// Apply parser to ctx and return result along with other variables in scope
// Useful helper function for defining many parsers in oneline
export const bind =
  <Return = any, Value = any>(
    fn: (r: R<Value>, ctx: C, p: P<Value>, ...args: any[]) => R<Return>
  ) =>
  (p: P<Value>, ...args: any[]) =>
  (ctx: C) =>
    fn(p(ctx), ctx, p, ...args)
export const map: <Value = any>(p: P, fn: (value: any) => Value) => (ctx: C) => R<Value> = bind(
  (r, _ctx, _p, fn: (value: any) => R) => (r.success ? success(r.ctx, fn(r.value)) : r)
)

export const many: <Value>(p: P<Value>) => (ctx: C) => R<Value[]> = bind((r, ctx, p) => {
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

export const some: <Value>(p: P<Value>) => (ctx: C) => R<Value[]> = bind((r, _ctx, p) => {
  if (!r.success) {
    return { ...r, value: [] }
  } else {
    const r2 = many(p)(r.ctx)
    r2.value.unshift(r.value)
    return r2
  }
})

const combine = bind((r1, _ctx, _p1, p2): R => {
  if (!r1.success) return r1
  const r2 = p2(r1.ctx)
  return { ...r2, value: r1.value + r2.value }
})

export const ignore = bind((r, _ctx, _p1, p2) => (r.success ? p2(r.ctx) : r))
export const optional = bind((r, ctx) => (r.success ? success(r.ctx, r.value) : success(ctx)))
export const sequence = (...ps: P[]) => (ps.length === 0 ? success : ps.reduce(combine))
type Any = any
// type Any = <T extends P[]>(...ps: T) => (ctx: C) => ReturnType<T[number]>
export const any: Any = (...ps: P[]) => (ps.length === 0 ? success : ps.reduceRight(either))
export const eof = (ctx: C) => ctx.i === ctx.text.length - 1

export const either: <V1, V2>(p1: P<V1>, p2: P<V2>) => (ctx: C) => R<V1 | V2> = bind(
  (r, ctx, _p1, p2) => (r.success ? r : p2(ctx))
)

export const s = (strings: TemplateStringsArray) => str(strings[0])
export const str = (str: string) => (ctx: C) => {
  const s = ctx.i
  const e = s + str.length
  if (ctx.text.substring(s, e) === str) {
    return success(ctx, str, e)
  } else {
    return failure(ctx, `Could not find str "${str}" at ${ctx.i}`)
  }
}

export const regexp = (regexp: RegExp) => (ctx: C) => {
  const res = regexp.exec(ctx.text.substring(ctx.i))
  if (!res) {
    return failure(ctx, `Could not match regexp ${regexp.toString()}`)
  }
  return success(ctx, res[0], ctx.i + res[0].length)
}

export class Sequence {
  r$: R // The last response
  initialCtx: C

  constructor(ctx: C) {
    this.initialCtx = ctx
  }

  next<Value = any>(p: P<Value>): Value {
    if (!this.r$) {
      this.r$ = p({...this.initialCtx})
      return this.r$.value
    }
    if (!this.r$.success) return
    this.r$ = p(this.r$.ctx)
    return this.r$.value
  }

  end<Value = any>(value: Value) {
    // return failure(this.initialCtx, this.r$.reason)
    // if (!this.r$.success) {
    //   return failure(this.initialCtx, this.r$.reason)
    // }
    return { ...this.r$, value }
  }
}

export const Seq: <Value>(fn: (acc: Sequence) => Value) => P<Value> = fn => ctx => {
  const seq = new Sequence(ctx)
  const value = fn(seq)
  return seq.end(value)
}

export const surrounds = (left: P, inner: P, right: P = left) =>
  Seq(seq => {
    seq.next(left)
    const value = seq.next(inner)
    seq.next(right)
    return value
  })

// Doing this requires passing backtracking information on all failures
// export const not = bind((r, ctx) => r.success ? failure(ctx, `Not supposed to match parser with ${r.value}`) : success(r.ctx, ctx.text.substring(ctx.i, r.ctx.i)))

// export const ignoreSeq = (...ps: P[]) => ps.length === 0 ? success : ps.reduce(ignore as any)

// export const merge = (rs: R[], i: number) => ({ ...rs[rs.length - 1], value: rs[i].value })
// export const switchValue = (r: R, value: any) => ({...r, value })

// const satisfy = fn => ctx => fn(ctx.text[ctx.i])
//   ? success(ctx, ctx.text[ctx.i], ctx.i + 1)
//   : failure(ctx, `Could not satisfy parser on ${ctx.text[ctx.i]} at ${ctx.i}`)
