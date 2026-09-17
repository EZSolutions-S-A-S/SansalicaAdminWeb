export type OperationType = 'Venta' | 'Alquiler';

export type PropertyType = 'Casa' | 'Apartamento' | 'Local Comercial' | 'Terreno' | 'Finca';

export type InmuebleStatus = 'Disponible' | 'Reservado' | 'Vendido';

export type Departamento =
  | 'Amazonas'
  | 'Antioquia'
  | 'Arauca'
  | 'Atlántico'
  | 'Bogotá D.C.'
  | 'Bolívar'
  | 'Boyacá'
  | 'Caldas'
  | 'Caquetá'
  | 'Casanare'
  | 'Cauca'
  | 'Cesar'
  | 'Chocó'
  | 'Cundinamarca'
  | 'Córdoba'
  | 'Guainía'
  | 'Guaviare'
  | 'Huila'
  | 'La Guajira'
  | 'Magdalena'
  | 'Meta'
  | 'Nariño'
  | 'Norte de Santander'
  | 'Putumayo'
  | 'Quindío'
  | 'Risaralda'
  | 'San Andrés y Providencia'
  | 'Santander'
  | 'Sucre'
  | 'Tolima'
  | 'Valle del Cauca'
  | 'Vaupés'
  | 'Vichada';

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
  departamento: Departamento | null;
  ciudad: string | null;
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
  departamento?: Departamento | null;
  ciudad?: string | null;
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
  departamento?: Departamento;
  ciudad?: string;
  search?: string;
  ordering?: 'price' | '-price' | 'square_meters' | '-square_meters' | 'created_at' | '-created_at';
}
