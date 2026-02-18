import { useTranslation } from 'react-i18next';
import api from '../services/api'; // Optional: if we want to sync with backend
import { useAuth } from '../hooks/useAuth'; // To check if logged in

export default function LanguageSwitcher({ className = '', style = {} }) {
  const { i18n } = useTranslation();
  const { user, updateUser } = useAuth(); // Hook handles auth state safely

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';

    if (user) {
      updateUser({ languagePreference: newLang });
      try {
        await api.updatePreferences({ languagePreference: newLang });
      } catch (err) {
        console.error('Failed to sync language preference', err);
      }
    }
  };

  return (
    <button
      type="button"
      className={`btn-icon ${className}`}
      style={{ ...style, width: 'auto', padding: '0.5rem', borderRadius: '8px' }}
      onClick={toggleLanguage}
      title={i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>
        {i18n.language === 'ar' ? 'EN' : 'AR'}
      </span>
    </button>
  );
}
