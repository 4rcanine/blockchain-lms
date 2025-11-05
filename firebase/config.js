// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration from the Firebase Console
const firebaseConfig = {
  apiKey: "",
  authDomain: "blockchainlms-b863c.firebaseapp.com",
  projectId: "blockchainlms-b863c",
  storageBucket: "blockchainlms-b863c.firebasestorage.app",
  messagingSenderId: "449567805774",
  appId: "1:449567805774:web:dd3d0d3401fa073299ce1f",
  measurementId: "G-2SW7PCERGC"
};

// Initialize Firebase for Server-Side Rendering (SSR), prevents re-initialization
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]; // Use the existing app if already initialized
}

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the services for use in other parts of the app
export { app, auth, db, storage };