import React from 'react'

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Cropoctor Error Boundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-cream p-8 text-center">
          <div className="text-6xl mb-6">🌱</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong.</h1>
          <p className="text-gray-500 mb-8 max-w-sm">
            We're sorry for the inconvenience. Please try reloading the app.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-forest text-white px-6 py-3 rounded-2xl font-semibold shadow-button hover:bg-[#256427] transition-colors"
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
