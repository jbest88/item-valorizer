
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
    setResults(null);
    
    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      toast({
        title: "Upload Started",
        description: "Uploading your image...",
      });

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload error: ${uploadError.message}`);
      }

      toast({
        title: "Upload Complete",
        description: "Analyzing your item...",
      });

      // Call our Edge Function to analyze the image
      console.log("Calling analyze-image function with path:", filePath);
      const { data: analysisResult, error: functionError } = await supabase.functions
        .invoke('analyze-image', {
          body: { imagePath: filePath },
        });

      console.log("Function response:", analysisResult);
      
      if (functionError) {
        console.error("Function error:", functionError);
        throw new Error(`Analysis error: ${functionError.message || 'Failed to analyze image'}`);
      }

      if (!analysisResult) {
        throw new Error('No analysis result returned');
      }

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
        console.error("Database error:", dbError);
        // Continue even if DB storage fails, as we can still show results
        toast({
          title: "Warning",
          description: "Results displayed but not saved to database",
          variant: "destructive",
        });
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
        description: error instanceof Error ? error.message : "Failed to process the image. Please try again.",
        variant: "destructive",
      });
      setResults(null);
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
