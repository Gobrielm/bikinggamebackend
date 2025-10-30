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
  route: number[];
  cyclists: (Cyclist | null)[][]; // row, then col

  constructor(width: number, route: number[], initalDepth?: number) {
    this.position = 0;
    this.velocity = 0;
    this.cyclists = [];
    this.route = route;
    for (let i = 0; i < (initalDepth ?? 1); i++) {
      this.cyclists[i] = [];
      this.cyclists[i].fill(null, 0, width);
    }
  }

  simulateTick(): void {
    for (let row = 0; row < this.cyclists.length; row++) {
      let cyclistRow = this.cyclists[row];
      let draft = this.getDraft(row);
      for (let cyclist of cyclistRow) {
        if (cyclist) {
          cyclist.simulateTick(draft, this.route);
          if (cyclist.velocity > this.velocity + 1) {
            
          } else if (cyclist.velocity < this.velocity - 1) {

          }
        }
      }
    }
  }
  // What percentage of wind is blocked
  getDraft(row: number): number {
    return Math.min(Math.sqrt(row), 4.0) / 4.0;
  }

  addCyclistToFront(cyclist: Cyclist): void {
    this.addCyclistToRow(cyclist, 0, getRandomNum(0, this.cyclists[0].length));
  }

  addCyclistToRow(cyclist: Cyclist, row: number, col: number): void {
    if (this.cyclists.length == row) {
      this.extendCyclistGroup()
    }
    for (let j = 0; j < this.cyclists[row].length; j++) {
      if (this.cyclists[row][j] != null) {
        continue;
      }
      this.addCyclistToPositon(cyclist, row, j);
    }
    // swap with cyclist at col
    let tempCyclist = this.cyclists[row][col] as Cyclist;
    this.cyclists[row][col] = cyclist;

    this.addCyclistToRow(tempCyclist, row + 1, col);
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

  addCyclistToPositon(cyclist: Cyclist, row: number, col: number): void {
    this.cyclists[row][col] = cyclist;
    cyclist.position = this.position;
  }

  extendCyclistGroup(): void {
    this.cyclists.push([]);
    this.cyclists[this.cyclists.length - 1].fill(null, 0, this.cyclists[0].length);
  }
}

const airResistConst: number = 0.33;

class Cyclist {
  position: number;
  velocity: number;
  energyLevel: number; // 0 - 100
  cyclistStats: CyclistStats;
  raceStrategy: string;

  constructor(stats: any[], raceStrategy: string) {
    this.position = 0;
    this.velocity = 0;
    this.energyLevel = 100;
    this.cyclistStats = new CyclistStats(stats);
    this.raceStrategy = raceStrategy;
  }

  simulateTick(draft: number, route: number[]): void {
    this.position += this.velocity;

    let grade: number = route[Math.floor(this.position)] - route[Math.max(Math.floor(this.position - 1), 0)];
    let raceProgress = this.position / route.length; // Used with raceStrats
    
    let effort = 0.5; // CalculateEffort
    this.energyLevel -= (effort * (this.cyclistStats.threshold / 100)); // linear rn, change later
    this.energyLevel += (this.cyclistStats.recovery / 300);

    let posForce = effort / 2;

    let negForceGrav = grade * this.cyclistStats.weight / 1000;
    let negForceAir = airResistConst * Math.pow(this.velocity, 2) * (1 - draft);

    let negForceTot = negForceAir + negForceGrav;

    let magnitude = posForce - negForceTot;

    this.velocity += magnitude > 0 ? Math.min(magnitude, 1): Math.max(magnitude, -1);
  }
}

class CyclistStats {
  recovery: number; // 0 - 100
  strength: number; // 0 - 100
  threshold: number; // 0 - 100
  weight: number; // 100~ - 200~
  height: number; // 5~ - 7~
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

function createRoute(): number[] {
  let route: number[] = [0];
  const len: number = 100;
  for (let i = 1; i < len; i++) {
    route.push(Math.max(route[0] + getRandomNum(-2, 3), 0));
  }

  return route;
}


/* 
  difficulty: Average combined stats of a cyclist
*/
function createMainPeloton(cyclist: Cyclist, difficulty: number, route: number[]): CyclistGroup {
  let otherCyclists: Cyclist[] = [];
  for (let i = 0; i < 39; i++) {
    otherCyclists.push(new Cyclist(generateRandomCyclistStats(difficulty), CyclistRacingStrategy[getRandomNum(0, 5)]))
  }
  otherCyclists.splice(getRandomNum(0, 40), 0, cyclist);
  
  let cyclistGroup = new CyclistGroup(8, route, 5);
  for (let i = 0; i < otherCyclists.length; i++) {
    cyclistGroup.addCyclistToBack(otherCyclists[i]);
  }
  return cyclistGroup;
}

async function simulateRace(mainPeloton: CyclistGroup) {
  let raceHasFinished = false;

  while (!raceHasFinished) {

    mainPeloton.simulateTick();

  }
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
    let route = createRoute();
    await simulateRace(createMainPeloton(cyclistObj, 90, route));
  } catch (err) {

  }
  
}