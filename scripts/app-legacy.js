// Agri AI - Pure JavaScript Browser Bundle (Zero Build Tool, Zero JSX Mismatch)

(function() {
  const e = React.createElement;
  const useState = React.useState;
  const useEffect = React.useEffect;
  const useRef = React.useRef;

  // --- CONFIGURATIONS & DATA ---

  const BRICS_COUNTRIES = [
    { code: 'IN', name: 'India', nativeName: 'भारत', flag: '🇮🇳', languages: ['en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'], defaultLanguage: 'hi', currency: 'INR (₹)', units: 'Metric / Acres' },
    { code: 'BR', name: 'Brazil', nativeName: 'Brasil', flag: '🇧🇷', languages: ['pt', 'en'], defaultLanguage: 'pt', currency: 'BRL (R$)', units: 'Metric / Hectares' },
    { code: 'RU', name: 'Russia', nativeName: 'Россия', flag: '🇷🇺', languages: ['ru', 'en'], defaultLanguage: 'ru', currency: 'RUB (₽)', units: 'Metric / Hectares' },
    { code: 'CN', name: 'China', nativeName: '中国', flag: '🇨🇳', languages: ['zh', 'en'], defaultLanguage: 'zh', currency: 'CNY (¥)', units: 'Metric / Mu (亩)' },
    { code: 'ZA', name: 'South Africa', nativeName: 'South Africa', flag: '🇿🇦', languages: ['en'], defaultLanguage: 'en', currency: 'ZAR (R)', units: 'Metric / Hectares' },
    { code: 'EG', name: 'Egypt', nativeName: 'مصر', flag: '🇪🇬', languages: ['ar', 'en'], defaultLanguage: 'ar', currency: 'EGP (LE)', units: 'Metric / Feddan' },
    { code: 'ET', name: 'Ethiopia', nativeName: 'ኢትዮጵያ', flag: '🇪🇹', languages: ['am', 'en'], defaultLanguage: 'am', currency: 'ETB (Br)', units: 'Metric / Hectares' },
    { code: 'IR', name: 'Iran', nativeName: 'ایران', flag: '🇮🇷', languages: ['fa', 'en'], defaultLanguage: 'fa', currency: 'IRR (﷼)', units: 'Metric / Hectares' },
    { code: 'AE', name: 'United Arab Emirates', nativeName: 'الإمارات', flag: '🇦🇪', languages: ['ar', 'en'], defaultLanguage: 'ar', currency: 'AED (د.إ)', units: 'Metric / Hectares' },
    { code: 'ID', name: 'Indonesia', nativeName: 'Indonesia', flag: '🇮🇩', languages: ['id', 'en'], defaultLanguage: 'id', currency: 'IDR (Rp)', units: 'Metric / Hectares' },
    { code: 'SA', name: 'Saudi Arabia', nativeName: 'المملكة العربية السعودية', flag: '🇸🇦', languages: ['ar', 'en'], defaultLanguage: 'ar', currency: 'SAR (ر.س)', units: 'Metric / Hectares' }
  ];

  const CROPS_DATABASE = [
    { id: 'groundnut', name: 'Groundnut (Peanut)', category: 'Pulses', icon: '🥜' },
    { id: 'rice', name: 'Rice', category: 'Cereals', icon: '🌾' },
    { id: 'wheat', name: 'Wheat', category: 'Cereals', icon: '🌾' },
    { id: 'maize', name: 'Maize (Corn)', category: 'Cereals', icon: '🌽' },
    { id: 'cotton', name: 'Cotton', category: 'Commercial', icon: '☁️' },
    { id: 'sugarcane', name: 'Sugarcane', category: 'Commercial', icon: '🎋' },
    { id: 'potato', name: 'Potato', category: 'Vegetables', icon: '🥔' },
    { id: 'tomato', name: 'Tomato', category: 'Vegetables', icon: '🍅' },
    { id: 'onion', name: 'Onion', category: 'Vegetables', icon: '🧅' },
    { id: 'banana', name: 'Banana', category: 'Fruits', icon: '🍌' },
    { id: 'mango', name: 'Mango', category: 'Fruits', icon: '🥭' }
  ];

  const SOIL_TYPES = [
    { id: 'loamy', name: 'Loamy', drainage: 'Optimal' },
    { id: 'black', name: 'Black Soil (Regur)', drainage: 'Slow' },
    { id: 'sandy', name: 'Sandy', drainage: 'Fast' },
    { id: 'clay', name: 'Clay', drainage: 'Poor' },
    { id: 'alluvial', name: 'Alluvial', drainage: 'Good' },
    { id: 'red', name: 'Red Soil', drainage: 'Good' }
  ];

  const CROP_STAGES = ['Newly Planted', 'Germination', 'Seedling', 'Growing', 'Flowering', 'Fruiting', 'Maturity', 'Harvesting'];

  const LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'mr', name: 'Marathi', nativeName: 'મરાઠી' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
  ];

  const ASSETS = {
    farmerHero: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
    farmerProfile: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&w=200&q=80',
    leafSpotSample: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80',
    satelliteFarm: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
    icons: {
      home: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      myFarm: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22v-9"/><path d="M5.5 8.5C4 10 3 12 3 14a9 9 0 0 0 18 0c0-2-1-4-2.5-5.5"/><path d="M12 2a7 7 0 0 1 7 7c0 2-1 3-2.5 4.5L12 18l-4.5-4.5C6 12 5 11 5 9a7 7 0 0 1 7-7z"/></svg>`,
      aiAdvisor: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/></svg>`,
      diagnose: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9A9 9 0 0 1 2 11C2 6.03 6.03 2 11 2z"/><path d="M11 7v8"/><path d="M7 11h8"/></svg>`,
      profile: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      weather: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>`,
      sprout: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 20h10"/><path d="M12 20v-8"/><path d="M12 12A5 5 0 0 1 7 7c0-2.76 2.24-5 5-5s5 2.24 5 5a5 5 0 0 1-5 5z"/></svg>`
    }
  };

  let currentLang = 'en';

  // --- COMPONENTS ---

  function Header({ activeFarm, onOpenFarmSelector, onOpenNotifications, onOpenLanguage }) {
    return e('header', { className: 'app-header' },
      e('div', { className: 'farm-selector-pill', onClick: onOpenFarmSelector },
        e('span', { style: { fontSize: '16px' } }, '🌱'),
        e('div', { className: 'farm-selector-text' }, (activeFarm ? activeFarm.name : 'Rajkot Farm') + ' ▼')
      ),
      e('div', { className: 'header-actions' },
        e('button', { className: 'header-icon-btn', title: 'Language', onClick: onOpenLanguage },
          e('span', { style: { fontSize: '14px', fontWeight: '700' } }, '🌐')
        ),
        e('button', { className: 'header-icon-btn', title: 'Notifications', onClick: onOpenNotifications },
          e('div', { dangerouslySetInnerHTML: { __html: ASSETS.icons.weather } }),
          e('span', { className: 'notification-badge' })
        )
      )
    );
  }

  function Navbar({ currentTab, onSelectTab }) {
    const navItems = [
      { id: 'home', label: 'Home', icon: ASSETS.icons.home },
      { id: 'myFarm', label: 'My Farm', icon: ASSETS.icons.myFarm },
      { id: 'aiAdvisor', label: 'AI Advisor', icon: ASSETS.icons.aiAdvisor },
      { id: 'diagnose', label: 'Diagnose', icon: ASSETS.icons.diagnose },
      { id: 'profile', label: 'Profile', icon: ASSETS.icons.profile }
    ];

    return e('nav', { className: 'bottom-navbar' },
      navItems.map(item => {
        const isActive = currentTab === item.id;
        return e('div', {
          key: item.id,
          className: `nav-item ${isActive ? 'active' : ''}`,
          onClick: () => onSelectTab(item.id)
        },
          e('div', { className: 'nav-item-icon', dangerouslySetInnerHTML: { __html: item.icon } }),
          e('span', null, item.label),
          isActive ? e('div', { className: 'nav-indicator' }) : null
        );
      })
    );
  }

  // Welcome Screen
  function WelcomeScreen({ onGetStarted, onSignIn, onSelectLanguage }) {
    return e('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)', padding: '24px 20px', justifyContent: 'space-between' } },
      e('div', null,
        e('div', { style: { width: '100%', height: '240px', borderRadius: '24px', overflow: 'hidden', marginBottom: '24px', boxShadow: 'var(--shadow-md)' } },
          e('img', { src: ASSETS.farmerHero, alt: 'Farmer in Field', style: { width: '100%', height: '100%', objectFit: 'cover' } })
        ),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
          e('span', { style: { fontSize: '20px' } }, '🌱'),
          e('span', { style: { fontSize: '24px', fontWeight: '800', color: 'var(--color-forest-green)' } }, 'Agri AI')
        ),
        e('h2', { style: { fontSize: '26px', fontWeight: '800', lineHeight: 1.25, color: 'var(--color-text-primary)', marginBottom: '12px' } },
          'Better decisions.', e('br'), 'Healthier crops.'
        ),
        e('p', { style: { fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 } },
          'AI-powered agricultural intelligence built around your farm, weather, soil and crop health.'
        )
      ),
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        e('button', { className: 'btn-primary', onClick: onGetStarted }, 'Get Started'),
        e('button', { className: 'btn-outline', onClick: onSignIn }, 'Already have an account? Sign in'),
        e('button', {
          onClick: onSelectLanguage,
          style: { background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: '600', marginTop: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }
        }, '🌐 Language: English ▼')
      )
    );
  }

  // Home Dashboard Screen
  function DashboardScreen({ activeFarm, onNavigateTab, onOpenWeather, onOpenInsights, onOpenActionPlan, onOpenWhyAlert }) {
    return e('div', { style: { padding: '16px 20px', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)' } },
      
      // Greeting
      e('div', { style: { marginBottom: '16px' } },
        e('h2', { style: { fontSize: '22px', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '4px' } },
          'Good morning,', e('br'), 'Farmer Rahul 🌱'
        ),
        e('div', { style: { fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' } },
          e('span', null, `📍 ${activeFarm?.location || 'Rajkot, Gujarat'}`),
          e('span', null, '•'),
          e('span', { style: { fontWeight: '600', color: 'var(--color-forest-green)' } }, `${activeFarm?.crop || 'Groundnut'} (${activeFarm?.area || 2.45} acres)`)
        )
      ),

      // Weather Card
      e('div', { className: 'weather-card', onClick: onOpenWeather, style: { cursor: 'pointer' } },
        e('div', { className: 'weather-header' },
          e('div', null,
            e('div', { className: 'weather-temp' }, '29°C'),
            e('div', { className: 'weather-condition' }, 'Partly Cloudy')
          ),
          e('span', { style: { fontSize: '42px' } }, '⛅')
        ),
        e('div', { className: 'weather-metrics' },
          e('div', null, 'Rain: ', e('strong', null, '60%')),
          e('div', null, 'Humidity: ', e('strong', null, '75%')),
          e('div', null, 'Wind: ', e('strong', null, '12 km/h'))
        )
      ),

      // Farm Health Gauge Card
      e('div', { className: 'card card-pastel', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        e('div', null,
          e('span', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--color-earth-brown)', letterSpacing: '0.5px' } }, 'FARM HEALTH'),
          e('h3', { style: { fontSize: '20px', fontWeight: '800', color: 'var(--color-forest-green)', marginTop: '4px' } }, 'Looking Healthy'),
          e('p', { style: { fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' } }, 'NDVI Index: 0.72 (Good)'),
          e('button', { className: 'btn-secondary btn-small', style: { marginTop: '12px', width: 'auto' }, onClick: onOpenInsights }, 'View Insights →')
        ),
        e('div', { className: 'gauge-container' },
          e('div', { className: 'circular-gauge' },
            e('svg', { viewBox: '0 0 100 100' },
              e('circle', { className: 'circular-bg', cx: '50', cy: '50', r: '40' }),
              e('circle', { className: 'circular-progress', cx: '50', cy: '50', r: '40', style: { strokeDashoffset: 45 } })
            ),
            e('div', { className: 'gauge-value' }, '82%')
          )
        )
      ),

      // Weather Alert Banner
      e('div', { className: 'card card-warm', style: { borderLeft: '5px solid var(--color-muted-warning)' } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
          e('span', { style: { fontSize: '18px' } }, '🌧️'),
          e('span', { style: { fontSize: '13px', fontWeight: '700', color: 'var(--color-earth-brown)' } }, 'WEATHER ADVISORY')
        ),
        e('p', { style: { fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '600', marginBottom: '12px' } },
          'Heavy rain expected tomorrow. Consider delaying irrigation.'
        ),
        e('button', { className: 'btn-outline btn-small', style: { width: 'auto', background: 'var(--color-white)' }, onClick: onOpenWhyAlert }, 'Why?')
      ),

      // Next Action
      e('div', { className: 'card', style: { border: '1.5px solid var(--color-pastel-green)' } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
          e('span', { style: { fontSize: '16px' } }, '⚡'),
          e('span', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--color-forest-green)' } }, 'NEXT BEST ACTION')
        ),
        e('p', { style: { fontSize: '15px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '12px' } },
          'Check soil moisture before irrigation.'
        ),
        e('button', { className: 'btn-primary btn-small', onClick: onOpenActionPlan }, 'View Action Plan >')
      ),

      // Quick Actions
      e('div', { style: { marginTop: '8px', marginBottom: '16px' } },
        e('div', { style: { fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '12px' } }, 'Quick Actions'),
        e('div', { className: 'quick-actions-grid' },
          e('div', { className: 'quick-action-item', onClick: () => onNavigateTab('aiAdvisor') },
            e('div', { className: 'quick-action-icon', dangerouslySetInnerHTML: { __html: ASSETS.icons.aiAdvisor } }),
            e('div', { className: 'quick-action-label' }, 'Ask AI')
          ),
          e('div', { className: 'quick-action-item', onClick: () => onNavigateTab('diagnose') },
            e('div', { className: 'quick-action-icon', dangerouslySetInnerHTML: { __html: ASSETS.icons.diagnose } }),
            e('div', { className: 'quick-action-label' }, 'Diagnose')
          ),
          e('div', { className: 'quick-action-item', onClick: onOpenWeather },
            e('div', { className: 'quick-action-icon', dangerouslySetInnerHTML: { __html: ASSETS.icons.weather } }),
            e('div', { className: 'quick-action-label' }, 'Weather')
          ),
          e('div', { className: 'quick-action-item', onClick: onOpenInsights },
            e('div', { className: 'quick-action-icon', dangerouslySetInnerHTML: { __html: ASSETS.icons.sprout } }),
            e('div', { className: 'quick-action-label' }, 'Insights')
          )
        )
      )
    );
  }

  // AI Advisor Screen
  function AIAdvisorScreen() {
    const [messages, setMessages] = useState([
      {
        id: 'm1',
        sender: 'user',
        text: 'Should I irrigate my groundnut crop today?'
      },
      {
        id: 'm2',
        sender: 'ai',
        advice: {
          recommendation: 'Delay irrigation for 24 hours.',
          why: 'Rain is expected tomorrow (60-85% chance) and soil moisture is currently adequate for your Groundnut crop.',
          whatToDo: [
            '1. Check soil moisture tomorrow morning.',
            '2. Avoid unnecessary irrigation.',
            '3. Monitor the field after rainfall.'
          ],
          dataUsed: ['Weather Forecast (60% Rain)', 'Soil Type (Loamy)', 'Crop Stage (Flowering)', 'Farm Location (Rajkot, Gujarat)']
        }
      }
    ]);
    const [input, setInput] = useState('');

    const handleSend = (text) => {
      const q = text || input;
      if (!q) return;
      setMessages(prev => [...prev, 
        { id: Date.now(), sender: 'user', text: q },
        {
          id: Date.now() + 1,
          sender: 'ai',
          advice: {
            recommendation: 'Field conditions are favorable. Follow recommended fertilizer schedule.',
            why: 'Weather is clear and soil moisture is balanced.',
            whatToDo: ['1. Inspect root zone moisture.', '2. Keep weeds clear around stems.'],
            dataUsed: ['Soil Moisture', 'Live Weather', 'Crop Metadata']
          }
        }
      ]);
      setInput('');
    };

    return e('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)' } },
      e('div', { style: { padding: '16px 20px', background: 'var(--color-cream)', borderBottom: '1px solid var(--color-border)' } },
        e('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          e('span', { style: { fontSize: '24px' } }, '🤖'),
          e('div', null,
            e('h2', { style: { fontSize: '18px', fontWeight: '800', color: 'var(--color-forest-green)' } }, 'Agri AI Advisor'),
            e('p', { style: { fontSize: '12px', color: 'var(--color-text-muted)' } }, 'Your farm-aware agricultural assistant')
          )
        )
      ),

      e('div', { style: { flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' } },
        messages.map(msg => {
          if (msg.sender === 'user') {
            return e('div', { key: msg.id, style: { alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--color-forest-green)', color: 'white', padding: '12px 16px', borderRadius: '18px 18px 4px 18px', fontSize: '14px', fontWeight: '500' } }, msg.text);
          } else {
            const { recommendation, why, whatToDo, dataUsed } = msg.advice;
            return e('div', { key: msg.id, className: 'ai-card', style: { alignSelf: 'flex-start', width: '100%' } },
              e('div', { className: 'ai-card-tag' }, '🌱 AGRI AI RECOMMENDATION'),
              e('div', { className: 'ai-card-title' }, recommendation),
              e('div', { className: 'ai-card-section' },
                e('div', { className: 'ai-card-section-title' }, 'WHY'),
                e('div', { style: { fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.4' } }, why)
              ),
              e('div', { className: 'ai-card-section' },
                e('div', { className: 'ai-card-section-title' }, 'WHAT TO DO'),
                whatToDo.map((item, idx) => e('div', { key: idx, style: { fontSize: '13px', color: 'var(--color-text-primary)', marginTop: '4px' } }, item))
              ),
              e('div', { style: { marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                dataUsed.map((tag, idx) => e('span', { key: idx, style: { padding: '2px 8px', borderRadius: '4px', background: 'var(--color-very-light-green)', fontSize: '10px', color: 'var(--color-forest-green)', fontWeight: '600' } }, `✓ ${tag}`))
              )
            );
          }
        })
      ),

      e('div', { style: { padding: '12px 16px', background: 'var(--color-white)', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' } },
        e('button', { className: 'header-icon-btn', style: { background: 'var(--color-very-light-green)', color: 'var(--color-forest-green)' } }, '🎙️'),
        e('input', {
          type: 'text',
          className: 'form-input',
          placeholder: 'Ask anything about your farm...',
          value: input,
          onChange: (ev) => setInput(ev.target.value),
          onKeyDown: (ev) => ev.key === 'Enter' && handleSend(),
          style: { flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-full)' }
        }),
        e('button', { className: 'btn-primary', onClick: () => handleSend(), style: { width: '42px', height: '42px', borderRadius: '50%', padding: 0 } }, '➔')
      )
    );
  }

  // Crop Doctor Screen
  function CropDoctorScreen() {
    const [result, setResult] = useState(null);
    const [scanning, setScanning] = useState(false);

    const handleRunDiagnosis = () => {
      setResult(null);
      setScanning(true);
      setTimeout(() => {
        setScanning(false);
        setResult({
          diseaseName: 'Possible Leaf Spot (Cercospora)',
          confidence: 87,
          cropIdentified: 'Groundnut (Peanut)',
          observedSymptoms: ['Dark circular spots on leaves', 'Slight yellowing around lesions'],
          recommendedActions: ['Inspect nearby groundnut plants', 'Avoid overhead sprinkler irrigation', 'Apply organic copper-based fungicide']
        });
      }, 1500);
    };

    return e('div', { style: { padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-cream)', overflowY: 'auto' } },
      e('div', { style: { marginBottom: '16px' } },
        e('h2', { style: { fontSize: '22px', fontWeight: '800', color: 'var(--color-forest-green)' } }, 'Crop Doctor'),
        e('p', { style: { fontSize: '13px', color: 'var(--color-text-muted)' } }, 'Take a photo of your crop leaf or upload one for AI diagnosis.')
      ),

      e('div', { className: 'scanner-container', style: { marginBottom: '16px' } },
        e('img', { src: ASSETS.leafSpotSample, alt: 'Crop Leaf', className: 'scanner-image' }),
        scanning ? e('div', { className: 'scanner-line' }) : null
      ),

      !scanning && !result ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        e('button', { className: 'btn-primary', onClick: handleRunDiagnosis }, '📷 Take Photo'),
        e('button', { className: 'btn-secondary', onClick: handleRunDiagnosis }, '🍃 Use Sample Image (Leaf Spot Demo)')
      ) : null,

      scanning ? e('div', { className: 'card card-pastel', style: { textAlign: 'center', padding: '24px 16px' } },
        e('div', { style: { fontSize: '32px', marginBottom: '8px' } }, '🔍'),
        e('h3', { style: { fontSize: '16px', fontWeight: '700', color: 'var(--color-forest-green)' } }, 'Analyzing visual symptoms...'),
        e('p', { style: { fontSize: '12px', color: 'var(--color-text-muted)' } }, 'Gemini Multimodal Vision Model')
      ) : null,

      result ? e('div', { className: 'card', style: { border: '2px solid var(--color-pastel-green)', marginTop: '10px' } },
        e('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' } },
          e('span', { style: { padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-muted-danger-bg)', color: 'var(--color-muted-danger)', fontWeight: '700', fontSize: '11px' } }, 'DISEASE DETECTED'),
          e('span', { style: { padding: '4px 10px', borderRadius: '9999px', background: 'var(--color-very-light-green)', color: 'var(--color-forest-green)', fontWeight: '700', fontSize: '11px' } }, `🎯 ${result.confidence}% Match`)
        ),
        e('h3', { style: { fontSize: '20px', fontWeight: '800' } }, result.diseaseName),
        e('p', { style: { fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' } }, `Crop: ${result.cropIdentified}`),
        e('div', { style: { fontWeight: '700', fontSize: '12px', color: 'var(--color-forest-green)', marginBottom: '4px' } }, 'RECOMMENDED ACTIONS'),
        result.recommendedActions.map((act, idx) => e('div', { key: idx, style: { fontSize: '13px', marginTop: '4px' } }, `${idx + 1}. ${act}`))
      ) : null
    );
  }

  // MAIN APP ROOT COMPONENT
  function App() {
    const [currentScreen, setCurrentScreen] = useState('welcome');
    const [currentTab, setCurrentTab] = useState('home');
    const activeFarm = { name: 'Rajkot Groundnut Farm', location: 'Rajkot, Gujarat, India', crop: 'Groundnut', area: 2.45 };

    const handleSelectTab = (tabId) => {
      setCurrentTab(tabId);
      if (tabId === 'home') setCurrentScreen('dashboard');
      else if (tabId === 'aiAdvisor') setCurrentScreen('aiAdvisor');
      else if (tabId === 'diagnose') setCurrentScreen('diagnose');
    };

    const showNavbar = ['dashboard', 'aiAdvisor', 'diagnose', 'weather', 'insights'].includes(currentScreen);

    return e('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' } },
      showNavbar ? e(Header, { activeFarm, onOpenFarmSelector: () => handleSelectTab('myFarm'), onOpenNotifications: () => {}, onOpenLanguage: () => setCurrentScreen('welcome') }) : null,

      e('div', { className: `app-viewport ${showNavbar ? '' : 'no-navbar'}` },
        currentScreen === 'welcome' ? e(WelcomeScreen, { onGetStarted: () => setCurrentScreen('dashboard'), onSignIn: () => setCurrentScreen('dashboard'), onSelectLanguage: () => {} }) : null,
        currentScreen === 'dashboard' ? e(DashboardScreen, { activeFarm, onNavigateTab: handleSelectTab, onOpenWeather: () => setCurrentScreen('weather'), onOpenInsights: () => setCurrentScreen('insights'), onOpenActionPlan: () => setCurrentScreen('aiAdvisor'), onOpenWhyAlert: () => handleSelectTab('aiAdvisor') }) : null,
        currentScreen === 'aiAdvisor' ? e(AIAdvisorScreen) : null,
        currentScreen === 'diagnose' ? e(CropDoctorScreen) : null,
        currentScreen === 'weather' ? e('div', { style: { padding: '20px' } }, e('button', { className: 'btn-outline', onClick: () => setCurrentScreen('dashboard') }, '← Back'), e('h2', { style: { marginTop: '16px' } }, 'Weather Intelligence'), e('p', null, 'Rain probability: 60%. High humidity.')) : null,
        currentScreen === 'insights' ? e('div', { style: { padding: '20px' } }, e('button', { className: 'btn-outline', onClick: () => setCurrentScreen('dashboard') }, '← Back'), e('h2', { style: { marginTop: '16px' } }, 'Farm Insights'), e('p', null, 'NDVI Index: 0.72 (Good vegetation health)')) : null
      ),

      showNavbar ? e(Navbar, { currentTab, onSelectTab: handleSelectTab }) : null
    );
  }

  // Render App into #root
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(e(App));
  }
})();
