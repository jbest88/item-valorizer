import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Helper function to convert an ArrayBuffer to a Base64-encoded string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { imagePath } = await req.json();
    if (!imagePath) {
      return new Response(
        JSON.stringify({ error: "Image path is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    console.log("Processing image:", imagePath);

    // Create Supabase admin client using service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    console.log("Using SUPABASE_URL:", supabaseUrl);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the public URL for the image from Supabase Storage
    const { data, error: urlError } = supabaseAdmin.storage
      .from("item-images")
      .getPublicUrl(imagePath);

    if (urlError) {
      console.error("Error getting public URL:", urlError);
      return new Response(
        JSON.stringify({ error: "Error retrieving public URL", details: urlError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const publicUrl = data?.publicUrl;
    console.log("Public URL:", publicUrl);

    if (!publicUrl) {
      return new Response(
        JSON.stringify({ error: "Unable to retrieve public URL for the image" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Fetch the image data using the public URL
    const imageResponse = await fetch(publicUrl);
    console.log("Image fetch status:", imageResponse.status);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Unable to fetch image data" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = arrayBufferToBase64(arrayBuffer);
    console.log("Converted image to Base64, length:", base64Image.length);

    // Retrieve the Google Vision API key from secrets
    const googleApiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing Google API key" }),
        { status: 500 }
      );
    }
    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`;
    console.log("Calling Vision API at:", visionApiUrl);

    // Build the request payload for the Vision API
    const visionRequestBody = {
      requests: [
        {
          image: { content: base64Image },
          features: [{ type: "LABEL_DETECTION", maxResults: 10 }],
        },
      ],
    };

    // Call the Google Vision API
    const visionResponse = await fetch(visionApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visionRequestBody),
    });
    console.log("Vision API HTTP status:", visionResponse.status);

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error("Vision API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Vision API error", details: errorText }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    const visionData = await visionResponse.json();
    console.log("Vision API response:", JSON.stringify(visionData));

    // Process the Vision API response to extract the first label
    const labelAnnotations = visionData.responses?.[0]?.labelAnnotations;
    let detectedItemName = "Unknown Item";
    let detectedConfidence = 0;
    if (labelAnnotations && labelAnnotations.length > 0) {
      detectedItemName = labelAnnotations[0].description || "Unknown Item";
      detectedConfidence = labelAnnotations[0].score || 0;
    }

    // (Optional) Define a pricing array here or replace with your actual logic
    const prices = [
      { price: 299.99, source: "eBay", url: "https://example.com/ebay" },
      { price: 275.0, source: "Etsy", url: "https://example.com/etsy" },
      { price: 325.0, source: "Facebook Marketplace", url: "https://example.com/facebook" },
    ];

    // Build the final analysis result using the Vision API data
    const analysisResult = {
      image: publicUrl,
      itemName: detectedItemName,
      confidence: detectedConfidence,
      prices,
    };

    console.log("Analysi
