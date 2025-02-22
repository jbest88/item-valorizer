
import { useState } from 'react';
import { ImageDropzone } from '@/components/ImageDropzone';
import { ResultsCard } from '@/components/ResultsCard';
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [results, setResults] = useState<any>(null);

  const handleImageUpload = async (file: File) => {
    setIsProcessing(true);
    // This is a placeholder for the actual implementation
    // In reality, you would:
    // 1. Upload the image to Supabase storage
    // 2. Call the Vision API to identify the item
    // 3. Scrape pricing data
    // 4. Update the UI with results
    
    // Simulate processing delay
    setTimeout(() => {
      setResults({
        image: URL.createObjectURL(file),
        itemName: "Sample Item",
        confidence: 0.95,
        prices: [
          { price: 99.99, source: "eBay", url: "#" },
          { price: 89.99, source: "Kijiji", url: "#" },
          { price: 109.99, source: "Collector's DB", url: "#" },
        ],
      });
      setIsProcessing(false);
      
      toast({
        title: "Analysis Complete",
        description: "Your item has been successfully analyzed",
      });
    }, 2000);
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
