import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error("Unexpected UI error:", error); }
  render() {
    if (this.state.hasError) {
      return <div className="error-state" role="alert"><h2>Something went wrong</h2><p>Please reload the application and try again.</p><button type="button" className="button button-primary" onClick={() => window.location.reload()}>Reload application</button></div>;
    }
    return this.props.children;
  }
}
