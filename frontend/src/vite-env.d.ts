/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string
      poster?: string
      alt?: string
      ar?: boolean
      'ar-modes'?: string
      'camera-controls'?: boolean
      'auto-rotate'?: boolean
      exposure?: string
      'shadow-intensity'?: string
      'interaction-prompt'?: string
    }
  }
}
