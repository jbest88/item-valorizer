
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Price {
  price: number;
  source: string;
  url: string;
}

interface ResultsProps {
  image?: string;
  itemName?: string;
  confidence?: number;
  prices?: Price[];
  isLoading?: boolean;
}

export const ResultsCard = ({
  image,
  itemName,
  confidence,
  prices,
  isLoading = false,
}: ResultsProps) => {
  if (isLoading) {
    return (
      <Card className="w-full animate-fade-up">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center justify-between">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-16" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!image && !itemName) return null;

  const averagePrice =
    prices && prices.length > 0
      ? prices.reduce((sum, p) => sum + p.price, 0) / prices.length
      : null;

  return (
    <Card className="w-full overflow-hidden animate-fade-up">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl font-medium">{itemName}</span>
          {confidence && (
            <Badge variant="secondary" className="text-sm">
              {(confidence * 100).toFixed(1)}% confidence
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {image && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <img
              src={image}
              alt={itemName}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        {averagePrice !== null && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Estimated Value</h3>
            <p className="text-3xl font-bold text-primary">
              ${averagePrice.toFixed(2)}
            </p>
          </div>
        )}
        {prices && prices.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Price References</h3>
            <div className="space-y-2">
              {prices.map((price, index) => (
                <a
                  key={index}
                  href={price.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="text-sm text-muted-foreground">
                    {price.source}
                  </span>
                  <span className="font-medium">${price.price.toFixed(2)}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
