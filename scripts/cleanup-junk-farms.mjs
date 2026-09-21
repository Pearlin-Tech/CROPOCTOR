#!/usr/bin/env node
/**
 * cleanup-junk-farms.mjs
 * 
 * Finds and removes "junk" farm documents created by the saveFarm bug:
 * - name: "New Farm" OR
 * - primaryCrop: "Unknown Crop" OR  
 * - area.value: 0
 * 
 * Usage:
 *   node scripts/cleanup-junk-farms.mjs --dry-run   (show what would be deleted)
 *   node scripts/cleanup-junk-farms.mjs --delete     (actually delete)
 * 
 * Requires: VITE_FIREBASE_PROJECT_ID, FIREBASE_ADMIN_KEY_BASE64 in environment.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const args = process.argv.slice(2)
const isDryRun = !args.includes('--delete')

if (isDryRun) {
  console.log('🔍 DRY RUN MODE — No documents will be deleted.')
  console.log('   Run with --delete flag to actually remove documents.\n')
} else {
  console.log('🗑️  DELETE MODE — Documents will be permanently removed!\n')
}

// Initialize Firebase Admin
let app
try {
  const adminKeyBase64 = process.env.FIREBASE_ADMIN_KEY_BASE64
  if (!adminKeyBase64) {
    // Try loading from local file
    const fs = await import('fs')
    const keyPath = process.env.EE_KEY_PATH || '.gee-key.json'
    if (fs.existsSync(keyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
      app = initializeApp({ credential: cert(serviceAccount) })
    } else {
      throw new Error('No FIREBASE_ADMIN_KEY_BASE64 or local key file found.')
    }
  } else {
    const serviceAccount = JSON.parse(Buffer.from(adminKeyBase64, 'base64').toString('utf8'))
    app = initializeApp({ credential: cert(serviceAccount) })
  }
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin:', err.message)
  console.error('   Set FIREBASE_ADMIN_KEY_BASE64 env var or ensure .gee-key.json exists.')
  process.exit(1)
}

const db = getFirestore(app)

function isJunkFarm(data) {
  const name = data.name || ''
  const crop = data.crop || ''
  const areaValue = data.area?.value ?? data.area ?? 0
  
  return (
    name.toLowerCase() === 'new farm' ||
    crop.toLowerCase() === 'unknown crop' ||
    crop === '' ||
    areaValue === 0
  )
}

async function findAndCleanJunkFarms() {
  const usersSnap = await db.collection('users').get()
  let totalJunk = 0
  let totalDeleted = 0
  
  console.log(`Found ${usersSnap.size} users to scan.\n`)
  
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    const farmsSnap = await db.collection('users').doc(userId).collection('farms').get()
    
    if (farmsSnap.empty) continue
    
    const junkFarms = farmsSnap.docs.filter(farmDoc => isJunkFarm(farmDoc.data()))
    
    if (junkFarms.length === 0) {
      console.log(`✅ User ${userId}: ${farmsSnap.size} farms — none are junk`)
      continue
    }
    
    console.log(`⚠️  User ${userId}: ${farmsSnap.size} total farms, ${junkFarms.length} junk`)
    for (const junkDoc of junkFarms) {
      const data = junkDoc.data()
      console.log(`   [JUNK] id=${junkDoc.id} name="${data.name}" crop="${data.crop}" area=${data.area?.value ?? 0}`)
      totalJunk++
      
      if (!isDryRun) {
        await junkDoc.ref.delete()
        console.log(`   [DELETED] ${junkDoc.id}`)
        totalDeleted++
      }
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total junk farms found: ${totalJunk}`)
  if (!isDryRun) {
    console.log(`   Total deleted: ${totalDeleted}`)
  } else {
    console.log(`   Run with --delete to remove these ${totalJunk} documents.`)
  }
}

findAndCleanJunkFarms().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
