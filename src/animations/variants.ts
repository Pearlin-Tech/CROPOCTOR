import { type Variants } from 'framer-motion'

// ─── Page transitions ─────────────────────────────────────────────────────────
export const pageVariants: Variants = {
  initial:  { opacity: 0, y: 10 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:     { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

// ─── Staggered card list ──────────────────────────────────────────────────────
export const listVariants: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
}

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
}

// ─── Slide up (bottom sheet / modal) ─────────────────────────────────────────
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 300 } },
  exit:    { opacity: 0, y: '100%', transition: { duration: 0.2 } },
}

// ─── Fade ─────────────────────────────────────────────────────────────────────
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
}

// ─── Scale pop (button feedback, badge, etc.) ─────────────────────────────────
export const scaleVariants: Variants = {
  initial: { scale: 0.88, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { type: 'spring', damping: 20, stiffness: 280 } },
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.95 },
  animate: { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring', damping: 22, stiffness: 320 } },
  exit:    { opacity: 0, y: 8,  scale: 0.95, transition: { duration: 0.18 } },
}

// ─── AI result expand ─────────────────────────────────────────────────────────
export const expandVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { height: 0, opacity: 0, transition: { duration: 0.2 } },
}

// ─── Map pin drop ─────────────────────────────────────────────────────────────
export const pinDropVariants: Variants = {
  initial: { scale: 0, y: -20, opacity: 0 },
  animate: { scale: 1, y: 0,  opacity: 1, transition: { type: 'spring', damping: 12, stiffness: 200 } },
}

// ─── Splash leaf ──────────────────────────────────────────────────────────────
export const splashLeafVariants: Variants = {
  initial: { scale: 0, rotate: -30, opacity: 0 },
  animate: { scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring', damping: 14, stiffness: 150, delay: 0.5 } },
}

export const splashTextVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 1.0 } },
}

// ─── Tap button feedback ──────────────────────────────────────────────────────
export const buttonTapVariants = {
  whileTap: { scale: 0.96 },
  transition: { duration: 0.08 },
}
