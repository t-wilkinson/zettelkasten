import { render } from './Render'
import { parse } from './Parser'
import { zettellines, ZettelLine } from './Syntax'

export type Tag = {tag: string, num: number}
export type Tags = Tag[]

export function fileTags(content: string): Tags {
  const tags = content.match(/^@.*$/gm) || []
  return tags.map(tag => ({ tag, num: (tag.match(/^@+/g) || [''])[0].length }))
}

export class Zettel {
  content: string
  syntax: ZettelLine[]
  render: React.ReactElement
  tags: Tags

  constructor(content: string) {
    this.content = content || ''
    this.syntax = parse(this.content, zettellines).value
    this.render = render(this.syntax)
    this.tags = fileTags(this.content)
  }
}

export default Zettel
