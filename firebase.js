import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA93VU80fldOc4Ugr_DguD7mehYqY3JrVE",
  authDomain: "shop-3e639.firebaseapp.com",
  projectId: "shop-3e639",
  storageBucket: "shop-3e639.firebasestorage.app",
  messagingSenderId: "739690076453",
  appId: "1:739690076453:web:786b0b93dc5143f31f62cc",
  measurementId: "G-X7JSQMBLN8"
};

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

const db = getFirestore(app);

const auth = getAuth(app);

const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();

async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(
      auth,
      googleProvider
    );

    return result.user;

  } catch (error) {

    console.error(
      "Google Login Error",
      error
    );

    throw error;
  }
}

async function logoutUser() {
  try {

    await signOut(auth);

  } catch (error) {

    console.error(
      "Logout Error",
      error
    );

    throw error;
  }
}

function authListener(callback) {

  onAuthStateChanged(
    auth,
    (user) => {
      callback(user);
    }
  );

}

export {
  app,
  analytics,
  db,
  auth,
  storage,
  googleProvider,
  loginWithGoogle,
  logoutUser,
  authListener
};