import React, { useState, useEffect } from 'react';
import { Download, Music, Play, Volume2, XCircle, CheckCircle } from 'lucide-react';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [currentTheme, setCurrentTheme] = useState('default');
  const [status, setStatus] = useState({ message: 'Ready - Paste a URL to get started', type: 'idle' });

  // Theme detection logic (no changes here)
  useEffect(() => {
    const detectTheme = (url: string) => {
      if (!url.trim()) return 'default';
      if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
      if (url.includes('spotify.com')) return 'spotify';
      return 'default';
    };
    const newTheme = detectTheme(inputValue);
    setCurrentTheme(newTheme);
  }, [inputValue]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setStatus({ message: 'Ready', type: 'idle' }); // Reset status on new input
  };

  // --- MODIFIED DOWNLOAD HANDLER ---
  const handleDownload = async () => {
    if (!inputValue.trim()) return;

    setStatus({ message: 'Preparing download...', type: 'loading' });

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: inputValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An unknown error occurred.');
      }

      setStatus({ message: 'Success! Your download will start now.', type: 'success' });

      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.setAttribute('download', ''); // This encourages the browser to download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error: any) {
      setStatus({ message: `Error: ${error.message}`, type: 'error' });
    }
  };

  // Get theme-appropriate icon
  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'youtube': return <Play className="w-8 h-8" />;
      case 'spotify': return <Volume2 className="w-8 h-8" />;
      default: return <Music className="w-8 h-8" />;
    }
  };

  const isButtonDisabled = status.type === 'loading' || !inputValue.trim();

  return (
    <div className={`app-container theme-${currentTheme}`}>
      <div className="main-container">
        <div className="header">
          <div className="icon-container">{getThemeIcon()}</div>
          <h1 className="title">AudioGrab</h1>
          <p className="subtitle">Download audio from YouTube and Spotify</p>
        </div>

        <div className="input-section">
          <input
            type="url"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Paste your YouTube or Spotify link here..."
            className="url-input"
          />
        </div>

        <div className="button-section">
          <button
            onClick={handleDownload}
            disabled={isButtonDisabled}
            className="download-button"
          >
            {status.type === 'loading' ? (
              <>
                <div className="spinner"></div>
                <span>Converting...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download .wav</span>
              </>
            )}
          </button>
        </div>

        <div className="status-section">
          <div className={`status-indicator status-${status.type}`}>
            {status.type === 'error' && <XCircle className="w-5 h-5" />}
            {status.type === 'success' && <CheckCircle className="w-5 h-5" />}
            <span>{status.message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;