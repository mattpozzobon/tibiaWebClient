import { initializeApp }     from "firebase/app";
import { getAuth }           from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyAhLwsTXTQFF_nvYLs15R3TJH6AChIxN9E",
  authDomain:        "emperia-online.firebaseapp.com",
  projectId:         "emperia-online",
  storageBucket:     "emperia-online.appspot.com",
  messagingSenderId: "28744750453",
  appId:             "1:28744750453:web:YOUR_APP_ID", 
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
