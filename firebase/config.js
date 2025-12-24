// SDK FUNCTIONS
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDHrvaQ7oliyyCIVTj4Xq8coTAEGUszUh8",
  authDomain: "blockchainlms-b863c.firebaseapp.com",
  projectId: "blockchainlms-b863c",
  storageBucket: "blockchainlms-b863c.firebasestorage.app",
  messagingSenderId: "449567805774",
  appId: "1:449567805774:web:dd3d0d3401fa073299ce1f",
  measurementId: "G-2SW7PCERGC"
};

// Initialize Firebase app
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the initialized services
export { app, auth, db, storage };