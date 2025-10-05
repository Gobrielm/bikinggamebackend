// Import the functions you need from the SDKs you need
var admin = require("firebase-admin");
import { getFirestore } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node'


var serviceAccount = require("../keys.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore('default');

async function getUserData() {
  
  const docRef = db.collection("users").doc("qeye2EV8TfUL75h96tQy");
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
  // try {
  //   const data = await postUserData();
  //   res.status(200).json({
  //     message: `Hello ${JSON.stringify(data)}!`,
  //   });
  // } catch (err) {
  //   console.error("Error fetching data:", err);
  //   res.status(500).json({ error: "Internal Server Error" });
  // }
  
  
  
  try {
    let msg: String = "";
    const data = await getAllDocs();

    for (const val of data) {
      const obj = (await val.get());
      msg += JSON.stringify(obj.id) + ': ' + JSON.stringify(obj.get('points')) + ', ';
    }
    res.status(200).json({
      message: `Hello ${msg}!`,
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }


  // try {
  //   const data = await getUserData();
  //   res.status(200).json({
  //     message: `Hello ${JSON.stringify(data)}!`,
  //   });
  // } catch (err) {
  //   console.error("Error fetching data:", err);
  //   res.status(500).json({ error: "Internal Server Error" });
  // }
}