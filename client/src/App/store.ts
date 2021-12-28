import React from 'react'
import { ZettelFile } from '../Zettel/api'

export interface State {
  files: ZettelFile[]
  index: number
  menuOpen: boolean
}

export type Action =
  { type: 'remove-file'; index: number } |
  { type: 'create-file'; file: ZettelFile } |
  { type: 'update-file'; file: ZettelFile } |
  { type: 'update-files'; files: ZettelFile[] } |

  { type: 'clear-index' } |
  { type: 'reset-index' } |
  { type: 'set-index'; index: number} |

  { type: 'open-menu' } |
  { type: 'close-menu' } |
  { type: 'toggle-menu' }

export const initialState: State = {
  files: [],
  index: -1,
  menuOpen: false,
}

export const reducer = (state: State, action: Action): State => {
  let files: ZettelFile[]
  switch (action.type) {
    case 'update-file':
      files = state.files.slice(0)
      files[state.index] = action.file
      return { ...state, files }
    case 'update-files':
      return { ...state, files: action.files }
    case 'remove-file':
      files = state.files.slice(0)
      files.splice(action.index, 1)
      return {...state, files}
    case 'create-file':
      files = state.files.slice(0)
      files.push(action.file)
      return {...state, files, index: files.length - 1}

    case 'clear-index':
      return { ...state, index: -1 }
    case 'reset-index':
      return { ...state, index: -1 }
    case 'set-index':
      return { ...state, index: action.index }

    case 'open-menu':
      return { ...state, menuOpen: true }
    case 'close-menu':
      return { ...state, menuOpen: false }
    case 'toggle-menu':
      return { ...state, menuOpen: !state.menuOpen }

    default:
      console.error(action)
      return state
  }
}

export const StoreContext = React.createContext({
  state: undefined as any,
  dispatch: undefined as any,
} as { state: State; dispatch: (action: Action) => void })
