// Import the functions you need from the SDKs you need
var admin = require("firebase-admin");
import { getFirestore } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node'
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = {
  "type": process.env.FIREBASE_TYPE,
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_KEY_ID,
  "private_key": (process.env.FIREBASE_KEY || "").replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": process.env.FIREBASE_AUTH_URI,
  "token_uri": process.env.FIREBASE_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL,
  "universe_domain": process.env.FIREBASE_DOMAIN
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore('default');

export async function getPoints(email: string): Promise<number> {
  
  const docRef = db.collection("users").doc(email);
  const snapshot = await docRef.get();
  
  if (!snapshot.exists) {
    return 0;
  }
  let data = snapshot.get('points');
  if (data == undefined) return 0;
  return data as number;
}

export async function getUserData(email: string) {
  
  const docRef = db.collection("users").doc(email);
  const snapshot = await docRef.get();
  
  if (!snapshot.exists) {
    return null;
  }
  return snapshot.data();
}

async function postUserData() {
  const docRef = await db.collection("users").add({ points: '20'});
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return null;
  }
  return snapshot.data();
}

async function getAllDocs() {
  const docs = await db.collection("users").listDocuments();
  return docs;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  
  try {
    const email: string = req.body.email;
    const points = await getPoints(email);

    res.status(200).json({
      points: {points},
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }

}