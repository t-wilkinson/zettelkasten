import * as P from './Parser'
import * as L from './Lexer'
import * as S from './Syntax'

function run(str, parser, expects={ value: str }) {
  expect(P.run(str, parser)).toMatchObject(expects)
}

const value = (str, parser, value=str) => run(str, parser, { value })

describe("Parser", () => {
  it('works', () => {
    run("hello", P.seq(P.s`hel`, P.s`lo`))
  })

  test('not', () => {
    value("-", P.not(P.s`.`), '')
  })

  test('some', () => {
    value("---", P.some(P.s`-`), "---".split(''))
    run("", P.some(P.s`-`), {success: false})
  })

  test('regexp', () => {
    run("hello", P.regexp(/hello/))
    value("hello", P.many(P.regexp(/[helo]/)), 'hello'.split(''))
  })

  test('either', () => {
    run("hello", P.either(P.regexp(/n/), P.regexp(/hello/)), { value: "hello" })
  })

  // test('ignore', () => {
  //   run("hello", P.ignore(P.s`he`, P.s`llo`), {value: 'llo'})
  // })
})

describe("Lexer", () => {
  it('works', () => {
    run("   ", L.spaces)
  })

  test('operator', () => {
    run(" -> ", L.operator)
    run("-> ", L.operator, {success: false})
  })

  test('sameline', () => {
    run('asdfasldf sdfs', L.sameline)
  })

  test('tag', () => {
    run('@', L.tag)
    run('@@', L.tag)
  })
})

describe("Syntax", () => {
  test('tag', () => {
    value('@@Hello world', S.tag, { num: 2, text: 'Hello world' })
  })

  test('link', () => {
    value('[text](link)', S.link, {text: 'text', link: 'link'})
  })

  test('list items', () => {
    value('ab.', L.labledListItem)
    value('ab.cd.', L.labledListItem)
    value('ab.cd.ef.', L.labledListItem)
  })

  test('line', () => {
    value('     - line text', S.line, {lineitem: '-', text: ' line text'})
    value('   ab. line text', S.line, {lineitem: 'ab.', text: ' line text'})
    value('ab.cd.ef. line text', S.line, {lineitem: 'ab.cd.ef.', text: ' line text'})
    value('    [text](link)', S.line, {lineitem: {text: 'text', link: 'link'}, text: ''})
  })

  test('text', () => {
    value('asdf $code$ asdf', S.text, [{text: 'asdf '}, {code: 'code'}, {text: ' asdf'}])
  })

  test('code', () => {
    value('$asdf$', S.code, { code: 'asdf' })
  })
})
