import React from 'react'
import { Files } from '../Zettel/api'

export interface State {
  files: Files
  index: number
  menuOpen: boolean
}

export type Action = any

export const initialState: State = {
  files: [],
  index: -1,
  menuOpen: false,
}

export const reducer = (state: any, action: any) => {
  switch (action.type) {
    case 'set-file':
      const files = state.files.slice(0)
      files[state.index] = action.file
      return { ...state, files }
    case 'update-files':
      return { ...state, files: action.files }

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
