import React, { useState, useEffect } from 'react';
import { TwelveDataProvider, saveApiKey, loadApiKey, clearApiKey } from '../providers/twelveData';

interface ApiKeyInputProps {
  onApiKeyChange: (apiKey: string | null, provider: TwelveDataProvider | null) => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeyChange }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load saved API key on component mount
  useEffect(() => {
    const savedKey = loadApiKey();
    if (savedKey) {
      setApiKey(savedKey);
      const provider = new TwelveDataProvider(savedKey);
      onApiKeyChange(savedKey, provider);
    }
  }, [onApiKeyChange]);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setConnectionStatus('idle');
    setErrorMessage('');
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setErrorMessage('Please enter an API key');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setErrorMessage('');

    try {
      const provider = new TwelveDataProvider(apiKey.trim());
      const isValid = await provider.testConnection();
      
      if (isValid) {
        saveApiKey(apiKey.trim());
        setConnectionStatus('success');
        onApiKeyChange(apiKey.trim(), provider);
      } else {
        setConnectionStatus('error');
        setErrorMessage('API key test failed. Please check your key and try again.');
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setApiKey('');
    setConnectionStatus('idle');
    setErrorMessage('');
    onApiKeyChange(null, null);
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: 6,
    minWidth: 300,
    fontFamily: 'monospace',
    fontSize: 14
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #ccc',
    backgroundColor: '#f8f9fa',
    cursor: 'pointer',
    fontSize: 14
  };

  const successStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    color: '#155724'
  };

  const errorStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    color: '#721c24'
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 4 }}>
          Twelve Data API Key
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type={isVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="Enter your Twelve Data API key"
            style={inputStyle}
            disabled={isTestingConnection}
          />
          <button
            onClick={() => setIsVisible(!isVisible)}
            style={buttonStyle}
            type="button"
          >
            {isVisible ? '👁️‍🗨️ Hide' : '👁️ Show'}
          </button>
          <button
            onClick={handleSaveApiKey}
            disabled={isTestingConnection || !apiKey.trim()}
            style={connectionStatus === 'success' ? successStyle : buttonStyle}
            type="button"
          >
            {isTestingConnection ? '⏳ Testing...' : connectionStatus === 'success' ? '✅ Connected' : '🔗 Test & Save'}
          </button>
          {apiKey && (
            <button
              onClick={handleClearApiKey}
              style={buttonStyle}
              type="button"
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      {connectionStatus === 'success' && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: 4,
          color: '#155724',
          fontSize: 12
        }}>
          ✅ API key validated and saved. You can now fetch real-time prices.
        </div>
      )}

      {connectionStatus === 'error' && errorMessage && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: 4,
          color: '#721c24',
          fontSize: 12
        }}>
          ❌ {errorMessage}
        </div>
      )}

      <div style={{
        fontSize: 11,
        color: '#6c757d',
        marginTop: 4,
        lineHeight: 1.4
      }}>
        Get your free API key at{' '}
        <a href="https://twelvedata.com/pricing" target="_blank" rel="noopener noreferrer">
          twelvedata.com
        </a>
        . Free tier includes 800 requests/day.
      </div>
    </div>
  );
};