// apps/frontend/src/components/UrlShortener.tsx
import { useState } from 'react'
import { ArrowPathIcon, ClipboardIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../contexts/ThemeContext'

interface ApiResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  expiresAt?: string;
}

export function UrlShortener() {
  const [url, setUrl] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { isDarkMode } = useTheme()

  const shortenUrl = async (e: React.FormEvent) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    e.preventDefault()
    setLoading(true)
    setError(null)
    setCopied(false)
    
    try {
      const response = await fetch(`${API_URL}/api/shorten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originalUrl: url }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao encurtar URL')
      }

      const data: ApiResponse = await response.json()
      setShortUrl(data.shortUrl)
      setUrl('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao encurtar URL')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error(error);
      setError('Erro ao copiar para a área de transferência')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={shortenUrl} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cole sua URL aqui"
            className={`flex-1 px-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors`}
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              'Encurtar'
            )}
          </button>
        </div>

        {error && (
          <div className={`p-3 ${
            isDarkMode ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-700'
          } rounded-lg`}>
            {error}
          </div>
        )}
      </form>

      {shortUrl && (
        <div className={`mt-6 p-4 ${
          isDarkMode ? 'bg-gray-700' : 'bg-green-50'
        } rounded-lg`}>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>URL encurtada:</p>
          <div className="flex items-center gap-2 mt-1">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              } hover:underline flex-1 truncate`}
            >
              {shortUrl}
            </a>
            <button
              onClick={copyToClipboard}
              className={`p-2 ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors`}
              title="Copiar para área de transferência"
            >
              <ClipboardIcon className="h-5 w-5" />
            </button>
          </div>
          {copied && (
            <p className={`text-sm mt-1 ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`}>
              Copiado para a área de transferência!
            </p>
          )}
        </div>
      )}
    </div>
  )
}