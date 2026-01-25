
export interface CompanyData {
  name: string;
  industry: string;
  description: string;
  promoters: string[];
  gstNumber: string;
  products: string[];
  customers: string[];
  keyFinancials?: string;
  marketPosition?: string;
  sources: { title: string; uri: string }[];
}

export interface SearchState {
  loading: boolean;
  error: string | null;
  data: CompanyData | null;
}
