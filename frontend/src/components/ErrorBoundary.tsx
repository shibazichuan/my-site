import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">出了点问题</h1>
            <p className="text-gray-500 mb-6">页面遇到了意外错误，请刷新重试</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700">刷新页面</button>
              <Link to="/" className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm hover:bg-gray-50">返回首页</Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
