/* ── Translations ── */
const translations = {
    en: {
        pageTitle:       'Attendee \u2013 Login',
        tagline:         'Smart Attendance Management',
        labelUsername:   'Email / Username',
        placeholderUser: 'you@example.com',
        labelPassword:   'Password',
        remember:        'Remember me',
        forgot:          'Forgot Password?',
        btnLogin:        'Login',
        errorMsg:        'Invalid username or password. Please try again.',
        toggleShow:      'Show password',
        toggleHide:      'Hide password',
    },
    fr: {
        pageTitle:       'Attendee \u2013 Connexion',
        tagline:         'Gestion intelligente des pr\u00e9sences',
        labelUsername:   'Email / Nom d\u2019utilisateur',
        placeholderUser: 'vous@exemple.com',
        labelPassword:   'Mot de passe',
        remember:        'Se souvenir de moi',
        forgot:          'Mot de passe oubli\u00e9\u00a0?',
        btnLogin:        'Connexion',
        errorMsg:        'Identifiant ou mot de passe invalide. Veuillez r\u00e9essayer.',
        toggleShow:      'Afficher le mot de passe',
        toggleHide:      'Masquer le mot de passe',
    }
};

/* ── Current language (persisted in localStorage) ── */
let currentLang = localStorage.getItem('attendee_lang') || 'en';

/* ── Apply all translations to the page ── */
function applyTranslations(lang) {
    const t = translations[lang];
    if (!t) return;

    document.title                                           = t.pageTitle;
    document.getElementById('tagline').textContent          = t.tagline;
    document.getElementById('labelUsername').textContent    = t.labelUsername;
    document.getElementById('username').placeholder         = t.placeholderUser;
    document.getElementById('labelPassword').textContent    = t.labelPassword;
    document.getElementById('password').placeholder         = '••••••••';
    document.getElementById('rememberText').textContent     = t.remember;
    document.getElementById('forgotLink').textContent       = t.forgot;
    document.getElementById('btnLogin').textContent         = t.btnLogin;

    const errorEl = document.getElementById('errorMsg');
    if (errorEl) errorEl.textContent = t.errorMsg;

    /* Sync toggle button aria-label with current password visibility */
    const pw  = document.getElementById('password');
    const btn = document.getElementById('toggleBtn');
    btn.setAttribute('aria-label', pw.type === 'text' ? t.toggleHide : t.toggleShow);
}

/* ── Language switcher ── */
function setLang(lang, event) {
    currentLang = lang;
    localStorage.setItem('attendee_lang', lang);

    /* Update active button highlight */
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    /* Translate entire page */
    applyTranslations(lang);
}

/* ── Password visibility toggle ── */
function togglePassword() {
    const pw       = document.getElementById('password');
    const btn      = document.getElementById('toggleBtn');
    const t        = translations[currentLang];
    const isHidden = pw.type === 'password';

    pw.type         = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? '\uD83D\uDE48' : '\uD83D\uDC41'; /* 🙈 / 👁 */
    btn.style.color = isHidden ? 'var(--teal)' : '';
    btn.setAttribute('aria-label', isHidden ? t.toggleHide : t.toggleShow);
}

/* ── Init: restore saved language preference on page load ── */
document.addEventListener('DOMContentLoaded', function () {
    applyTranslations(currentLang);

    /* Mark the correct language button as active */
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
});