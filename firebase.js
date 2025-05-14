// Import the functions you need from the SDKs you need
const  { initializeApp } =  require("firebase/app");
const  { getAnalytics } =  require("firebase/analytics");
const { getAuth } = require("firebase/auth");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDvsehRbvRe8fnFZuC8NMIcYqjesO4bIGw",
  authDomain: "prettyclose-a0ba7.firebaseapp.com",
  projectId: "prettyclose-a0ba7",
  storageBucket: "prettyclose-a0ba7.firebasestorage.app",
  messagingSenderId: "821961143937",
  appId: "1:821961143937:web:42b3c58fb59177db81bf80",
  measurementId: "G-2N2QQL5ERV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

module.exports = { firebaseConfig, auth };