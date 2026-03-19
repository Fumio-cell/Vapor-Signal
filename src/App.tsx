import { useState, useCallback, useEffect } from 'react'
import './App.css'
import { UploadPanel } from './components/UploadPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { ControlPanel } from './components/ControlPanel'
import { ExportPanel } from './components/ExportPanel'
import { Header } from './components/Header'
import { signInWithGoogle, openLemonSqueezyCheckout } from './lib/commercial'

function App() {
    const [userStatus, setUserStatus] = useState<{ user: any, isPro: boolean }>({ user: null, isPro: false });

    const handleAuthStatus = useCallback((e: any) => {
        setUserStatus(e.detail);
    }, []);

    useEffect(() => {
        window.addEventListener('auth:status', handleAuthStatus as EventListener);
        return () => window.removeEventListener('auth:status', handleAuthStatus as EventListener);
    }, [handleAuthStatus]);

    useEffect(() => {
        const handleBuyPro = () => {
            if (!userStatus.user) {
                alert('Please login first to upgrade to PRO.');
                signInWithGoogle();
                return;
            }
            openLemonSqueezyCheckout(userStatus.user.id);
        };

        window.addEventListener('app:buyPro', handleBuyPro);
        return () => window.removeEventListener('app:buyPro', handleBuyPro);
    }, [userStatus]);

    return (
        <div className="app-container">
            <Header />

            <main className="app-main">
                <div className="left-col">
                    <UploadPanel />
                </div>

                <div className="center-col">
                    <PreviewPanel />
                </div>

                <div className="right-col">
                    <ControlPanel />
                </div>
            </main>

            <footer className="app-footer">
                <ExportPanel />
            </footer>
        </div>
    )
}

export default App
