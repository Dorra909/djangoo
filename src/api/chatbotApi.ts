import type { ChatMessage } from '../types';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const responses = [
  'Excellente question ! React utilise un DOM virtuel qui compare les changements avant de les appliquer au vrai DOM, ce qui optimise les performances.',
  'Pour apprendre la Data Science avec Python, je vous recommande de commencer par NumPy et Pandas avant de passer aux algorithmes de Machine Learning.',
  'Les hooks React comme `useState` et `useEffect` ont révolutionné la façon d\'écrire des composants fonctionnels.',
  'TypeScript ajoute un typage statique à JavaScript, ce qui aide à détecter les erreurs à la compilation plutôt qu\'à l\'exécution.',
  'Pour les CSS animations, les propriétés `transform` et `opacity` sont les plus performantes car elles ne déclenchent pas de reflow.',
  'Je suis là pour vous aider dans votre apprentissage ! N\'hésitez pas à me poser des questions sur vos cours.',
  'La pratique régulière est la clé du succès. Je vous conseille de coder au moins 30 minutes chaque jour.',
  'Pour les API REST avec Node.js, Express est un framework léger et flexible qui est parfait pour débuter.',
];

export const chatbotApi = {
  async sendMessage(message: string, _history: ChatMessage[]): Promise<string> {
    await delay(1200 + Math.random() * 800);
    const idx = Math.floor(Math.random() * responses.length);
    return responses[idx];
    // Real: return apiClient.post('/chatbot/', { message, history }).then(r => r.data.response);
  },
};
