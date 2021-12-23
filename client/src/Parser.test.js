import * as P from './Parser'
import * as L from './Lexer'
import * as S from './Syntax'
import * as R from './Renderer'

import { render } from '@testing-library/react'

function run(str, parser, expects = { value: str }) {
  expect(P.run(str, parser)).toMatchObject(expects)
}

const value = (str, parser, value = str) => run(str, parser, { value })

describe('Parser', () => {
  it('works', () => {
    run('hello', P.sequence(P.s`hel`, P.s`lo`))
  })

  //   test('not', () => {
  //     value("-", P.not(P.s`.`), '-')
  //   })

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
  test('tag', () => {
    value('@@Hello world', S.tag, { num: 2, text: 'Hello world' })
  })

  test('indent', () => {
    value('    ', S.indent, 4)
    value('    asdf', S.indent, 4)
    value('asdf    ', S.indent, 0)
  })

  test('code', () => {
    value('$asdf$', S.code, { text: 'asdf' })
  })

  test('text', () => {
    value('asdf $code$ asdf', S.text, [{ text: 'asdf ' }, { text: 'code' }, { text: ' asdf' }])
    value('asdf "quote" asdf', S.text, [{ text: 'asdf ' }, { text: 'quote' }, { text: ' asdf' }])
    value('asdf "quote" $code$ asdf', S.text, [
      { text: 'asdf ' },
      { type: 'quote', text: 'quote' },
      { text: ' ' },
      { type: 'code', text: 'code' },
      { text: ' asdf' },
    ])
  })

  test('link', () => {
    value('[text](link)', S.link, { text: 'text', link: 'link' })
  })

  test('comment', () => {
    value('> asdf', S.comment, { text: 'asdf' })
  })

  test.each([
    [
      '     - line text',
      S.lineitem,
      {
        type: 'lineitem',
        lineitem: '-',
        text: 'line text',
      },
    ],
    [
      '   ab. line text',
      S.lineitem,
      {
        type: 'lineitem',
        lineitem: 'ab.',
        text: 'line text',
      },
    ],
    [
      'ab.cd.ef. line text',
      S.lineitem,
      {
        type: 'lineitem',
        lineitem: 'ab.cd.ef.',
        text: 'line text',
      },
    ],
    [
      '    [text](link)',
      S.lineitem,
      {
        type: 'lineitem',
        lineitem: { text: 'text', link: 'link' },
        text: '',
      },
    ],
  ])('lineitems: %s', value)

  test.each([
    [
      `
first
  - second
`,
      S.zettel,
      [
        null,
        [{ text: 'first', type: 'plaintext' }],
        null,
        {
          text: 'second',
          type: 'lineitem',
          lineitem: '-',
          indent: 2,
        },
        null,
      ],
    ],
    [
      `
- thoughts
`,
      S.zettel,
      [null, { indent: 0, lineitem: '-', text: 'thoughts', type: 'lineitem' }, null],
    ],
    [
      `- thoughts
[text](link)
`,
      S.zettel,
      [
        {
          indent: 0,
          lineitem: '-',
          text: 'thoughts',
          type: 'lineitem',
        },
        null,
        {
          indent: 0,
          lineitem: {
            link: 'link',
            text: 'text',
            type: 'link',
          },
          text: '',
          type: 'lineitem',
        },
        null,
      ],
    ],
    [`[text](link)
- thoughts`,
      S.zettel,
      [
        { type: 'lineitem',
          indent: 0,
          text: '',
          lineitem: {
            type: 'link',
            text: 'text',
            link: 'link',
          },
        },
        null,
        { indent: 0,
          lineitem: '-',
          text: 'thoughts',
          type: 'lineitem',
        }
      ]
    ],

    // [
    //   `@@first
    // @second
    // - third
    // [text](link)

    // - more thoughts`,
    //   S.zettel,
    //   [
    //     { type: 'tag', num: 2, text: 'first' },
    //     { type: 'tag', num: 1, text: 'second' },
    //     {
    //       type: 'lineitem',
    //       lineitem: '-',
    //       indent: 2,
    //       text: 'third',
    //     },
    //     // {
    //     //   type: 'lineitem',
    //     //   indent: 4,
    //     //   lineitem: {
    //     //     type: 'link',
    //     //     text: 'text',
    //     //     link: 'link',
    //     //   },
    //     //   text: '',
    //     // },
    //     // {
    //     //   type: 'lineitem',
    //     //   indent: 0,
    //     //   lineitem: '-',
    //     //   text: 'more thoughts',
    //     // },
    //   ],
    // ],
  ])('zettel:\n%s', value)

  // test.only('zettel', () => {
  //   console.dir(P.run(`[text](link)
// @tag`, S.zettel).value)
  //   console.dir(P.run(`[text](link)
// @tag`, P.many(P.any(L.newline, S.tag, S.lineitem))).value)
  // })
})

describe('Renderer', () => {
  it('works', () => {
    const syntaxes = P.run(
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
