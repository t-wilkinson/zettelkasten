// import ZettelParser from "./ZettelParser"

function renderLine(text) {
  return <li style={{ listStyle: 'none' }}>
    {text}
  </li>
}

function renderFile(body) {
  return body.split(/\n/)
    .map(renderLine)
}

function Render({file}) {
  return renderFile(file.body)
}

export default Render
