import React, { useState, useEffect } from 'react';
import './index.css';

import { SplashScreen, WelcomeScreen, LanguageScreen, CountryScreen, LoginScreen } from './components/screens/OnboardingScreens.jsx';
import { LocationMethodScreen, MapPinScreen, BoundaryDrawerScreen, FarmDetailsScreen } from './components/screens/FarmSetupScreens.jsx';
import { DashboardScreen } from './components/screens/DashboardScreen.jsx';
import { AIAdvisorScreen } from './components/screens/AIAdvisorScreen.jsx';
import { CropDoctorScreen } from './components/screens/CropDoctorScreen.jsx';
import { WeatherScreen } from './components/screens/WeatherScreen.jsx';
import { InsightsScreen } from './components/screens/InsightsScreen.jsx';
import { NextActionScreen } from './components/screens/NextActionScreen.jsx';
import { MyFarmsScreen } from './components/screens/MyFarmsScreen.jsx';
import { ProfileScreen } from './components/screens/ProfileScreen.jsx';
import { NotificationsScreen } from './components/screens/NotificationsScreen.jsx';
import { DemoJourney } from './components/screens/DemoJourney.jsx';

import { Header } from './components/Header.jsx';
import { Navbar } from './components/Navbar.jsx';
import { VoiceModal } from './components/VoiceModal.jsx';

import { getActiveFarm, addFarm } from './services/farmService.js';
import { subscribeLanguageChange, setLanguage, getLanguage } from './locales/i18n.js';

export function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [currentTab, setCurrentTab] = useState('home');
  const [activeFarm, setActiveFarm] = useState(getActiveFarm());
  
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const [currentLang, setCurrentLang] = useState(getLanguage());

  const [tempCoords, setTempCoords] = useState({ lat: 22.3039, lng: 70.8022 });
  const [tempBoundary, setTempBoundary] = useState(null);

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');

  useEffect(() => {
    const unsub = subscribeLanguageChange((lang) => {
      setCurrentLang(lang);
    });
    return () => unsub();
  }, []);

  const handleSelectTab = (tabId) => {
    setCurrentTab(tabId);
    if (tabId === 'home') setCurrentScreen('dashboard');
    else if (tabId === 'myFarm') setCurrentScreen('myFarms');
    else if (tabId === 'aiAdvisor') setCurrentScreen('aiAdvisor');
    else if (tabId === 'diagnose') setCurrentScreen('diagnose');
    else if (tabId === 'profile') setCurrentScreen('profile');
  };

  const handleRunDemoStep = (stepType, param) => {
    if (stepType === 'language') {
      setLanguage(param);
    } else if (stepType === 'country') {
      setSelectedCountry(param);
    } else if (stepType === 'dashboard') {
      setCurrentTab('home');
      setCurrentScreen('dashboard');
    } else if (stepType === 'aiAdvisor') {
      if (param) setAiQuestion(param);
      setCurrentTab('aiAdvisor');
      setCurrentScreen('aiAdvisor');
    } else if (stepType === 'diagnose') {
      setCurrentTab('diagnose');
      setCurrentScreen('diagnose');
    } else if (stepType === 'insights') {
      setCurrentScreen('insights');
    } else if (stepType === 'weather') {
      setCurrentScreen('weather');
    }
  };

  const showNavbar = ['dashboard', 'myFarms', 'aiAdvisor', 'diagnose', 'profile', 'weather', 'insights', 'nextAction', 'notifications'].includes(currentScreen);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Top Header */}
      {showNavbar && (
        <Header 
          activeFarm={activeFarm}
          onOpenFarmSelector={() => {
            setCurrentTab('myFarm');
            setCurrentScreen('myFarms');
          }}
          onOpenNotifications={() => setCurrentScreen('notifications')}
          onOpenLanguage={() => setCurrentScreen('language')}
        />
      )}

      {/* Main Viewport Content */}
      <div className={`app-viewport ${showNavbar ? '' : 'no-navbar'}`}>
        
        {/* Onboarding Screens */}
        {currentScreen === 'splash' && (
          <SplashScreen onFinish={() => setCurrentScreen('welcome')} />
        )}

        {currentScreen === 'welcome' && (
          <WelcomeScreen 
            onGetStarted={() => setCurrentScreen('language')}
            onSignIn={() => setCurrentScreen('login')}
            onSelectLanguage={() => setCurrentScreen('language')}
          />
        )}

        {currentScreen === 'language' && (
          <LanguageScreen 
            currentLang={currentLang}
            onSelectLang={(l) => {
              setCurrentScreen('country');
            }}
            onBack={() => setCurrentScreen('welcome')}
          />
        )}

        {currentScreen === 'country' && (
          <CountryScreen 
            selectedCountry={selectedCountry}
            onSelectCountry={(c) => {
              setSelectedCountry(c);
              setCurrentScreen('login');
            }}
            onBack={() => setCurrentScreen('language')}
          />
        )}

        {currentScreen === 'login' && (
          <LoginScreen 
            onLoginSuccess={() => setCurrentScreen('farmLocation')}
            onBack={() => setCurrentScreen('country')}
          />
        )}

        {/* Farm Setup Screens */}
        {currentScreen === 'farmLocation' && (
          <LocationMethodScreen 
            onUseLocation={(pos) => {
              setTempCoords(pos);
              setCurrentScreen('mapPin');
            }}
            onSearchLocation={(pos) => {
              setTempCoords(pos);
              setCurrentScreen('mapPin');
            }}
            onPickOnMap={(pos) => {
              setTempCoords(pos);
              setCurrentScreen('mapPin');
            }}
            onBack={() => setCurrentScreen('login')}
          />
        )}

        {currentScreen === 'mapPin' && (
          <MapPinScreen 
            initialCoords={tempCoords}
            onConfirmLocation={(pos) => {
              setTempCoords(pos);
              setCurrentScreen('boundary');
            }}
            onBack={() => setCurrentScreen('farmLocation')}
          />
        )}

        {currentScreen === 'boundary' && (
          <BoundaryDrawerScreen 
            initialCoords={tempCoords}
            onConfirmBoundary={(boundaryData) => {
              setTempBoundary(boundaryData);
              setCurrentScreen('farmDetails');
            }}
            onBack={() => setCurrentScreen('mapPin')}
          />
        )}

        {currentScreen === 'farmDetails' && (
          <FarmDetailsScreen 
            initialData={{
              name: 'Rajkot Groundnut Farm',
              location: 'Rajkot, Gujarat, India',
              area: tempBoundary?.area || 2.45,
              crop: 'Groundnut',
              soilType: 'Loamy',
              cropStage: 'Flowering'
            }}
            onSaveFarm={(formData) => {
              const newFarmObj = addFarm(formData);
              setActiveFarm(newFarmObj);
              setCurrentTab('home');
              setCurrentScreen('dashboard');
            }}
            onBack={() => setCurrentScreen('boundary')}
          />
        )}

        {/* Main Application Tab Screens */}
        {currentScreen === 'dashboard' && (
          <DashboardScreen 
            activeFarm={activeFarm}
            onNavigateTab={handleSelectTab}
            onOpenWeather={() => setCurrentScreen('weather')}
            onOpenInsights={() => setCurrentScreen('insights')}
            onOpenActionPlan={() => setCurrentScreen('nextAction')}
            onOpenWhyAlert={() => {
              setAiQuestion('Why is irrigation delay recommended for heavy rain tomorrow?');
              setCurrentTab('aiAdvisor');
              setCurrentScreen('aiAdvisor');
            }}
            onAddFarm={() => setCurrentScreen('farmLocation')}
          />
        )}

        {currentScreen === 'aiAdvisor' && (
          <AIAdvisorScreen 
            activeFarm={activeFarm}
            initialQuestion={aiQuestion}
            onOpenVoiceModal={() => setIsVoiceOpen(true)}
          />
        )}

        {currentScreen === 'diagnose' && (
          <CropDoctorScreen 
            onAskAiFollowUp={(q) => {
              setAiQuestion(q);
              setCurrentTab('aiAdvisor');
              setCurrentScreen('aiAdvisor');
            }}
          />
        )}

        {currentScreen === 'weather' && (
          <WeatherScreen onBack={() => setCurrentScreen('dashboard')} />
        )}

        {currentScreen === 'insights' && (
          <InsightsScreen activeFarm={activeFarm} onBack={() => setCurrentScreen('dashboard')} />
        )}

        {currentScreen === 'nextAction' && (
          <NextActionScreen onBack={() => setCurrentScreen('dashboard')} />
        )}

        {currentScreen === 'myFarms' && (
          <MyFarmsScreen 
            onAddFarm={() => setCurrentScreen('farmLocation')}
            onSelectFarm={(f) => {
              setActiveFarm(f);
              setCurrentTab('home');
              setCurrentScreen('dashboard');
            }}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileScreen 
            selectedCountryCode={selectedCountry}
            onOpenLanguage={() => setCurrentScreen('language')}
            onOpenCountry={() => setCurrentScreen('country')}
            onLogout={() => setCurrentScreen('welcome')}
          />
        )}

        {currentScreen === 'notifications' && (
          <NotificationsScreen onBack={() => setCurrentScreen('dashboard')} />
        )}

      </div>

      {/* Floating Hackathon Demo Journey Button */}
      {showNavbar && (
        <button 
          className="demo-journey-btn" 
          onClick={() => setIsDemoOpen(true)}
        >
          <span>🚀 Hackathon Tour</span>
        </button>
      )}

      {/* Bottom Navigation Bar */}
      {showNavbar && (
        <Navbar currentTab={currentTab} onSelectTab={handleSelectTab} />
      )}

      {/* Voice Modal */}
      <VoiceModal 
        isOpen={isVoiceOpen} 
        onClose={() => setIsVoiceOpen(false)}
        onVoiceRecorded={(transcript) => {
          setAiQuestion(transcript);
          setCurrentTab('aiAdvisor');
          setCurrentScreen('aiAdvisor');
        }}
      />

      {/* Hackathon Demo Journey Modal */}
      {isDemoOpen && (
        <DemoJourney 
          onRunStep={handleRunDemoStep}
          onClose={() => setIsDemoOpen(false)}
        />
      )}

    </div>
  );
}

export default App;
