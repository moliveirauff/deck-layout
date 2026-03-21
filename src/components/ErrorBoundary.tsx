import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Global ErrorBoundary — catches any unhandled render errors and shows a
 * recovery UI instead of a blank/black screen.
 *
 * Wrap the entire app or specific subtrees (e.g. canvas, 3D viewer) to
 * prevent one broken component from taking down the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught render error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-5 max-w-md">
            <h2 className="text-base font-semibold text-red-700">Something went wrong</h2>
            <p className="mt-1 text-sm text-red-600">
              {this.state.error?.message ?? 'An unexpected error occurred in this section.'}
            </p>
            <button
              onClick={this.handleReset}
              className="mt-4 rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
