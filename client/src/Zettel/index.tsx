import { render } from './Render'
import { parse } from './Parser'
import { zettel } from './Syntax'

export const Zettel = ({content}) => {
  if (content) {
    return render(parse(content, zettel).value)
  } else {
    return null
  }
}

export default Zettel
