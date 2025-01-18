interface GenerateShortCodeOptions {
  length?: number;
  excludeChars?: string[];
}

const defaultOptions: GenerateShortCodeOptions = {
  length: 6,
  excludeChars: ['0', 'O', 'I', 'l', '1'] // Caracteres que podem causar confusão visual
};

export function generateShortCode(options: GenerateShortCodeOptions = {}): string {
  const config = { ...defaultOptions, ...options };
  
  // Base de caracteres permitidos (alfanuméricos)
  let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Remove caracteres excluídos
  if (config.excludeChars) {
    for (const char of config.excludeChars) {
      chars = chars.replace(char, '');
    }
  }

  let result = '';
  const charsLength = chars.length;
  
  // Gera o código aleatório
  for (let i = 0; i < config.length!; i++) {
    const randomIndex = Math.floor(Math.random() * charsLength);
    result += chars[randomIndex];
  }

  return result;
}


// Exemplos de uso:
/*
// Código padrão de 6 caracteres
const code1 = generateShortCode();  // ex: "xK4n9p"

// Código mais curto
const code2 = generateShortCode({ length: 4 });  // ex: "Yt2m"

// Código sem caracteres específicos
const code3 = generateShortCode({
  excludeChars: ['a', 'e', 'i', 'o', 'u']
});  // ex: "Xk4N9p"
*/