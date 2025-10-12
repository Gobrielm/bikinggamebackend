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

async function createUserData(email: string) {
  await db.collection("users").doc(email).set({
    points: 100,
  });
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const email: string = req.body.email;
    
    createUserData(email);
    res.status(200).json({
      message: "Setup User Successful!"
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: `Email: ${req.body}`
    });
  }
}