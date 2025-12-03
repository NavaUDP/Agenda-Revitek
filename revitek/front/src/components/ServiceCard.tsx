import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ServiceCardProps {
  title: string;
  description: string;
  features: string[];
  image: string;
  link?: string;
}

import { Link } from "react-router-dom";

const ServiceCard = ({ title, description, features, image, link }: ServiceCardProps) => {
  return (
    <Card className="group hover:shadow-xl transition-all duration-500 hover:scale-105 bg-card border-border overflow-hidden h-full flex flex-col">
      <div className="relative overflow-hidden h-64 shrink-0">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground line-clamp-3">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 flex-grow flex flex-col justify-end">
        {features && features.length > 0 && (
          <div className="space-y-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{feature}</p>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 mt-auto">
          <p className="text-sm font-semibold text-primary mb-4">
            (IVA Y COSTOS INCLUIDOS)
          </p>

          {link && (
            <Button
              asChild
              variant="default"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {link.startsWith('http') ? (
                <a href={link} target="_blank" rel="noopener noreferrer">Más Información</a>
              ) : (
                <Link to={link}>Agendar Ahora</Link>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;