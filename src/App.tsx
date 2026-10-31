import './App.css'
import { UploadPanel } from './components/UploadPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { ControlPanel } from './components/ControlPanel'
import { ExportPanel } from './components/ExportPanel'
import { Header } from './components/Header'

function App() {
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
