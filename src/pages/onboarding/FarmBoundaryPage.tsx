import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, Info } from 'lucide-react'
import { pageVariants } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { useTranslation } from 'react-i18next'
import { useFarmSetup, useRequireSetupLocation } from '@/store/FarmSetupContext'
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

// ─── Polygon Component ────────────────────────────────────────────────────────
interface EditablePolygonProps {
  paths: google.maps.LatLngLiteral[]
  editable?: boolean
  onEdit?: (newPaths: google.maps.LatLngLiteral[]) => void
}

function EditablePolygon({ paths, editable = true, onEdit }: EditablePolygonProps) {
  const map = useMap()
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const isInternalEdit = useRef(false)
  
  // Initialize Polygon
  useEffect(() => {
    if (!map) return
    const polygon = new google.maps.Polygon({
      editable,
      draggable: editable,
      fillColor: '#4ade80',
      fillOpacity: 0.3,
      strokeColor: '#166534',
      strokeWeight: 2,
    })
    polygon.setMap(map)
    polygonRef.current = polygon
    
    return () => {
      polygon.setMap(null)
    }
  }, [map])

  // Sync paths from props (only when triggered externally, not during drag)
  useEffect(() => {
    if (!polygonRef.current) return
    if (isInternalEdit.current) {
      isInternalEdit.current = false
      return
    }
    polygonRef.current.setPaths(paths)
  }, [paths])

  // Sync editable state
  useEffect(() => {
    if (!polygonRef.current) return
    polygonRef.current.setEditable(editable)
    polygonRef.current.setDraggable(editable)
  }, [editable])

  // Setup Event Listeners
  useEffect(() => {
    if (!polygonRef.current || !onEdit) return
    const polygon = polygonRef.current
    const path = polygon.getPath()
    
    const handleEdit = () => {
      isInternalEdit.current = true
      const newPaths: google.maps.LatLngLiteral[] = []
      const pathArray = polygon.getPath().getArray()
      pathArray.forEach(p => {
        newPaths.push({ lat: p.lat(), lng: p.lng() })
      })
      onEdit(newPaths)
    }
    
    const listeners = [
      google.maps.event.addListener(path, 'set_at', handleEdit),
      google.maps.event.addListener(path, 'insert_at', handleEdit),
      google.maps.event.addListener(path, 'remove_at', handleEdit),
      google.maps.event.addListener(polygon, 'dragend', handleEdit),
    ]
    
    return () => {
      listeners.forEach(l => google.maps.event.removeListener(l))
    }
  }, [onEdit])

  return null
}



// ─── Map Content Component ──────────────────────────────────────────────────────
interface MapContentProps {
  mapCenter: google.maps.LatLngLiteral
  boundaryState: google.maps.LatLngLiteral[]
  boundaryRef: React.MutableRefObject<google.maps.LatLngLiteral[]>
  setBoundaryState: React.Dispatch<React.SetStateAction<google.maps.LatLngLiteral[]>>
  setAreaInput: React.Dispatch<React.SetStateAction<string>>
  unit: 'acres' | 'hectares'
  isDrawing: boolean
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>
}

function MapContent({ mapCenter, boundaryState, boundaryRef, setBoundaryState, setAreaInput, unit, isDrawing, setIsDrawing }: MapContentProps) {
  const { t } = useTranslation()
  const geometryLib = useMapsLibrary('geometry')

  const updateAreaFromPaths = useCallback((paths: google.maps.LatLngLiteral[], currentUnit: 'acres' | 'hectares') => {
    if (geometryLib && paths.length >= 3) {
      const gMapsPaths = paths.map(p => new google.maps.LatLng(p.lat, p.lng))
      const areaSqMeters = geometryLib.spherical.computeArea(gMapsPaths)
      const newAreaVal = currentUnit === 'acres' ? areaSqMeters / 4046.86 : areaSqMeters / 10000
      setAreaInput(newAreaVal.toFixed(2))
    } else {
      setAreaInput('0.00')
    }
  }, [geometryLib, setAreaInput])



  const handlePolygonEdit = useCallback((newPaths: google.maps.LatLngLiteral[]) => {
    if (isDrawing) return
    boundaryRef.current = newPaths
    setBoundaryState(newPaths)
    updateAreaFromPaths(newPaths, unit)
  }, [updateAreaFromPaths, unit, setBoundaryState, boundaryRef, isDrawing])

  const handleMapClick = useCallback((e: any) => {
    if (!isDrawing || !e.detail.latLng) return
    const newPoint = { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng }
    setBoundaryState(prev => {
      const updated = [...prev, newPoint]
      boundaryRef.current = updated
      return updated
    })
  }, [isDrawing, setBoundaryState, boundaryRef])

  // Recalculate area if unit changes while boundary exists
  useEffect(() => {
    if (!isDrawing && boundaryState.length >= 3) {
      updateAreaFromPaths(boundaryState, unit)
    }
  }, [unit, boundaryState, updateAreaFromPaths, isDrawing])

  return (
    <Map
      defaultCenter={mapCenter}
      defaultZoom={16}
      mapId="farm-boundary-map"
      gestureHandling="greedy"
      disableDefaultUI={false}
      zoomControl={true}
      streetViewControl={false}
      fullscreenControl={false}
      mapTypeControl={false}
      mapTypeId="hybrid"
      onClick={handleMapClick}
    >
      {boundaryState.length === 0 && (
        <AdvancedMarker position={mapCenter} />
      )}
      
      {/* Show points while drawing */}
      {isDrawing && boundaryState.length > 0 && boundaryState.map((point, idx) => (
        <AdvancedMarker key={idx} position={point} />
      ))}
      
      {/* Show polygon connecting points */}
      {boundaryState.length > 1 && (
        <EditablePolygon 
          paths={boundaryState} 
          editable={!isDrawing} 
          onEdit={handlePolygonEdit} 
        />
      )}
      
    </Map>
  )
}


// ─── Main Page ────────────────────────────────────────────────────────────────
const FarmBoundaryPage: React.FC = () => {
  useRequireSetupLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { setup, setArea } = useFarmSetup()
  
  const [unit, setUnit] = useState<'acres' | 'hectares'>(setup.areaUnit || 'acres')
  const [areaInput, setAreaInput] = useState<string>(setup.area ? setup.area.toString() : '0.00')
  
  const mapCenter = setup.location
    ? { lat: setup.location.lat, lng: setup.location.lng }
    : { lat: 20.5937, lng: 78.9629 }

  const [boundaryState, setBoundaryState] = useState<google.maps.LatLngLiteral[]>(setup.boundary || [])
  const boundaryRef = useRef<google.maps.LatLngLiteral[]>(setup.boundary || [])
  const [isDrawing, setIsDrawing] = useState(setup.boundary ? false : true)


  const handleClear = () => {
    setBoundaryState([])
    boundaryRef.current = []
    setAreaInput('0.00')
    setIsDrawing(true)
  }

  // Handle Unit Toggle
  const handleUnitToggle = (newUnit: 'acres' | 'hectares') => {
    if (newUnit === unit) return
    // A drawn boundary is recalculated by the map; a typed area is converted here
    if (!(!isDrawing && boundaryState.length >= 3)) {
      const v = parseFloat(areaInput)
      if (v > 0) setAreaInput((newUnit === 'hectares' ? v * 0.404686 : v / 0.404686).toFixed(2))
    }
    setUnit(newUnit)
  }

  const areaValue = parseFloat(areaInput) || 0
  // A finished boundary (≥3 points) computes the area; without one the farmer may type it
  const hasBoundary = !isDrawing && boundaryState.length >= 3

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-cream flex flex-col max-w-md mx-auto w-full"
    >
      <div className="px-6 pt-10 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-brown-pastel/30 text-brown-earth mb-6 shadow-sm hover:bg-brown-pastel/50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-green-forest mb-1">
          {t('farm.location.markArea', 'Farm Boundary')}
        </h1>
        <p className="text-text-secondary font-medium text-sm">
          {t('farm.location.tapMap', 'Draw your farm boundary or enter the area.')}
        </p>
      </div>

      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <div
          className="mx-6 rounded-3xl overflow-hidden border border-brown-pastel/30 shadow-md relative"
          style={{ height: '320px' }}
        >
          <MapContent 
            mapCenter={mapCenter}
            boundaryState={boundaryState}
            boundaryRef={boundaryRef}
            setBoundaryState={setBoundaryState}
            setAreaInput={setAreaInput}
            unit={unit}
            isDrawing={isDrawing}
            setIsDrawing={setIsDrawing}
          />

          <div className="absolute top-3 left-3 right-3 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-sm border border-brown-pastel/20 z-10 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-forest shrink-0" />
            <p className="text-xs font-bold text-brown-earth truncate">
              {setup.location?.name || t('farm.boundary.selectedLocation', 'Selected Location')}
            </p>
          </div>
        </div>
      </APIProvider>

      <div className="px-6 mt-4 mb-2 flex items-start justify-between gap-4 bg-brown-pastel/10 p-4 rounded-3xl border border-brown-pastel/20 mx-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-green-forest shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-brown-earth/80 leading-relaxed">
            {isDrawing
              ? t('farm.boundary.drawHint', 'Tap points on the map to draw your farm boundary, then press Finish Drawing. Or skip the map and type the area below.')
              : t('farm.boundary.editHint', 'Drag the corners to adjust your boundary. The area will update automatically.')}
          </p>
        </div>
        {/* Rendered outside <Map>: Google Maps captures pointer events of its children */}
        {isDrawing && boundaryState.length >= 3 && (
          <Button variant="primary" size="sm" onClick={() => setIsDrawing(false)} className="shrink-0">
            {t("ui.farmBoundaryPage.finishDrawing", "Finish Drawing")}
          </Button>
        )}
        {isDrawing && boundaryState.length > 0 && boundaryState.length < 3 && (
          <Button variant="outline" size="sm" onClick={handleClear} className="shrink-0 bg-white">
            {t('farm.boundary.clearPoints', 'Clear')}
          </Button>
        )}
        {!isDrawing && boundaryState.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear} className="shrink-0 bg-white">
            {t("ui.farmBoundaryPage.redraw", "Redraw")}
          </Button>
        )}
      </div>

      <div className="px-6 mt-2 flex-1 space-y-4">
        <div className="bg-white rounded-3xl p-5 border border-brown-pastel/30 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
            {t('farm.location.enterArea', 'Farm Size')}
          </label>
          
          <div className="flex gap-3">
            <input
              type="text"
              inputMode="decimal"
              aria-label={t('farm.location.enterArea', 'Farm Size')}
              readOnly={hasBoundary}
              value={areaInput}
              onChange={e => setAreaInput(e.target.value.replace(/[^0-9.]/g, ''))}
              onFocus={e => { if (!hasBoundary && areaInput === '0.00') setAreaInput('') }}
              placeholder="0.00"
              className={`flex-1 min-w-0 w-full border rounded-2xl px-4 py-3.5 text-xl font-bold outline-none transition-all ${hasBoundary ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border-brown-pastel/40 text-text-main focus:border-green-forest'}`}
            />
            <div className="flex bg-gray-100 rounded-2xl p-1 shrink-0">
              <button
                onClick={() => handleUnitToggle('acres')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                  unit === 'acres' ? 'bg-white text-green-forest shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t("ui.farmBoundaryPage.acres", "Acres")}
              </button>
              <button
                onClick={() => handleUnitToggle('hectares')}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                  unit === 'hectares' ? 'bg-white text-green-forest shadow-sm' : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t('farm.boundary.hectaresShort', 'Ha')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 mt-auto">
        <Button
          variant="primary"
          size="xl"
          fullWidth
          onClick={() => {
            if (areaValue > 0) {
              setArea(areaValue, unit, hasBoundary ? boundaryRef.current : undefined)
              navigate('/onboarding/farm-details')
            }
          }}
          disabled={areaValue <= 0 || (boundaryState.length > 0 && !hasBoundary)}
        >
          {t('farm.location.confirmArea', 'Confirm Boundary')} →
        </Button>
      </div>
    </motion.div>
  )
}

export default FarmBoundaryPage
