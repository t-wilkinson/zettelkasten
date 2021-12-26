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
  const tag = (text, num = 1) => ({
    num,
    type: 'tag',
    text: { text: [{ text, type: 'plaintext' }] },
  })

  test('tag', () => {
    value('@@Tag', S.tag, tag('Tag', 2))
  })

  test('indent', () => {
    value('    ', S.indent, 4)
    value('    asdf', S.indent, 4)
    value('asdf    ', S.indent, 0)
  })

  const text = (...values) => ({ type: 'text', text: values })

  const line = (indent, text) => ({
    type: 'line',
    indent,
    text,
  })
  const list = (listitem, text) => ({ type: 'list', listitem, text })
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
    ['text => ', text({ text: 'text', type: 'plaintext' }, { text: '=>', type: 'operator' })],
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
    ['- line text', S.line, line(0, list('-', plain('line text')))],
    ['  - line text', S.line, line(2, list('-', plain('line text')))],
    ['  ab. line text', S.line, line(2, list('ab.', plain('line text')))],
    ['ab.cd.ef. line text', S.line, line(0, list('ab.cd.ef.', plain('line text')))],
    ['  [text](link)', S.line, line(2, link('text', 'link'))],
    ['  > text', S.line, line(2, comment('text'))],
  ])('line: %s', value)

  test.each([
    ['', []],
    [
      `  => text`,
      [
        text(
          { text: ' ', type: 'plaintext' },
          { text: '=>', type: 'operator' },
          { text: 'text', type: 'plaintext' }
        ),
      ],
    ],
    [`  > text`, [line(2, comment('text'))]],
    [`  > one\n  > two`, [line(2, comment('one')), empty(), line(2, comment('two'))]],
    [
      `\nfirst\n  - second\n`,
      [empty(), plain('first'), empty(), line(2, list('-', plain('second'))), empty()],
    ],
    [`\n- thoughts\n`, [empty(), line(0, list('-', plain('thoughts'))), empty()]],
    [
      `- thoughts\n[text](link)`,
      [line(0, list('-', plain('thoughts'))), empty(), line(0, link('text', 'link'))],
    ],
    [
      `[text](link)\n- thoughts`,
      [line(0, link('text', 'link')), empty(), line(0, list('-', plain('thoughts')))],
    ],
  ])('zettel:\n%s', (str, v) => value(str, S.zettellines, v))
})

describe('Renderer', () => {
  it.skip('works', () => {
    const syntaxes = P.parse(
      `
@Tag
  - First thought
  - Second thought
`,
      S.zettellines
    ).value
    render(R.render(syntaxes))
  })
})
