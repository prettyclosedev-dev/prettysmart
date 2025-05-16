// Import the functions you need from the SDKs you need
const  { initializeApp } =  require("firebase/app");
const  { getAnalytics } =  require("firebase/analytics");
const { getAuth } = require("firebase/auth");
const config = require("./config.json");

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = config.firebaseConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

// auth.js
const admin = require("firebase-admin");

const serviceAccount = config.firebaseServiceAccountKey; 
// ← downloaded from your Firebase console’s Service Accounts tab

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = { firebaseConfig, auth, admin };
