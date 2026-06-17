import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: "#ffb4ab", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
          <h2>Something broke</h2>
          <p>{String(this.state.error?.message || this.state.error)}</p>
          <pre style={{ fontSize: 11, opacity: 0.7 }}>{this.state.error?.stack}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 12, color: "#ddb7ff" }}>
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
