const firebaseConfig = {
  apiKey: "AIzaSyA93VU80fldOc4Ugr_DguD7mehYqY3JrVE",
  authDomain: "shop-3e639.firebaseapp.com",
  projectId: "shop-3e639",
  storageBucket: "shop-3e639.firebasestorage.app",
  messagingSenderId: "739690076453",
  appId: "1:739690076453:web:786b0b93dc5143f31f62cc",
  measurementId: "G-X7JSQMBLN8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();