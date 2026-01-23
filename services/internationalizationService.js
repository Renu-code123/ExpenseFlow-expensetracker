const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const moment = require('moment-timezone');

class InternationalizationService {
  constructor() {
    this.supportedLanguages = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
      'ar', 'hi', 'th', 'vi', 'tr', 'pl', 'nl', 'sv', 'da', 'no'
    ];
    this.supportedTimezones = moment.tz.names();
    this.init();
  }

  async init() {
    await i18next
      .use(Backend)
      .init({
        lng: 'en',
        fallbackLng: 'en',
        supportedLngs: this.supportedLanguages,
        backend: {
          loadPath: './locales/{{lng}}/{{ns}}.json'
        },
        interpolation: {
          escapeValue: false
        },
        resources: {
          en: {
            translation: {
              categories: {
                food: 'Food & Dining',
                transport: 'Transportation',
                entertainment: 'Entertainment',
                utilities: 'Utilities',
                healthcare: 'Healthcare',
                shopping: 'Shopping',
                other: 'Other'
              },
              messages: {
                expense_added: 'Expense added successfully',
                budget_exceeded: 'Budget limit exceeded',
                goal_achieved: 'Goal achieved!'
              },
              errors: {
                invalid_amount: 'Invalid amount',
                currency_not_supported: 'Currency not supported',
                conversion_failed: 'Currency conversion failed'
              }
            }
          }
        }
      });

    console.log('Internationalization service initialized');
  }

  translate(key, language = 'en', options = {}) {
    return i18next.getFixedT(language)(key, options);
  }

  formatDate(date, timezone = 'UTC', language = 'en') {
    const momentDate = moment.tz(date, timezone);
    
    const localeMap = {
      'en': 'en',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'it': 'it',
      'pt': 'pt-br',
      'ru': 'ru',
      'zh': 'zh-cn',
      'ja': 'ja',
      'ko': 'ko'
    };

    momentDate.locale(localeMap[language] || 'en');
    return momentDate.format('LLLL');
  }

  formatNumber(number, language = 'en', currency = null) {
    const options = {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    };

    if (currency) {
      options.style = 'currency';
      options.currency = currency;
    }

    return new Intl.NumberFormat(this.getLocale(language), options).format(number);
  }

  getLocale(language) {
    const localeMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'ru': 'ru-RU',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'ar': 'ar-SA',
      'hi': 'hi-IN'
    };

    return localeMap[language] || 'en-US';
  }

  getRegionalSettings(country) {
    const regionalSettings = {
      'US': {
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12',
        timezone: 'America/New_York',
        language: 'en',
        numberFormat: 'en-US'
      },
      'GB': {
        currency: 'GBP',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24',
        timezone: 'Europe/London',
        language: 'en',
        numberFormat: 'en-GB'
      },
      'DE': {
        currency: 'EUR',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: '24',
        timezone: 'Europe/Berlin',
        language: 'de',
        numberFormat: 'de-DE'
      },
      'FR': {
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24',
        timezone: 'Europe/Paris',
        language: 'fr',
        numberFormat: 'fr-FR'
      },
      'JP': {
        currency: 'JPY',
        dateFormat: 'YYYY/MM/DD',
        timeFormat: '24',
        timezone: 'Asia/Tokyo',
        language: 'ja',
        numberFormat: 'ja-JP'
      },
      'IN': {
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12',
        timezone: 'Asia/Kolkata',
        language: 'hi',
        numberFormat: 'hi-IN'
      }
    };

    return regionalSettings[country] || regionalSettings['US'];
  }

  convertToUserTimezone(date, userTimezone) {
    return moment.tz(date, userTimezone).toDate();
  }

  getUserTimezone(country, city = null) {
    const timezoneMap = {
      'US': 'America/New_York',
      'GB': 'Europe/London',
      'DE': 'Europe/Berlin',
      'FR': 'Europe/Paris',
      'JP': 'Asia/Tokyo',
      'IN': 'Asia/Kolkata',
      'AU': 'Australia/Sydney',
      'CA': 'America/Toronto',
      'BR': 'America/Sao_Paulo',
      'RU': 'Europe/Moscow',
      'CN': 'Asia/Shanghai'
    };

    if (city) {
      const cityTimezone = this.supportedTimezones.find(tz => 
        tz.toLowerCase().includes(city.toLowerCase())
      );
      if (cityTimezone) return cityTimezone;
    }

    return timezoneMap[country] || 'UTC';
  }

  getSupportedLanguages() {
    return this.supportedLanguages.map(lang => ({
      code: lang,
      name: this.getLanguageName(lang),
      nativeName: this.getNativeLanguageName(lang)
    }));
  }

  getLanguageName(code) {
    const names = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'tr': 'Turkish',
      'pl': 'Polish',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian'
    };

    return names[code] || code;
  }

  getNativeLanguageName(code) {
    const nativeNames = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'ar': 'العربية',
      'hi': 'हिन्दी',
      'th': 'ไทย',
      'vi': 'Tiếng Việt',
      'tr': 'Türkçe',
      'pl': 'Polski',
      'nl': 'Nederlands',
      'sv': 'Svenska',
      'da': 'Dansk',
      'no': 'Norsk'
    };

    return nativeNames[code] || code;
  }

  validateTimezone(timezone) {
    return this.supportedTimezones.includes(timezone);
  }

  getTimezoneOffset(timezone) {
    return moment.tz(timezone).utcOffset();
  }

  formatCurrency(amount, currency, language = 'en') {
    try {
      return new Intl.NumberFormat(this.getLocale(language), {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (error) {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  getDateFormats(language = 'en') {
    const formats = {
      'en': ['MM/DD/YYYY', 'MMMM D, YYYY', 'MMM D, YYYY'],
      'de': ['DD.MM.YYYY', 'D. MMMM YYYY', 'D. MMM YYYY'],
      'fr': ['DD/MM/YYYY', 'D MMMM YYYY', 'D MMM YYYY'],
      'es': ['DD/MM/YYYY', 'D [de] MMMM [de] YYYY', 'D MMM YYYY'],
      'ja': ['YYYY/MM/DD', 'YYYY年M月D日', 'YYYY年M月D日'],
      'zh': ['YYYY/MM/DD', 'YYYY年M月D日', 'M月D日']
    };

    return formats[language] || formats['en'];
  }
}

module.exports = new InternationalizationService();