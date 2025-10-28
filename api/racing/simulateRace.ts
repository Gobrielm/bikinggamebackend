// Import the functions you need from the SDKs you need
var admin = require("firebase-admin");
import { DocumentData, getFirestore } from 'firebase-admin/firestore';
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

class CyclistGroup {
    cyclists: (Cyclist | null)[][]; // row, then col

    constructor(width: number) {
        this.cyclists = [];
        this.cyclists[0] = []; // Initialize inner array
        this.cyclists[0].fill(null, 0, width);
    }

    addCyclistToBack(cyclist: Cyclist): void {
        for (let i = this.cyclists[0].length; i >= 0; i--) {
            for (let j = 0; j < this.cyclists.length; j++) {
                if (this.cyclists[i][j] == null) {
                    this.addCyclistToPositon(cyclist, i, j);
                    return;
                }
            }
        }
        this.extendCyclistGroup();
        this.addCyclistToBack(cyclist);
    }

    addCyclistToPositon(cyclist: Cyclist, i: number, j: number): void {
        this.cyclists[i][j] = cyclist;
    }

    extendCyclistGroup() {
        this.cyclists.push([]);
        this.cyclists[this.cyclists.length - 1].fill(null, 0, this.cyclists[0].length);
    }
}

class Cyclist {
    cyclistStats: CyclistStats;
    constructor(stats: any[]) {
        this.cyclistStats = new CyclistStats(stats);
    }
}

class CyclistStats {
    recovery: number;
    strength: number;
    threshold: number;
    weight: number;
    height: number;
    constructor(stats: any[]) {
        this.recovery = stats[1];
        this.strength = stats[2];
        this.threshold = stats[3];
        this.weight = stats[4];
        this.height = stats[5];
    }
}

const db = getFirestore('(default)');

async function getCyclist(email: string, id: number): Promise<DocumentData> {
    const docRef = await db.collection("inventories").doc(email);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new Error("Can't find document for " + email);
    }
    const data = snapshot.get(`$id`);
    if (data == undefined) throw new Error("Can't find data in document for " + email);
    return data
}

async function simulateRace(cyclist: Cyclist) {

}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let cyclist: any[]
    try {
    const email: string = req.body.email;
    cyclist = req.body.cyclist
    
    const databaseCyclist = await getCyclist(email, cyclist[0]);

    if (databaseCyclist != cyclist) {
        throw "Mismatch Between local and database cyclists";
    }
    
  } catch (err) {
    console.error("Error getting data:", err);
    res.status(500).json({ 
      error: err,
      message: `Email: ${req.body.email}`
    });
  }


}