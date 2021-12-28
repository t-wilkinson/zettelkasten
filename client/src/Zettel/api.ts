import { dispatch } from '../Events'

export type File = { name: string; body: string }
export type Files = File[]

const apiUrl = 'http://localhost:4000'

const getFile = async (name: string): Promise<File> =>
  fetch(`${apiUrl}/zettels/${name}`, {
    method: 'GET',
  })
    .then(res => res.json())
    .then(res => {
      dispatch({ type: 'get-file', data: name, status: 'debug' })
      return res
    })

const getFiles = async () =>
  fetch(`${apiUrl}/zettels`, {
    method: 'GET',
  })
    .then(res => res.json())
    .then(res => {
      dispatch({ type: 'get-files', status: 'debug' })
      return res
    })

const saveFile = (name: string, body: string) =>
  fetch(`${apiUrl}/zettels/${name}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'text/plain',
    },
    body,
  }).then(res => {
    dispatch({ type: 'save-file', data: name, status: 'success' })
    return res
  })

const createFile = (tag: string) =>
  fetch(`${apiUrl}/zettels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tag }),
  })

const deleteFile = (name: string) =>
  fetch(`${apiUrl}/zettels/${name}`, {
    method: 'DELETE',
  })

export const api = {
  getFile,
  getFiles,
  saveFile,
  createFile,
  deleteFile,
}
