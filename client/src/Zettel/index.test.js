import * as P from './Parser'
import * as L from './Lexer'
import * as S from './Syntax'
import * as R from './Render'

import { render } from '@testing-library/react'

function run(str, parser, expects = { value: str }) {
  expect(P.parse(str, parser)).toMatchObject(expects)
}

const value = (str, parser, value = str) => run(str, parser, { value })

describe('Parser', () => {
  it('works', () => {
    run('hello', P.sequence(P.s`hel`, P.s`lo`))
  })

  test('some', () => {
    value('---', P.some(P.s`-`), '---'.split(''))
    run('', P.some(P.s`-`), { success: false })
  })

  test('regexp', () => {
    run('hello', P.regexp(/hello/))
    value('hello', P.many(P.regexp(/[helo]/)), 'hello'.split(''))
  })

  test('either', () => {
    run('hello', P.either(P.regexp(/n/), P.regexp(/hello/)), { value: 'hello' })
  })

  test('ignore', () => {
    run('hello', P.ignore(P.s`he`, P.s`llo`), { value: 'llo' })
  })
})

describe('Lexer', () => {
  it('works', () => {
    run('   ', L.spaces)
  })

  test('operator', () => {
    run(' -> ', L.operator)
    run('-> ', L.operator, { success: false })
  })

  test('sameline', () => {
    run('asdfasldf sdfs', L.sameline)
  })

  test('tag', () => {
    run('@', L.tag)
    run('@@', L.tag)
  })

  test('list items', () => {
    value('ab.', L.labledListItem)
    value('ab.cd.', L.labledListItem)
    value('ab.cd.ef.', L.labledListItem)
  })
})

describe('Syntax', () => {
  const tag = (text, num=1) => ({ num, type: 'tag', text: { text:  [ { text, type: 'plaintext'} ] } })

  test('tag', () => {
    value('@@Tag', S.tag, tag('Tag', 2))
  })

  test('indent', () => {
    value('    ', S.indent, 4)
    value('    asdf', S.indent, 4)
    value('asdf    ', S.indent, 0)
  })

  const text = (...values) => ({ type: 'text', text: values })

  const line = (lineitem, text, indent) => ({
    type: 'line',
    lineitem,
    text,
    indent,
  })
  const link = (text, link) => ({ text, link, type: 'link' })
  const plain = text => ({
    type: 'text',
    text: text === undefined ? [] : [{ type: 'plaintext', text }],
  })
  const comment = text => ({ type: 'comment', text })
  const empty = (num = 0) => ({ type: 'empty', num })

  test.each([
    ['$', plain('$')],
    ['"', plain('"')],
    ['text => ', text({text: 'text', type: 'plaintext'}, { text: '=>', type: 'operator' })],
    [' => ', text({ text: '=>', type: 'operator' })],
    [' =>  text', text({ text: '=>', type: 'operator' }, { text: ' text', type: 'plaintext' })],
    [
      'asdf $tex$ asdf',
      text(
        { text: 'asdf ', type: 'plaintext' },
        { type: 'inlinetex', text: 'tex' },
        { text: ' asdf', type: 'plaintext' }
      ),
    ],
    ['asdf "quote" asdf', text({ text: 'asdf ' }, { text: 'quote' }, { text: ' asdf' })],
    [
      'asdf "quote" $tex$ asdf',
      text(
        { text: 'asdf ' },
        { type: 'quote', text: 'quote' },
        { text: ' ' },
        { type: 'inlinetex', text: 'tex' },
        { text: ' asdf' }
      ),
    ],
  ])('text: %s', (str, expect) => value(str, S.text, expect))

  test('link', () => {
    value('[text](link)', S.link, { text: 'text', link: 'link' })
  })
  test('comment', () => {
    value('> asdf', S.comment, { type: 'comment', text: 'asdf' })
  })

  test.each([
    ['- line text', S.line, line('-', plain('line text'), 0)],
    ['    - line text', S.line, line('-', plain('line text'), 4)],
    ['  ab. line text', S.line, line('ab.', plain('line text'), 2)],
    ['ab.cd.ef. line text', S.line, line('ab.cd.ef.', plain('line text'), 0)],
    ['    [text](link)', S.line, line(link('text', 'link'), plain(), 4)],
    ['    > text', S.line, line(comment('text'), plain(), 4)],
  ])('line: %s', value)

  test.each([
    // [`  => text`, [text({ text: '=>', type: 'operator' }, { text: 'text', type: 'plaintext' })]],
    [`  > text`, [line(comment('text'), plain(), 2)]],
    [
      `  > one\n  > two`,
      [line(comment('one'), plain(), 2), empty(), line(comment('two'), plain(), 2)],
    ],
    [
      `\nfirst\n  - second\n`,
      [empty(), plain('first'), empty(), line('-', plain('second'), 2), empty()],
    ],
    [`\n- thoughts\n`, [empty(), line('-', plain('thoughts'), 0), empty()]],
    [
      `- thoughts\n[text](link)`,
      [line('-', plain('thoughts'), 0), empty(), line(link('text', 'link'), plain(), 0)],
    ],
    [
      `[text](link)\n- thoughts`,
      [line(link('text', 'link'), plain(), 0), empty(), line('-', plain('thoughts'), 0)],
    ],
  ])('zettel:\n%s', (str, v) => value(str, S.zettel, v))
})

describe('Renderer', () => {
  it.skip('works', () => {
    const syntaxes = P.parse(
      `
@Tag
  - First thought
  - Second thought
`,
      S.zettel
    ).value
    render(R.render(syntaxes))
  })
})
