# SNIPER A.I. - Firebase Deployment

This project has been configured for easy deployment to Firebase Hosting and Cloud Functions.

## Prerequisites

1.  **Node.js**: Ensure you have Node.js installed (version 20 or higher is recommended).
2.  **Firebase Account**: You need a Firebase account and a new project created on the [Firebase Console](https://console.firebase.google.com/).
3.  **Firebase CLI**: Install the Firebase command-line tools globally:
    ```bash
    npm install -g firebase-tools
    ```

## Deployment Steps

### 1. Login to Firebase

Log in to your Google account using the CLI:
```bash
firebase login
```

### 2. Configure Project ID

Open the `.firebaserc` file in the project root. Replace `"your-firebase-project-id"` with the actual Project ID from your Firebase project settings.

```json
{
  "projects": {
    "default": "sniper-ai-prod" // <-- Change this value
  }
}
```

### 3. Install Dependencies for Cloud Functions

The backend API proxies now live in the `functions` directory. You need to install their dependencies.

Navigate to the functions directory and install the packages:
```bash
cd functions
npm install
cd ..
```

### 4. Deploy to Firebase

From the **root directory** of the project, run the deploy command:

```bash
firebase deploy
```

This single command will:
1.  Deploy the Cloud Functions from the `functions` directory.
2.  Deploy all the frontend files (`index.html`, `App.tsx`, etc.) to Firebase Hosting.
3.  Apply the hosting rules from `firebase.json` to correctly route traffic.

Your site will be live at the hosting URL provided by the CLI upon completion!

---

**Note on the `api/` directory:** The original `api/` directory is structured for Vercel-style deployments. All of its logic has been migrated to the new `functions/` directory to work with Firebase. The old `api/` directory is no longer used and can be safely deleted.