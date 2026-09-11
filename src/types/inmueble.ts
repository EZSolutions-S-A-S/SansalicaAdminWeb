export type OperationType = 'Venta' | 'Alquiler';

export type PropertyType = 'Casa' | 'Apartamento' | 'Local Comercial' | 'Terreno';

export type InmuebleStatus = 'Disponible' | 'Reservado' | 'Vendido';

export interface InmueblePhoto {
  id: number;
  url: string | null;
  order: number;
}

export interface Inmueble {
  id: number;
  title: string;
  operation_type: OperationType;
  property_type: PropertyType;
  price: string;
  square_meters: string;
  location: string;
  description: string;
  floor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  features: string[];
  amenities: string[];
  photos: InmueblePhoto[];
  status: InmuebleStatus;
  featured: boolean;
  created_at: string;
}

export interface InmuebleInput {
  title: string;
  operation_type: OperationType;
  property_type: PropertyType;
  price: number;
  square_meters: number;
  location: string;
  description: string;
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spots?: number | null;
  features?: string[];
  amenities?: string[];
  status?: InmuebleStatus;
  featured?: boolean;
}

export interface InmuebleListParams {
  page?: number;
  page_size?: number;
  operation_type?: OperationType;
  property_type?: PropertyType;
  status?: InmuebleStatus;
  featured?: boolean;
  min_price?: number;
  max_price?: number;
  search?: string;
  ordering?: 'price' | '-price' | 'square_meters' | '-square_meters' | 'created_at' | '-created_at';
}
