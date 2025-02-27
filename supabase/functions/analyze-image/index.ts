
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imagePath } = await req.json();
    
    if (!imagePath) {
      return new Response(
        JSON.stringify({ error: 'No image path provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const visionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the image from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('item-images')
      .download(imagePath);

    if (fileError) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve image', details: fileError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Convert file to base64
    const fileArrayBuffer = await fileData.arrayBuffer();
    const fileBase64 = btoa(
      String.fromCharCode(...new Uint8Array(fileArrayBuffer))
    );

    // Create Google Vision API request
    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;
    const visionRequest = {
      requests: [
        {
          image: {
            content: fileBase64,
          },
          features: [
            {
              type: "LABEL_DETECTION",
              maxResults: 5,
            },
            {
              type: "WEB_DETECTION",
              maxResults: 5,
            }
          ],
        },
      ],
    };

    // Call Google Vision API
    const visionResponse = await fetch(visionApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(visionRequest),
    });

    const visionData = await visionResponse.json();

    if (!visionResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Vision API error', details: visionData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Process Vision API results
    const labels = visionData.responses[0]?.labelAnnotations || [];
    const webDetection = visionData.responses[0]?.webDetection || {};
    
    // Get the most likely item name from labels
    const itemName = labels.length > 0 ? labels[0].description : "Unknown Item";
    const confidence = labels.length > 0 ? labels[0].score : 0;
    
    // Get price estimates from web entities and pages
    const priceData = [];
    
    // Try to extract prices from web detection
    const webEntities = webDetection.webEntities || [];
    const pagesWithMatchingImages = webDetection.pagesWithMatchingImages || [];
    
    // Simulate price scraping - in a real implementation, you would
    // do more sophisticated scraping or use another API
    const sources = ["eBay", "Kijiji", "Collector's DB"];
    
    // Generate some semi-realistic prices based on the confidence
    // In a real implementation, you would scrape actual prices
    const basePrice = 50 + (confidence * 100);
    
    for (let i = 0; i < 3 && i < pagesWithMatchingImages.length; i++) {
      const page = pagesWithMatchingImages[i];
      // Generate a realistic price variation
      const priceVariation = (Math.random() * 0.4) - 0.2; // -20% to +20%
      const price = basePrice * (1 + priceVariation);
      
      priceData.push({
        price: parseFloat(price.toFixed(2)),
        source: sources[i] || page.pageTitle || "Unknown Source",
        url: page.url || "#"
      });
    }
    
    // Fill with mock data if we don't have enough real data
    while (priceData.length < 3) {
      const priceVariation = (Math.random() * 0.4) - 0.2;
      const price = basePrice * (1 + priceVariation);
      
      priceData.push({
        price: parseFloat(price.toFixed(2)),
        source: sources[priceData.length] || "Similar Items",
        url: "#"
      });
    }

    // Create analysis result
    const analysisResult = {
      image: supabase.storage.from('item-images').getPublicUrl(imagePath).data.publicUrl,
      itemName: itemName,
      confidence: confidence,
      prices: priceData,
    };

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
