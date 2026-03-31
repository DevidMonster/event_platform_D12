require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { connectDB } = require('../config/db');
const User = require('../models/User');

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeName(value, email) {
  const name = String(value || '').trim();
  if (name) return name;

  const prefix = normalizeEmail(email).split('@')[0].trim();
  return prefix || 'Người dùng';
}

function parseJsonCredential(rawValue) {
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
}

function loadServiceAccount() {
  const rawJson = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (rawJson) {
    return parseJsonCredential(rawJson);
  }

  const rawPath = String(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();
  if (rawPath) {
    const resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Firebase service account file not found: ${resolvedPath}`);
    }

    try {
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Failed to read Firebase service account file: ${error.message}`);
    }
  }

  const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .trim();

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey
    };
  }

  throw new Error(
    'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.'
  );
}

function getFirebaseAuthClient() {
  const existingApp = getApps()[0];
  if (existingApp) {
    return getAuth(existingApp);
  }

  const serviceAccount = loadServiceAccount();
  const app = initializeApp({
    credential: cert(serviceAccount)
  });

  return getAuth(app);
}

async function upsertFirebaseUser(firebaseUser) {
  const userUid = String(firebaseUser?.uid || '').trim() || null;
  const userEmail = normalizeEmail(firebaseUser?.email);

  if (!userEmail) {
    return { skipped: true, reason: 'no_email' };
  }

  const authorName = normalizeName(firebaseUser?.displayName, userEmail);
  const avatarUrl = String(firebaseUser?.photoURL || '').trim() || null;
  const lastSignInTime = firebaseUser?.metadata?.lastSignInTime
    ? new Date(firebaseUser.metadata.lastSignInTime)
    : null;
  const creationTime = firebaseUser?.metadata?.creationTime ? new Date(firebaseUser.metadata.creationTime) : null;
  const lastLoginAt =
    lastSignInTime && !Number.isNaN(lastSignInTime.getTime())
      ? lastSignInTime
      : creationTime && !Number.isNaN(creationTime.getTime())
        ? creationTime
        : null;

  await User.findOneAndUpdate(
    { userEmail },
    {
      $set: {
        userUid,
        userEmail,
        authorName,
        avatarUrl,
        provider: 'google',
        isActive: firebaseUser?.disabled ? false : true,
        lastLoginAt
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return { skipped: false, reason: null };
}

async function backfillFirebaseUsers() {
  await connectDB();
  const auth = getFirebaseAuthClient();

  const stats = {
    scanned: 0,
    upserted: 0,
    skippedNoEmail: 0,
    failed: 0
  };

  let nextPageToken;

  do {
    const result = await auth.listUsers(1000, nextPageToken);

    for (const firebaseUser of result.users) {
      stats.scanned += 1;

      try {
        const outcome = await upsertFirebaseUser(firebaseUser);
        if (outcome.skipped) {
          if (outcome.reason === 'no_email') {
            stats.skippedNoEmail += 1;
          }
          continue;
        }

        stats.upserted += 1;
      } catch (error) {
        stats.failed += 1;
        console.error(
          `[firebase-user-backfill] failed for uid=${String(firebaseUser?.uid || '')}: ${error.message || error}`
        );
      }
    }

    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.table(stats);
  console.log('Done. Firebase Auth users have been synced into Mongo collection "users".');
}

backfillFirebaseUsers()
  .catch((error) => {
    console.error('Failed to backfill Firebase users:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
