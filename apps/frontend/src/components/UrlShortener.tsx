import { useState } from 'react'
import { ArrowPathIcon, LinkIcon, ClipboardIcon } from '@heroicons/react/24/outline'

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

  const API_URL = import.meta.env.VITE_API_URL

  const shortenUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setCopied(false)
    
    try {
      const response = await fetch(`${API_URL}/shorten`, {
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
      console.error(error)
      setError('Erro ao copiar para a área de transferência')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={shortenUrl} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-grow">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Cole sua URL aqui"
              className="w-full pl-4 pr-10 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center sm:w-auto w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Encurtar</span>
                <LinkIcon className="h-5 w-5 sm:hidden" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </form>

      {shortUrl && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600">URL encurtada:</p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all flex-grow"
            >
              {shortUrl}
            </a>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
              title="Copiar para área de transferência"
            >
              <ClipboardIcon className="h-5 w-5" />
              <span className="sm:hidden">Copiar</span>
            </button>
          </div>
          {copied && (
            <p className="text-sm text-green-600 mt-1">
              Copiado para a área de transferência!
            </p>
          )}
        </div>
      )}
    </div>
  )
}