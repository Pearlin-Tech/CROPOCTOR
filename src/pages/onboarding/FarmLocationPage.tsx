import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Navigation } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'
import { useFarmSetup } from '@/store/FarmSetupContext'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMapsLibrary,
  useMap,
} from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

// ─── Places Autocomplete Input ────────────────────────────────────────────────
interface PlaceResult {
  name: string
  lat: number
  lng: number
}

interface AutocompleteInputProps {
  onPlaceSelect: (place: PlaceResult) => void
  placeholder: string
}

function AutocompleteInput({ onPlaceSelect, placeholder }: AutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const placesLib = useMapsLibrary('places')
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const widget = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
    })
    setAutocomplete(widget)
  }, [placesLib])

  useEffect(() => {
    if (!autocomplete) return
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.geometry?.location) {
        onPlaceSelect({
          name: place.formatted_address || place.name || 'Selected Location',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        })
      }
    })
    return () => google.maps.event.removeListener(listener)
  }, [autocomplete, onPlaceSelect])

  return (
    <div className="relative">
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-earth/60 z-10"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3.5 bg-white border border-brown-pastel/50 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-green-forest/30 focus:border-green-forest shadow-sm transition-all"
      />
    </div>
  )
}

// ─── Map click + reverse geocode handler ─────────────────────────────────────
interface MapInteractorProps {
  markerPos: { lat: number; lng: number } | null
  onMapClick: (lat: number, lng: number, address: string) => void
}

function MapInteractor({ markerPos, onMapClick }: MapInteractorProps) {
  const map = useMap()
  const geocodingLib = useMapsLibrary('geocoding')
  const geocoder = useRef<google.maps.Geocoder | null>(null)

  useEffect(() => {
    if (geocodingLib) geocoder.current = new geocodingLib.Geocoder()
  }, [geocodingLib])

  useEffect(() => {
    if (!map) return
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()

      if (geocoder.current) {
        geocoder.current.geocode({ location: { lat, lng } }, (results, status) => {
          const address =
            status === 'OK' && results && results[0]
              ? results[0].formatted_address
              : `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          onMapClick(lat, lng, address)
        })
      } else {
        onMapClick(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      }
    })
    return () => google.maps.event.removeListener(listener)
  }, [map, onMapClick, geocoder])

  // Pan map to marker when it changes
  useEffect(() => {
    if (map && markerPos) {
      map.panTo(markerPos)
    }
  }, [map, markerPos])

  return markerPos ? <AdvancedMarker position={markerPos} /> : null
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const FarmLocationPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { setup, setLocation } = useFarmSetup()

  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(
    setup.location ? { lat: setup.location.lat, lng: setup.location.lng } : null
  )
  const [address, setAddress] = useState<string>(setup.location?.name || '')
  const [locating, setLocating] = useState(false)

  const defaultCenter = setup.location
    ? { lat: setup.location.lat, lng: setup.location.lng }
    : { lat: 20.5937, lng: 78.9629 } // India center — no hardcoded city

  const handleMapClick = useCallback((lat: number, lng: number, addr: string) => {
    setMarkerPos({ lat, lng })
    setAddress(addr)
  }, [])

  const handlePlaceSelect = useCallback((place: PlaceResult) => {
    setMarkerPos({ lat: place.lat, lng: place.lng })
    setAddress(place.name)
  }, [])

  const handleUseMyLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setMarkerPos({ lat, lng })
        // Reverse geocode is handled by the map listener but we do it inline here too
        fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
        )
          .then(r => r.json())
          .then(data => {
            const addr = data.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            setAddress(addr)
          })
          .catch(() => setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`))
          .finally(() => setLocating(false))
      },
      err => {
        console.warn('Geolocation error:', err)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleConfirm = () => {
    if (!markerPos) return
    setLocation({ name: address, lat: markerPos.lat, lng: markerPos.lng })
    navigate('/onboarding/boundary')
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full"
    >
      {/* Header */}
      <div className="px-6 pt-10 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-brown-pastel/30 text-brown-earth mb-6 shadow-sm hover:bg-brown-pastel/50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex gap-1.5 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= 2 ? 'bg-green-forest' : 'bg-brown-pastel/40'}`} />
          ))}
        </div>
        <h1 className="text-2xl font-bold text-green-forest mb-1">{t('farm.location.title')}</h1>
        <p className="text-text-secondary font-medium text-sm">{t('farm.location.subtitle')}</p>
      </div>

      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        {/* Search box — inside APIProvider so useMapsLibrary works */}
        <div className="px-6 mb-3 relative z-20">
          <AutocompleteInput
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search village, taluk, district…"
          />
        </div>

        {/* Interactive Google Map */}
        <div className="mx-6 rounded-3xl overflow-hidden border border-brown-pastel/30 shadow-md" style={{ height: '300px' }}>
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={5}
            mapId="farm-location-map"
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            streetViewControl={false}
            fullscreenControl={false}
            mapTypeControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            <MapInteractor markerPos={markerPos} onMapClick={handleMapClick} />
          </Map>
        </div>

        {/* Selected location pill */}
        {markerPos && (
          <div className="mx-6 mt-3 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm border border-brown-pastel/20">
            <div className="w-8 h-8 rounded-full bg-green-forest/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-green-forest" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-brown-earth leading-snug">{address || 'Selected location'}</p>
              <p className="text-[10px] text-brown-earth/50">
                {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
              </p>
            </div>
          </div>
        )}

        <div className="px-6 mt-4 space-y-3 flex-1">
          {/* Use My Location */}
          <button
            onClick={handleUseMyLocation}
            disabled={locating}
            className="w-full flex items-center gap-3 px-5 py-4 bg-brown-earth text-white rounded-2xl font-semibold shadow-button hover:bg-brown-deep transition-all disabled:opacity-60"
          >
            <Navigation className="w-5 h-5 shrink-0" />
            {locating ? 'Getting your location…' : t('farm.location.useMyLocation')}
          </button>

          <p className="text-xs text-center text-gray-400 font-medium">
            Or tap anywhere on the map to drop a pin
          </p>
        </div>

        <div className="px-6 py-6">
          <Button
            variant="primary"
            size="xl"
            fullWidth
            onClick={handleConfirm}
            disabled={!markerPos || locating}
          >
            {t('farm.location.useThisLocation')} →
          </Button>
        </div>
      </APIProvider>
    </motion.div>
  )
}

export default FarmLocationPage
