export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description_bn: string | null
          hero_rank: number
          id: string
          is_active: boolean
          name_bn: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_bn?: string | null
          hero_rank?: number
          id?: string
          is_active?: boolean
          name_bn: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_bn?: string | null
          hero_rank?: number
          id?: string
          is_active?: boolean
          name_bn?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color_bn: string | null
          created_at: string
          id: string
          line_total_bdt: number
          order_id: string
          product_id: string
          qty: number
          size_bn: string | null
          title_bn: string
          unit_price_bdt: number
          variant_id: string | null
        }
        Insert: {
          color_bn?: string | null
          created_at?: string
          id?: string
          line_total_bdt: number
          order_id: string
          product_id: string
          qty: number
          size_bn?: string | null
          title_bn: string
          unit_price_bdt: number
          variant_id?: string | null
        }
        Update: {
          color_bn?: string | null
          created_at?: string
          id?: string
          line_total_bdt?: number
          order_id?: string
          product_id?: string
          qty?: number
          size_bn?: string | null
          title_bn?: string
          unit_price_bdt?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_address_bn: string
          delivery_fee_bdt: number
          discount_bdt: number
          id: string
          notes_bn: string | null
          payment_method: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_bdt: number
          total_bdt: number
          tracking_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          delivery_address_bn: string
          delivery_fee_bdt?: number
          discount_bdt?: number
          id?: string
          notes_bn?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_bdt?: number
          total_bdt?: number
          tracking_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivery_address_bn?: string
          delivery_fee_bdt?: number
          discount_bdt?: number
          id?: string
          notes_bn?: string | null
          payment_method?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_bdt?: number
          total_bdt?: number
          tracking_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_bn: string | null
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          alt_bn?: string | null
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          alt_bn?: string | null
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_variants: {
        Row: {
          color_bn: string | null
          created_at: string
          id: string
          is_active: boolean
          price_bdt: number | null
          product_id: string
          size_bn: string | null
          sku: string | null
          stock_qty: number
          updated_at: string
        }
        Insert: {
          color_bn?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_bdt?: number | null
          product_id: string
          size_bn?: string | null
          sku?: string | null
          stock_qty?: number
          updated_at?: string
        }
        Update: {
          color_bn?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          price_bdt?: number | null
          product_id?: string
          size_bn?: string | null
          sku?: string | null
          stock_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          category_id: string
          compare_at_price_bdt: number | null
          created_at: string
          delivery_info_bn: string | null
          description_bn: string | null
          discount_price_bdt: number | null
          id: string
          is_active: boolean
          is_bestseller: boolean
          is_new_arrival: boolean
          price_bdt: number
          return_policy_bn: string | null
          slug: string
          title_bn: string
          updated_at: string
        }
        Insert: {
          category_id: string
          compare_at_price_bdt?: number | null
          created_at?: string
          delivery_info_bn?: string | null
          description_bn?: string | null
          discount_price_bdt?: number | null
          id?: string
          is_active?: boolean
          is_bestseller?: boolean
          is_new_arrival?: boolean
          price_bdt: number
          return_policy_bn?: string | null
          slug: string
          title_bn: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          compare_at_price_bdt?: number | null
          created_at?: string
          delivery_info_bn?: string | null
          description_bn?: string | null
          discount_price_bdt?: number | null
          id?: string
          is_active?: boolean
          is_bestseller?: boolean
          is_new_arrival?: boolean
          price_bdt?: number
          return_policy_bn?: string | null
          slug?: string
          title_bn?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status: "confirmed" | "packed" | "shipped" | "delivered" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
