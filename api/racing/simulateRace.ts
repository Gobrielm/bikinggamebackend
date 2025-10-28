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
  position: number;
  velocity: number;
  cyclists: (Cyclist | null)[][]; // row, then col

  constructor(width: number, initalDepth?: number) {
    this.position = 0;
    this.velocity = 0;
    this.cyclists = [];
    for (let i = 0; i < (initalDepth ?? 1); i++) {
      this.cyclists[i] = [];
      this.cyclists[i].fill(null, 0, width);
    }
  }

  addCyclistToFront(cyclist: Cyclist): void {
    for (let j = 0; j < this.cyclists[0].length; j++) {
      if (this.cyclists[0][j] != null) {
        continue;
      }
      this.addCyclistToPositon(cyclist, 0, j);
    }

    
  }

  addCyclistToRow(cyclist: Cyclist, row: number): void {
    if (this.cyclists.length == row) {
      this.extendCyclistGroup()
    }
    for (let j = 0; j < this.cyclists[row].length; j++) {
      if (this.cyclists[row][j] != null) {
        continue;
      }
      this.addCyclistToPositon(cyclist, row, j);
    }
    this.addCyclistToRow(cyclist, row + 1); // todo need to swap and move that rider back instead
  }

  addCyclistToBack(cyclist: Cyclist): void {
    for (let i = this.cyclists.length; i >= 0; i--) {
      for (let j = 0; j < this.cyclists[0].length; j++) {
        if (this.cyclists[i][j] != null) {
          continue;
        }

        this.addCyclistToPositon(cyclist, i, j);
        return;
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
  position: number;
  velocity: number;
  cyclistStats: CyclistStats;
  raceStrategy: string;
  constructor(stats: any[], raceStrategy: string) {
    this.position = 0;
    this.velocity = 0;
    this.cyclistStats = new CyclistStats(stats);
    this.raceStrategy = raceStrategy;
  }
}

class CyclistStats {
  recovery: number;
  strength: number;
  threshold: number;
  weight: number;
  height: number;
  constructor(stats: any[]) {
    if (stats.length < 5) {
      throw "Invalid Stats";
    }
    this.recovery = stats[1];
    this.strength = stats[2];
    this.threshold = stats[3];
    this.weight = stats[4];
    this.height = stats[5];
  }
}

enum CyclistRacingStrategy {
  rouleur, // Outpace through threshold
  domestique, // Helper basically
  climber, // Go hard on hills to outpace
  sprinter, // Conserve in pack and wait to sprint at end
  baroudeur, // Gets into a breakaway early on
}

const db = getFirestore('(default)');

async function getCyclist(email: string, id: number): Promise<any[]> {
    const docRef = await db.collection("inventories").doc(email);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new Error("Can't find document for " + email);
    }
    const data = snapshot.get(`${id}`);
    if (data == undefined) throw new Error("Can't find data in document for " + email);
    return data as any[];
}

// Not inclusive of max
function getRandomNum(min: number, max: number): number {
  return Math.random() * (max - min - 1) + min;
}

function generateRandomCyclistStats(difficulty: number): any[] {
  let stats = [0, 0, 0, 0, 0];
  let stat1 = getRandomNum(difficulty * 0.5, difficulty * 1.5);
  let stat2 = getRandomNum(difficulty * 0.5, difficulty * 1.5);
  let stat3 = difficulty - stat1 - stat2 + getRandomNum(-difficulty * 0.1, difficulty * 0.1);
  let i = getRandomNum(0, 2);
  stats[i] = stat1;
  i = (i + 1) % 3;
  stats[i] = stat2;
  i = (i + 1) % 3;
  stats[i] = stat3;

  stats[3] = getRandomNum(120, 200);
  stats[4] = getRandomNum(5.2, 6.5);

  return stats;
}


/* 
  difficulty: Average combined stats of a cyclist
*/
function createMainPeloton(cyclist: Cyclist, difficulty: number): CyclistGroup {
  let otherCyclists: Cyclist[] = [];
  for (let i = 0; i < 39; i++) {
    otherCyclists.push(new Cyclist(generateRandomCyclistStats(difficulty), CyclistRacingStrategy[getRandomNum(0, 5)]))
  }
  otherCyclists.splice(getRandomNum(0, 40), 0, cyclist);
  
  let cyclistGroup = new CyclistGroup(8, 5);
  for (let i = 0; i < otherCyclists.length; i++) {
    cyclistGroup.addCyclistToBack(otherCyclists[i]);
  }
  return cyclistGroup;
}

async function simulateRace(mainPeloton: CyclistGroup) {

}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let cyclistData: any[] = [];
  let raceStrat: string = CyclistRacingStrategy[1];
    try {
    const email: string = req.body.email;
    cyclistData = req.body.cyclist;
    raceStrat = CyclistRacingStrategy[req.body.racingStrategy];
    
    const databaseCyclist = await getCyclist(email, cyclistData[0]);

    if (databaseCyclist != cyclistData) {
      throw "Mismatch Between local and database cyclists";
    }
    
  } catch (err) {
    console.error("Error getting data:", err);
    res.status(500).json({ 
      error: err,
      message: `Email: ${req.body.email}`
    });
  }
  try {
    let cyclistObj = new Cyclist(cyclistData, raceStrat);
    await simulateRace(createMainPeloton(cyclistObj, 90));
  } catch (err) {

  }
  
}