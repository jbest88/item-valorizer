
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

    // For debugging, log all environment variables (without values)
    console.log("Available environment variables:", Object.keys(Deno.env.toObject()));

    // Create mock data since we're having issues with the Google Vision API
    const mockResponse = {
      image: null, // Will be set later with public URL
      itemName: "Antique Chair",
      confidence: 0.92,
      prices: [
        { price: 299.99, source: "eBay", url: "https://example.com/ebay" },
        { price: 275.00, source: "Etsy", url: "https://example.com/etsy" },
        { price: 325.00, source: "Facebook Marketplace", url: "https://example.com/facebook" }
      ]
    };

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get public URL for the image
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('item-images')
      .getPublicUrl(imagePath);

    // Set the image URL in the response
    mockResponse.image = publicUrl;

    console.log("Analysis complete. Returning mock data for now.");

    return new Response(
      JSON.stringify(mockResponse),
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
