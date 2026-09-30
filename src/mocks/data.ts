import type { User, Course, Quiz, QuizAttempt, Complaint, Progress, DashboardStats } from '../types';

export const mockUsers: User[] = [
  { id: 1, email: 'admin@demo.com', fullName: 'Alexandre Martin', role: 'ADMIN', avatar: 'https://i.pravatar.cc/150?img=1', isActive: true, createdAt: '2024-01-01', bio: 'Administrateur de la plateforme' },
  { id: 2, email: 'teacher@demo.com', fullName: 'Sophie Dubois', role: 'ENSEIGNANT', avatar: 'https://i.pravatar.cc/150?img=5', isActive: true, createdAt: '2024-01-15', bio: 'Professeure de mathématiques et informatique' },
  { id: 3, email: 'student@demo.com', fullName: 'Lucas Bernard', role: 'ETUDIANT', avatar: 'https://i.pravatar.cc/150?img=3', isActive: true, createdAt: '2024-02-01', bio: 'Étudiant en développement web' },
  { id: 4, email: 'teacher2@demo.com', fullName: 'Marc Lefebvre', role: 'ENSEIGNANT', avatar: 'https://i.pravatar.cc/150?img=8', isActive: true, createdAt: '2024-01-20', bio: 'Expert en développement frontend' },
  { id: 5, email: 'student2@demo.com', fullName: 'Emma Petit', role: 'ETUDIANT', avatar: 'https://i.pravatar.cc/150?img=9', isActive: true, createdAt: '2024-02-10', bio: 'Passionnée de design et UX' },
  { id: 6, email: 'student3@demo.com', fullName: 'Nathan Moreau', role: 'ETUDIANT', avatar: 'https://i.pravatar.cc/150?img=12', isActive: false, createdAt: '2024-03-01', bio: '' },
  { id: 7, email: 'teacher3@demo.com', fullName: 'Isabelle Roux', role: 'ENSEIGNANT', avatar: 'https://i.pravatar.cc/150?img=10', isActive: true, createdAt: '2024-02-05', bio: 'Spécialiste Python et Data Science' },
  { id: 8, email: 'student4@demo.com', fullName: 'Camille Simon', role: 'ETUDIANT', avatar: 'https://i.pravatar.cc/150?img=13', isActive: true, createdAt: '2024-03-15', bio: '' },
];

export const mockCourses: Course[] = [
  {
    id: 1,
    title: 'Introduction à React et TypeScript',
    description: 'Apprenez à construire des applications modernes avec React 18 et TypeScript. Ce cours couvre les hooks, le state management, les composants et les bonnes pratiques.',
    category: 'Développement Web',
    level: 'Intermédiaire',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=340&fit=crop&auto=format',
    teacherId: 2,
    teacherName: 'Sophie Dubois',
    enrolledCount: 247,
    rating: 4.8,
    reviewCount: 89,
    createdAt: '2024-01-20',
    isPublished: true,
    lessons: [
      { id: 1, title: 'Introduction à React', content: 'Découvrez les bases de React, son histoire et pourquoi il est devenu incontournable.', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', order: 1, duration: 15 },
      { id: 2, title: 'Les composants et JSX', content: 'Apprenez à créer des composants React et à utiliser la syntaxe JSX.', order: 2, duration: 22 },
      { id: 3, title: 'State et useEffect', content: 'Gestion de l\'état local et des effets secondaires dans vos composants.', order: 3, duration: 30 },
      { id: 4, title: 'TypeScript avec React', content: 'Typage des props, state et hooks avec TypeScript pour un code plus robuste.', order: 4, duration: 35 },
      { id: 5, title: 'Routing avec React Router', content: 'Navigation multi-pages avec React Router v6.', order: 5, duration: 25 },
    ],
  },
  {
    id: 2,
    title: 'Python pour la Data Science',
    description: 'Maîtrisez Python pour l\'analyse de données, la visualisation et le machine learning. De NumPy à Pandas en passant par Matplotlib.',
    category: 'Data Science',
    level: 'Débutant',
    thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&h=340&fit=crop&auto=format',
    teacherId: 7,
    teacherName: 'Isabelle Roux',
    enrolledCount: 312,
    rating: 4.9,
    reviewCount: 134,
    createdAt: '2024-02-01',
    isPublished: true,
    lessons: [
      { id: 6, title: 'Introduction à Python', content: 'Les bases du langage Python.', order: 1, duration: 20 },
      { id: 7, title: 'NumPy et tableaux', content: 'Manipulation de tableaux multidimensionnels.', order: 2, duration: 28 },
      { id: 8, title: 'Pandas pour l\'analyse', content: 'DataFrames et analyse de données.', order: 3, duration: 40 },
      { id: 9, title: 'Visualisation avec Matplotlib', content: 'Créer des graphiques et visualisations.', order: 4, duration: 32 },
    ],
  },
  {
    id: 3,
    title: 'CSS Avancé et Design Systems',
    description: 'Techniques avancées CSS, animations, Flexbox, Grid, et création d\'un design system complet avec Tailwind CSS.',
    category: 'Design',
    level: 'Avancé',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop&auto=format',
    teacherId: 4,
    teacherName: 'Marc Lefebvre',
    enrolledCount: 189,
    rating: 4.7,
    reviewCount: 67,
    createdAt: '2024-02-15',
    isPublished: true,
    lessons: [
      { id: 10, title: 'CSS Flexbox Mastery', content: 'Maîtrisez Flexbox pour des layouts modernes.', order: 1, duration: 25 },
      { id: 11, title: 'CSS Grid Advanced', content: 'Grilles complexes avec CSS Grid.', order: 2, duration: 30 },
      { id: 12, title: 'Animations CSS', content: 'Transitions et animations performantes.', order: 3, duration: 35 },
    ],
  },
  {
    id: 4,
    title: 'Node.js et APIs REST',
    description: 'Construisez des APIs REST robustes avec Node.js, Express, et PostgreSQL. Authentification JWT, middleware, tests.',
    category: 'Backend',
    level: 'Intermédiaire',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=340&fit=crop&auto=format',
    teacherId: 2,
    teacherName: 'Sophie Dubois',
    enrolledCount: 156,
    rating: 4.6,
    reviewCount: 45,
    createdAt: '2024-03-01',
    isPublished: true,
    lessons: [
      { id: 13, title: 'Node.js Fundamentals', content: 'Architecture et modules Node.js.', order: 1, duration: 20 },
      { id: 14, title: 'Express Framework', content: 'Création d\'un serveur Express.', order: 2, duration: 25 },
      { id: 15, title: 'Authentification JWT', content: 'Sécurisation des APIs avec JWT.', order: 3, duration: 35 },
    ],
  },
];

export const mockQuizzes: Quiz[] = [
  {
    id: 1,
    title: 'Quiz React Fondamentaux',
    courseId: 1,
    courseName: 'Introduction à React et TypeScript',
    teacherId: 2,
    duration: 30,
    passingScore: 70,
    attemptCount: 89,
    createdAt: '2024-02-01',
    questions: [
      { id: 1, text: 'Quelle est la syntaxe pour créer un state avec React Hooks?', type: 'multiple_choice', options: ['useState()', 'createState()', 'useStore()', 'setState()'], correctAnswer: 0 },
      { id: 2, text: 'JSX est compilé en JavaScript pur.', type: 'true_false', options: ['Vrai', 'Faux'], correctAnswer: 0 },
      { id: 3, text: 'Quel hook permet de gérer les effets secondaires?', type: 'multiple_choice', options: ['useEffect', 'useSideEffect', 'useCallback', 'useMemo'], correctAnswer: 0 },
      { id: 4, text: 'React utilise un DOM virtuel pour optimiser les performances.', type: 'true_false', options: ['Vrai', 'Faux'], correctAnswer: 0 },
      { id: 5, text: 'Quelle propriété permet de passer des données d\'un composant parent vers un enfant?', type: 'multiple_choice', options: ['props', 'state', 'context', 'store'], correctAnswer: 0 },
    ],
  },
  {
    id: 2,
    title: 'Python Bases - Évaluation',
    courseId: 2,
    courseName: 'Python pour la Data Science',
    teacherId: 7,
    duration: 20,
    passingScore: 60,
    attemptCount: 124,
    createdAt: '2024-02-15',
    questions: [
      { id: 6, text: 'Python est un langage à typage statique.', type: 'true_false', options: ['Vrai', 'Faux'], correctAnswer: 1 },
      { id: 7, text: 'Quelle librairie Python est utilisée pour la manipulation de données tabulaires?', type: 'multiple_choice', options: ['Pandas', 'NumPy', 'Matplotlib', 'Scipy'], correctAnswer: 0 },
      { id: 8, text: 'Comment créer une liste vide en Python?', type: 'multiple_choice', options: ['[]', 'list()', '{}', 'Les deux premières réponses'], correctAnswer: 3 },
    ],
  },
];

export const mockAttempts: QuizAttempt[] = [
  { id: 1, quizId: 1, quizTitle: 'Quiz React Fondamentaux', studentId: 3, studentName: 'Lucas Bernard', score: 80, passed: true, answers: [0, 0, 0, 0, 0], completedAt: '2024-03-10T14:30:00', timeTaken: 18 },
  { id: 2, quizId: 2, quizTitle: 'Python Bases - Évaluation', studentId: 3, studentName: 'Lucas Bernard', score: 66, passed: true, answers: [1, 0, 3], completedAt: '2024-03-15T10:00:00', timeTaken: 12 },
  { id: 3, quizId: 1, quizTitle: 'Quiz React Fondamentaux', studentId: 5, studentName: 'Emma Petit', score: 60, passed: false, answers: [0, 0, 0, 1, 2], completedAt: '2024-03-12T16:00:00', timeTaken: 25 },
  { id: 4, quizId: 1, quizTitle: 'Quiz React Fondamentaux', studentId: 8, studentName: 'Camille Simon', score: 100, passed: true, answers: [0, 0, 0, 0, 0], completedAt: '2024-03-14T09:00:00', timeTaken: 10 },
];

export const mockComplaints: Complaint[] = [
  { id: 1, authorId: 3, authorName: 'Lucas Bernard', authorRole: 'ETUDIANT', subject: 'Problème d\'accès au cours', category: 'Technique', message: 'Je ne peux pas accéder aux leçons du cours React depuis 2 jours. La page affiche une erreur 403.', status: 'Open', createdAt: '2024-03-20T10:00:00', updatedAt: '2024-03-20T10:00:00' },
  { id: 2, authorId: 2, authorName: 'Sophie Dubois', authorRole: 'ENSEIGNANT', subject: 'Upload de vidéo limité', category: 'Fonctionnalité', message: 'La taille maximale des vidéos de 100MB est trop restrictive. Pourriez-vous augmenter cette limite?', status: 'In progress', adminReply: 'Nous étudions la possibilité d\'augmenter la limite à 500MB.', createdAt: '2024-03-18T14:00:00', updatedAt: '2024-03-19T09:00:00' },
  { id: 3, authorId: 5, authorName: 'Emma Petit', authorRole: 'ETUDIANT', subject: 'Note incorrecte sur quiz', category: 'Pédagogie', message: 'La question 3 du quiz CSS semble avoir une réponse incorrecte. La bonne réponse devrait être B.', status: 'Resolved', adminReply: 'Merci pour votre signalement. La question a été corrigée.', createdAt: '2024-03-15T08:00:00', updatedAt: '2024-03-16T11:00:00' },
];

export const mockProgress: Progress[] = [
  { courseId: 1, courseTitle: 'Introduction à React et TypeScript', completedLessons: 3, totalLessons: 5, percentage: 60, lastAccessed: '2024-03-20T15:30:00' },
  { courseId: 2, courseTitle: 'Python pour la Data Science', completedLessons: 2, totalLessons: 4, percentage: 50, lastAccessed: '2024-03-19T11:00:00' },
  { courseId: 3, courseTitle: 'CSS Avancé et Design Systems', completedLessons: 1, totalLessons: 3, percentage: 33, lastAccessed: '2024-03-18T09:00:00' },
];

export const mockDashboardStats: DashboardStats = {
  totalUsers: 8,
  totalTeachers: 3,
  totalStudents: 4,
  totalCourses: 4,
  totalQuizzes: 2,
  openComplaints: 1,
  newUsersPerMonth: [
    { month: 'Sep', count: 2 },
    { month: 'Oct', count: 4 },
    { month: 'Nov', count: 6 },
    { month: 'Dec', count: 3 },
    { month: 'Jan', count: 8 },
    { month: 'Fév', count: 12 },
    { month: 'Mar', count: 7 },
  ],
  usersByRole: [
    { name: 'Étudiants', value: 4 },
    { name: 'Enseignants', value: 3 },
    { name: 'Admins', value: 1 },
  ],
};
