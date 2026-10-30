import { Component, type ReactNode } from 'react'

/** If the 3D view fails to start (no usable WebGL 2, a context that cannot be created), show the fallback instead of a blank page. */
export class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
