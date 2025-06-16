import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC2dSFMvVFvnC7yhnpgFgoNXUHFC2yvH6s",
  authDomain: "stockwatch-ms4ih.firebaseapp.com",
  projectId: "stockwatch-ms4ih",
  storageBucket: "stockwatch-ms4ih.firebasestorage.app",
  messagingSenderId: "105097500434",
  appId: "1:105097500434:web:0b80242e4068c5d9bc05cb"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export default app;
