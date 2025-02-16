import { UrlShortener } from "./components/UrlShortener";
import { useTheme } from "./contexts/ThemeContext";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

function App() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden transition-colors duration-200 flex flex-col ${
        isDarkMode 
          ? "bg-[#0F172A]" // Tom profundo de azul-marinho para criar atmosfera sofisticada
          : "bg-[#F8FAFC]" // Cinza azulado super claro para um visual clean
      }`}
    >
      <header
        className={`w-full backdrop-blur-sm ${
          isDarkMode 
            ? "bg-[#1E293B]/80 shadow-lg shadow-black/5" 
            : "bg-white/80 shadow-lg shadow-slate-200/50"
        } transition-all duration-200`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1
            className={`text-2xl font-bold ${
              isDarkMode 
                ? "text-[#E2E8F0]" 
                : "text-[#334155]"
            }`}
          >
            MyTinyURL
          </h1>
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-all duration-200 ${
              isDarkMode
                ? "text-[#FCD34D] hover:bg-[#334155] hover:shadow-lg hover:shadow-black/5"
                : "text-[#64748B] hover:bg-slate-100 hover:shadow-lg hover:shadow-slate-200/50"
            }`}
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
        <div
          className={`w-full ${
            isDarkMode 
              ? "bg-[#1E293B] shadow-lg shadow-black/5" 
              : "bg-white shadow-lg shadow-slate-200/50"
          } rounded-xl p-6 transition-all duration-200`}
        >
          <h2
            className={`text-xl font-semibold mb-6 ${
              isDarkMode ? "text-[#E2E8F0]" : "text-[#334155]"
            }`}
          >
            Encurte suas URLs rapidamente
          </h2>
          <UrlShortener />
        </div>

        <div className="mt-12 w-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: 1,
              title: "Rápido e Simples",
              description: "Encurte suas URLs em segundos, sem necessidade de cadastro.",
            },
            {
              id: 2,
              title: "Estatísticas",
              description: "Acompanhe o número de cliques e acessos às suas URLs encurtadas.",
            },
            {
              id: 3,
              title: "Personalizado",
              description: "URLs curtas e fáceis de compartilhar em qualquer lugar.",
            },
          ].map((feature) => (
            <div
              key={feature.id}
              className={`${
                isDarkMode 
                  ? "bg-[#1E293B] hover:bg-[#263548] shadow-lg shadow-black/5" 
                  : "bg-white hover:bg-slate-50 shadow-lg shadow-slate-200/50"
              } p-6 rounded-xl transition-all duration-200`}
            >
              <h3
                className={`text-lg font-medium ${
                  isDarkMode ? "text-[#E2E8F0]" : "text-[#334155]"
                }`}
              >
                {feature.title}
              </h3>
              <p
                className={`mt-2 ${
                  isDarkMode ? "text-[#94A3B8]" : "text-[#64748B]"
                }`}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer
        className={`w-full border-t transition-colors duration-200 ${
          isDarkMode
            ? "bg-[#1E293B] border-[#334155]"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p
            className={`text-center ${
              isDarkMode ? "text-[#94A3B8]" : "text-[#64748B]"
            }`}
          >
            © 2025 MyTinyURL. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
