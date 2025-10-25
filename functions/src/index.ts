// functions/src/index.ts

import functions from "firebase-functions";
// --- THIS IS THE FIX ---
// Before: import * as cors from "cors";
// After:
import cors from "cors";
// -----------------------
import { v2 as cloudinary } from "cloudinary";

// The rest of the code now works as intended
const corsHandler = cors({ origin: true });

// Configure Cloudinary with your environment variables
cloudinary.config({
  cloud_name: functions.config().cloudinary.cloud_name,
  api_key: functions.config().cloudinary.api_key,
  api_secret: functions.config().cloudinary.api_secret,
});

export const getCloudinarySignature = functions.https.onRequest(
  (request, response) => {
    corsHandler(request, response, () => {
      const timestamp = Math.round(new Date().getTime() / 1000);

      // Get the params to sign from the request body
      const paramsToSign = request.body.params_to_sign;
      if (!paramsToSign) {
        response.status(400).send("Missing params_to_sign");
        return;
      }

      try {
        const signature = cloudinary.utils.api_sign_request(
          paramsToSign,
          functions.config().cloudinary.api_secret
        );
        response.status(200).json({ timestamp, signature });
      } catch (error) {
        console.error("Error signing request: ", error);
        response.status(500).send("Error signing request");
      }
    });
  }
);