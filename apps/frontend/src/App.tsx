// src/App.tsx
import { UrlShortener } from './components/UrlShortener'
import { useTheme } from './contexts/ThemeContext'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'

function App() {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <div className={`min-h-screen w-full overflow-x-hidden transition-colors duration-200 flex flex-col ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <header className={`w-full ${
        isDarkMode ? 'bg-gray-800 shadow-gray-700' : 'bg-white'
      } shadow-sm`}>
        <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            MyTinyURL
          </h1>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${
              isDarkMode 
                ? 'text-yellow-400 hover:bg-gray-700' 
                : 'text-gray-600 hover:bg-gray-100'
            } transition-colors`}
            aria-label="Alternar tema"
          >
            {isDarkMode ? (
              <SunIcon className="h-6 w-6" />
            ) : (
              <MoonIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className={`w-full ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } shadow rounded-lg p-6`}>
          <h2 className={`text-xl font-semibold mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Encurte suas URLs rapidamente
          </h2>
          <UrlShortener />
        </div>

        <div className="mt-12 w-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Rápido e Simples",
              description: "Encurte suas URLs em segundos, sem necessidade de cadastro."
            },
            {
              title: "Estatísticas",
              description: "Acompanhe o número de cliques e acessos às suas URLs encurtadas."
            },
            {
              title: "Personalizado",
              description: "URLs curtas e fáceis de compartilhar em qualquer lugar."
            }
          ].map((feature, index) => (
            <div key={index} className={`${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } p-6 rounded-lg shadow transition-colors duration-200`}>
              <h3 className={`text-lg font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {feature.title}
              </h3>
              <p className={`mt-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className={`w-full ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border-t mt-auto`}>
        <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className={`text-center ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            © 2025 MyTinyURL. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
