// server.js
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const nunjucks = require('nunjucks');
const { loadUserFromCookie } = require('./middleware/auth');
const { countUniqueVisitors } = require('./middleware/visitor');

// Import des routes
const loginRoutes = require('./routes/login');
const adminRoutes = require('./routes/admin');
const indexRoutes = require('./routes/index');
const articlesRoutes = require('./routes/articles');
const articlesManageRoutes = require('./routes/articles_manage');
const categoriesRoutes = require('./routes/categories');
const formationMdRoutes = require('./routes/formation_md');

const app = express();
const PORT = 3100;

// Configuration du moteur de template Nunjucks (compatible Jinja2)
const { marked } = require('marked');
marked.setOptions({
  breaks: true,
  gfm: true
});

// Configurer Nunjucks avec Express
const env = nunjucks.configure(path.join(__dirname, 'templates'), {
  autoescape: true,
  express: app,
  watch: false,
  noCache: process.env.NODE_ENV !== 'production'
});

// Définir Nunjucks comme moteur de template pour les fichiers .html
app.set('view engine', 'html');
app.engine('html', nunjucks.render);

// Ajouter le filtre markdown
env.addFilter('markdown', (text) => {
  if (!text) return '';
  return new nunjucks.runtime.SafeString(marked(text));
});

// Ajouter d'autres filtres pour compatibilité Jinja2
env.addFilter('lower', (str) => {
  return str ? str.toLowerCase() : '';
});

env.addFilter('replace', (str, old, newStr) => {
  return str ? str.replace(new RegExp(old, 'g'), newStr) : '';
});

// Ajouter un filtre slice pour compatibilité avec Python
env.addFilter('slice', (arr, start, end) => {
  if (!Array.isArray(arr)) return arr;
  return arr.slice(start, end);
});

// Ajouter une fonction globale pour gérer les slices dans les templates
env.addGlobal('slice', (arr, start, end) => {
  if (!Array.isArray(arr)) return arr;
  return arr.slice(start, end);
});

// Middleware pour parser les données
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Middleware pour servir les fichiers statiques
app.use('/static', express.static(path.join(__dirname, 'static')));

// Middleware pour charger l'utilisateur depuis le cookie
app.use(loadUserFromCookie);

// Ajouter un filtre startswith pour compatibilité Jinja2
env.addFilter('startswith', (str, prefix) => {
  return str ? str.startsWith(prefix) : false;
});

// Ajouter un filtre selectattr pour compatibilité Jinja2
env.addFilter('selectattr', (arr, attr, value) => {
  if (!Array.isArray(arr)) return [];
  return arr.filter(item => {
    if (value === true) {
      return item[attr] === true || item[attr] === 1;
    }
    return item[attr] === value;
  });
});

// Ajouter un filtre first pour compatibilité Jinja2
env.addFilter('first', (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[0];
});

// Ajouter un filtre sort pour compatibilité Jinja2
env.addFilter('sort', (arr, attribute, reverse = false) => {
  if (!Array.isArray(arr)) return arr;
  const sorted = [...arr].sort((a, b) => {
    let aVal = attribute ? a[attribute] : a;
    let bVal = attribute ? b[attribute] : b;
    
    // Gérer les dates
    if (aVal && bVal && (aVal.includes('-') || aVal.includes('T'))) {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    
    if (aVal < bVal) return reverse ? 1 : -1;
    if (aVal > bVal) return reverse ? -1 : 1;
    return 0;
  });
  return sorted;
});

// Ajouter un filtre strftime pour formater les dates (compatibilité Python)
env.addFilter('strftime', (date, format) => {
  if (!date) return '';
  
  let d = date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (!(date instanceof Date)) {
    return '';
  }
  
  if (isNaN(d.getTime())) return '';
  
  // Format %d/%m/%Y
  if (format === '%d/%m/%Y') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Format par défaut
  return d.toLocaleDateString('fr-FR');
});

// Middleware pour ajouter request et user à tous les templates
app.use((req, res, next) => {
  res.locals.request = {
    url: {
      path: req.path,
      pathname: req.path
    },
    state: {
      user: req.user || null
    }
  };
  res.locals.user = req.user || null;
  next();
});

// Middleware pour compter les visiteurs uniques
app.use(countUniqueVisitors);

// Configuration pour obtenir l'IP réelle (pour les proxies)
app.set('trust proxy', true);

// Routes
app.use('/login', loginRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/articles', articlesManageRoutes);
app.use('/articles', articlesRoutes);
app.use('/categories', categoriesRoutes);
app.use('/formation', formationMdRoutes);
app.use('/', indexRoutes);

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

module.exports = app;

// https://www.notion.so/HackTheBox-Beginner-Cheat-Sheet-1f4463c9990c80f58aa0f00dfbff0b16?source=copy_link