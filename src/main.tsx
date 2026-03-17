import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<Props, State> {
    public state: State = { hasError: false, error: null };
    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }
    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }
    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: '#ff4444', background: '#111', height: '100vh', width: '100vw', boxSizing: 'border-box' }}>
                    <h2>アプリケーションの初期化に失敗しました。</h2>
                    <p>このエラーメッセージをコピーして教えてください：</p>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', background: '#000', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
                        {this.state.error?.toString()}
                        <br /><br />
                        {this.state.error?.stack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)
