import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { imagePath } = await req.json();
    if (!imagePath) {
      return new Response(
        JSON.stringify({ error: "Image path is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Processing image:", imagePath);

    // Create a Supabase admin client using your service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve the public URL for the image from Supabase Storage
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("item-images")
      .getPublicUrl(imagePath);

    if (!publicUrl) {
      return new Response(
        JSON.stringify({ error: "Unable to retrieve public URL for the image" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch the image data from the public URL
    const imageResponse = await fetch(publicUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Unable to fetch image data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    // Convert the image data to a binary string and then encode it as Base64
    const binaryString = String.fromCharCode(...new Uint8Array(arrayBuffer));
    const base64Image = btoa(binaryString);

    // Retrieve your Google Vision API key from Edge Function secrets
    const googleApiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: "Missing Google API key" }), { status: 500 });
    }
    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`;

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
    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error("Vision API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Vision API error", details: errorText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    const visionData = await visionResponse.json();

    // Process the Vision API response to extract the first label
    const labelAnnotations = visionData.responses?.[0]?.labelAnnotations;
    let detectedItemName = "Unknown Item";
    let detectedConfidence = 0;
    if (labelAnnotations && labelAnnotations.length > 0) {
      detectedItemName = labelAnnotations[0].description || "Unknown Item";
      detectedConfidence = labelAnnotations[0].score || 0;
    }

    // Define a mock pricing array (replace with real data as needed)
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

    console.log("Analysis complete. Returning Vision API data.");
    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in analyze-image function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
