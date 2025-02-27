
import { useState } from 'react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ResultsCard } from '@/components/ResultsCard';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [results, setResults] = useState<any>(null);

  const handleImageUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('item-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(filePath);

      // Call our Edge Function to analyze the image
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://dhsmmzgkbjedmfhrvsdw.supabase.co'}/functions/v1/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoc21temdrYmplZG1maHJ2c2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMzY3MzEsImV4cCI6MjA1NTgxMjczMX0.BADNdzTgicsIVfftq5wS_a360HsyK8gI36GWf7aKPok'}`,
        },
        body: JSON.stringify({ imagePath: filePath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const analysisResult = await response.json();

      // Store the analysis result in the database
      const { error: dbError } = await supabase
        .from('item_analyses')
        .insert([
          {
            image_path: filePath,
            item_name: analysisResult.itemName,
            confidence: analysisResult.confidence,
            prices: analysisResult.prices,
            status: 'completed'
          }
        ]);

      if (dbError) {
        throw dbError;
      }

      setResults(analysisResult);
      
      toast({
        title: "Analysis Complete",
        description: "Your item has been successfully analyzed",
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Error",
        description: "Failed to process the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Item Valorizer</h1>
          <p className="text-lg text-muted-foreground">
            Upload an image of your item to get an instant AI-powered valuation
          </p>
        </div>
        
        <ImageDropzone onImageUpload={handleImageUpload} />
        
        {(isProcessing || results) && (
          <ResultsCard
            isLoading={isProcessing}
            image={results?.image}
            itemName={results?.itemName}
            confidence={results?.confidence}
            prices={results?.prices}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
