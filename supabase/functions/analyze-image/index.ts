
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { imagePath } = await req.json();

    if (!imagePath) {
      return new Response(
        JSON.stringify({ error: 'Image path is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log("Processing image:", imagePath);

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the image from Storage
    const { data: imageData, error: storageError } = await supabaseAdmin.storage
      .from('item-images')
      .download(imagePath);

    if (storageError || !imageData) {
      console.error("Storage error:", storageError);
      return new Response(
        JSON.stringify({ error: 'Failed to download image', details: storageError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Convert image to base64
    const buffer = await imageData.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    const base64Image = btoa(
      Array.from(uint8Array)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );

    // Call Google Vision API to analyze the image
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY') ?? '';
    if (!apiKey) {
      console.error("Google Vision API key not found");
      return new Response(
        JSON.stringify({ error: 'Google Vision API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log("Calling Google Vision API");
    const visionApiResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 5,
                },
                {
                  type: 'OBJECT_LOCALIZATION',
                  maxResults: 5,
                },
              ],
            },
          ],
        }),
      }
    );

    const visionData = await visionApiResponse.json();

    if (!visionData || visionData.error) {
      console.error("Vision API error:", visionData?.error);
      return new Response(
        JSON.stringify({ error: 'Google Vision API error', details: visionData?.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Extract item information from Vision API response
    let itemName = "Unknown Item";
    let confidence = 0;

    // Try to get the most relevant object
    if (visionData.responses?.[0]?.localizedObjectAnnotations?.length > 0) {
      const topObject = visionData.responses[0].localizedObjectAnnotations[0];
      itemName = topObject.name;
      confidence = topObject.score;
    } 
    // Fall back to labels if no objects detected
    else if (visionData.responses?.[0]?.labelAnnotations?.length > 0) {
      const topLabel = visionData.responses[0].labelAnnotations[0];
      itemName = topLabel.description;
      confidence = topLabel.score;
    }

    console.log("Item identified:", itemName, "with confidence:", confidence);

    // Generate mock prices data for demonstration
    const mockMarketplaces = ["eBay", "Etsy", "Amazon", "Facebook Marketplace"];
    const priceData = Array.from({ length: 3 }, (_, i) => ({
      price: Math.floor(Math.random() * 500) + 50, // Random price between $50 and $550
      source: mockMarketplaces[Math.floor(Math.random() * mockMarketplaces.length)],
      url: `https://example.com/item/${i}`,
    }));

    // Get public URL for the image
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('item-images')
      .getPublicUrl(imagePath);

    // Prepare analysis result
    const analysisResult = {
      image: publicUrl,
      itemName: itemName,
      confidence: confidence,
      prices: priceData,
    };

    console.log("Analysis complete:", analysisResult);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Error in analyze-image function:", error);
    
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
