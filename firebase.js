// ======================================
// FIREBASE CONFIG
// ======================================

const firebaseConfig = {
  apiKey: "AIzaSyA93VU80fldOc4Ugr_DguD7mehYqY3JrVE",
  authDomain: "shop-3e639.firebaseapp.com",
  projectId: "shop-3e639",
  storageBucket: "shop-3e639.firebasestorage.app",
  messagingSenderId: "739690076453",
  appId: "1:739690076453:web:786b0b93dc5143f31f62cc",
  measurementId: "G-X7JSQMBLN8"
};

// ======================================
// INITIALIZE FIREBASE
// ======================================

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// ======================================
// FIRESTORE OFFLINE SUPPORT
// ======================================

db.enablePersistence({
  synchronizeTabs: true
})
.catch((err) => {

  if (err.code === "failed-precondition") {

    console.warn(
      "Multiple tabs open. Persistence disabled."
    );

  } else if (
    err.code === "unimplemented"
  ) {

    console.warn(
      "Browser does not support persistence."
    );

  }

});

// ======================================
// AUTHENTICATION
// ======================================

async function firebaseLogin() {

  try {

    const currentUser = auth.currentUser;

    if (currentUser) {

      console.log(
        "Already Logged In"
      );

      return currentUser;

    }

    const result =
      await auth.signInAnonymously();

    console.log(
      "Anonymous Login Success"
    );

    return result.user;

  } catch (error) {

    console.error(
      "Auth Error:",
      error
    );

    throw error;

  }

}

// ======================================
// CONNECTION CHECK
// ======================================

async function checkFirebaseConnection() {

  try {

    await db
      .collection("_system")
      .doc("connection")
      .set({
        timestamp:
          new Date().toISOString()
      });

    console.log(
      "Firestore Connected"
    );

    return true;

  } catch (error) {

    console.error(
      "Firestore Error:",
      error
    );

    return false;

  }

}

// ======================================
// LOADER HELPERS
// ======================================

function showLoader() {

  const loader =
    document.getElementById(
      "loader"
    );

  if (loader) {

    loader.classList.remove(
      "hidden"
    );

  }

}

function hideLoader() {

  const loader =
    document.getElementById(
      "loader"
    );

  if (loader) {

    loader.classList.add(
      "hidden"
    );

  }

}

// ======================================
// DATABASE HELPERS
// ======================================

async function addWorker(data) {

  try {

    showLoader();

    const ref =
      await db
        .collection("workers")
        .add(data);

    hideLoader();

    return ref.id;

  } catch (error) {

    hideLoader();

    console.error(error);

    throw error;

  }

}

async function updateWorker(
  workerId,
  data
) {

  try {

    showLoader();

    await db
      .collection("workers")
      .doc(workerId)
      .update(data);

    hideLoader();

  } catch (error) {

    hideLoader();

    console.error(error);

    throw error;

  }

}

async function deleteWorker(
  workerId
) {

  try {

    showLoader();

    await db
      .collection("workers")
      .doc(workerId)
      .delete();

    hideLoader();

  } catch (error) {

    hideLoader();

    console.error(error);

    throw error;

  }

}

// ======================================
// ADVANCES
// ======================================

async function addAdvance(
  data
) {

  try {

    showLoader();

    const ref =
      await db
        .collection("advances")
        .add(data);

    hideLoader();

    return ref.id;

  } catch (error) {

    hideLoader();

    console.error(error);

    throw error;

  }

}

async function deleteAdvance(
  advanceId
) {

  try {

    showLoader();

    await db
      .collection("advances")
      .doc(advanceId)
      .delete();

    hideLoader();

  } catch (error) {

    hideLoader();

    console.error(error);

    throw error;

  }

}

// ======================================
// ATTENDANCE
// ======================================

async function saveAttendance(
  data
) {

  try {

    showLoader();

    const ref =
      await db
        .collection("attendance")
        .add(data);

    hideLoader();

    return ref.id;

  } catch (error) {

    hideLoader();

    console.error(error);

    throw error;

  }

}

// ======================================
// SETTINGS
// ======================================

async function saveSettings(
  settings
) {

  try {

    await db
      .collection("settings")
      .doc("app")
      .set(settings);

  } catch (error) {

    console.error(error);

    throw error;

  }

}

// ======================================
// STARTUP CHECK
// ======================================

window.addEventListener(
  "load",
  async () => {

    try {

      await firebaseLogin();

      const ok =
        await checkFirebaseConnection();

      if (ok) {

        console.log(
          "Firebase Ready"
        );

      }

    } catch (error) {

      console.error(error);

      alert(
        "Firebase Connection Failed"
      );

    }

  }
);