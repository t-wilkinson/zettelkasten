import { dispatch } from '../Events'

export type File = { name: string; body: string }
export type Files = File[]

const getFile = async (name: string): Promise<File> =>
  fetch(`http://localhost:4000/zettels/${name}`, {
    method: 'GET',
  })
    .then(res => res.json())
    .then(res => {
      dispatch({ type: 'get-file', data: name, status: 'debug' })
      return res
    })

const getFiles = async () =>
  fetch('http://localhost:4000/zettels', {
    method: 'GET',
  })
    .then(res => res.json())
    .then(res => {
      dispatch({ type: 'get-files', status: 'debug' })
      return res
    })

const saveFile = (name: string, body: string) =>
  fetch(`http://localhost:4000/zettels/${name}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
    },
    body,
  }).then(res => {
    dispatch({ type: 'save-file', data: name, status: 'success' })
    return res
  })

export const api = {
  getFile,
  getFiles,
  saveFile,
}
