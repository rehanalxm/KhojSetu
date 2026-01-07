import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                    <h1 className="text-3xl font-bold mb-4 text-red-500">Something went wrong</h1>
                    <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full overflow-auto border border-gray-700">
                        <p className="font-mono text-red-300 mb-2">{this.state.error?.name}: {this.state.error?.message}</p>
                        <div className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                            {this.state.error?.stack}
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
