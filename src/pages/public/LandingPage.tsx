import { useNavigate } from 'react-router';
import { GraduationCap, BookOpen, Users, Award, ArrowRight, Star, CheckCircle, Play } from 'lucide-react';

const features = [
  { icon: BookOpen, title: 'Cours interactifs', desc: 'Accédez à des centaines de cours vidéo, PDF et exercices pratiques organisés par niveau.' },
  { icon: Users, title: 'Enseignants experts', desc: 'Apprenez avec des professionnels du secteur passionnés par l\'enseignement.' },
  { icon: Award, title: 'Quiz et certifications', desc: 'Validez vos compétences avec des quiz et obtenez des certificats reconnus.' },
  { icon: Star, title: 'Suivi de progression', desc: 'Suivez votre évolution en temps réel et reprenez là où vous vous êtes arrêté.' },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-lg">EduLearn</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors px-4 py-2">
            Connexion
          </button>
          <button onClick={() => navigate('/register')} className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-colors">
            S'inscrire
          </button>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
            Plateforme d'apprentissage en ligne
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Apprenez à votre
            <span className="text-indigo-600 block">rythme, partout.</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg mt-6 leading-relaxed">
            Développez vos compétences avec nos cours en ligne, créés par des enseignants experts. Quiz interactifs, suivi de progression et certificats à la clé.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium px-6 py-3 rounded-xl transition-colors"
            >
              <Play className="w-4 h-4" /> Voir une démo
            </button>
          </div>
          <div className="flex items-center gap-6 mt-10">
            {[['500+', 'Cours disponibles'], ['12K+', 'Étudiants actifs'], ['98%', 'Satisfaction']].map(([val, label]) => (
              <div key={label}>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{val}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative hidden lg:block">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=500&fit=crop&auto=format"
              alt="Students learning"
              className="w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent" />
          </div>
          <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Quiz complété!</p>
                <p className="text-[10px] text-slate-500">Score: 92%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 dark:bg-slate-900 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Tout ce dont vous avez besoin</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-3">Une plateforme complète pour enseigner et apprendre</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
                <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-2">{title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Prêt à commencer?</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-3 mb-8">Rejoignez des milliers d'apprenants dès aujourd'hui.</p>
        <button
          onClick={() => navigate('/register')}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-colors shadow-lg shadow-indigo-600/20"
        >
          Créer mon compte gratuitement <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        © 2024 EduLearn. Tous droits réservés.
      </footer>
    </div>
  );
}
