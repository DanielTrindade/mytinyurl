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
  
  // Base de caracteres mais segura
  let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Remove caracteres confusos
  chars = chars.replace(/[0O1lI]/g, '');
  
  let result = '';
  const charsLength = chars.length;
  
  // Usa Crypto para maior aleatoriedade
  const randomValues = new Uint32Array(config.length!);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < config.length!; i++) {
    result += chars[randomValues[i] % charsLength];
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