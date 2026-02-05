export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description_bn: string | null
          hero_rank: number
          id: string
          image_url: string | null
          is_active: boolean
          name_bn: string
          parent_id: string | null
          seo_description_bn: string | null
          seo_title_bn: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_bn?: string | null
          hero_rank?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_bn: string
          parent_id?: string | null
          seo_description_bn?: string | null
          seo_title_bn?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_bn?: string | null
          hero_rank?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_bn?: string
          parent_id?: string | null
          seo_description_bn?: string | null
          seo_title_bn?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_flat_bdt: number
          end_at: string | null
          id: string
          is_active: boolean
          min_order_bdt: number
          start_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_flat_bdt?: number
          end_at?: string | null
          id?: string
          is_active?: boolean
          min_order_bdt?: number
          start_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_flat_bdt?: number
          end_at?: string | null
          id?: string
          is_active?: boolean
          min_order_bdt?: number
          start_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          id: string
          is_blocked: boolean
          name: string | null
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_blocked?: boolean
          name?: string | null
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_blocked?: boolean
          name?: string | null
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_coupon_popup: {
        Row: {
          body_bn: string | null
          created_at: string
          id: string
          image_path: string | null
          image_url: string | null
          is_active: boolean
          link_url: string | null
          title_bn: string | null
          updated_at: string
        }
        Insert: {
          body_bn?: string | null
          created_at?: string
          id: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          title_bn?: string | null
          updated_at?: string
        }
        Update: {
          body_bn?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          title_bn?: string | null
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
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_address_bn: string
          delivery_fee_bdt: number
          delivery_partner_name: string | null
          delivery_partner_phone: string | null
          delivery_status: string
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
          coupon_code?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          delivery_address_bn: string
          delivery_fee_bdt?: number
          delivery_partner_name?: string | null
          delivery_partner_phone?: string | null
          delivery_status?: string
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
          coupon_code?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivery_address_bn?: string
          delivery_fee_bdt?: number
          delivery_partner_name?: string | null
          delivery_partner_phone?: string | null
          delivery_status?: string
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
          },
        ]
      }
      product_variants: {
        Row: {
          color_bn: string | null
          color_hex: string | null
          created_at: string
          id: string
          image_url: string | null
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
          color_hex?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
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
          color_hex?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
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
          },
        ]
      }
      products: {
        Row: {
          care_instructions_bn: string | null
          category_id: string
          compare_at_price_bdt: number | null
          created_at: string
          delivery_info_bn: string | null
          delivery_notes_bn: string | null
          description_bn: string | null
          discount_price_bdt: number | null
          id: string
          is_active: boolean
          is_bestseller: boolean
          is_new_arrival: boolean
          price_bdt: number
          return_policy_bn: string | null
          sku: string | null
          slug: string
          status: string
          stock_qty: number
          title_bn: string
          updated_at: string
        }
        Insert: {
          care_instructions_bn?: string | null
          category_id: string
          compare_at_price_bdt?: number | null
          created_at?: string
          delivery_info_bn?: string | null
          delivery_notes_bn?: string | null
          description_bn?: string | null
          discount_price_bdt?: number | null
          id?: string
          is_active?: boolean
          is_bestseller?: boolean
          is_new_arrival?: boolean
          price_bdt: number
          return_policy_bn?: string | null
          sku?: string | null
          slug: string
          status?: string
          stock_qty?: number
          title_bn: string
          updated_at?: string
        }
        Update: {
          care_instructions_bn?: string | null
          category_id?: string
          compare_at_price_bdt?: number | null
          created_at?: string
          delivery_info_bn?: string | null
          delivery_notes_bn?: string | null
          description_bn?: string | null
          discount_price_bdt?: number | null
          id?: string
          is_active?: boolean
          is_bestseller?: boolean
          is_new_arrival?: boolean
          price_bdt?: number
          return_policy_bn?: string | null
          sku?: string | null
          slug?: string
          status?: string
          stock_qty?: number
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
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      peek_coupon_discount: {
        Args: { _code: string; _subtotal_bdt: number }
        Returns: {
          code: string
          discount_bdt: number
          message: string
          ok: boolean
        }[]
      }
      redeem_coupon_discount: {
        Args: { _code: string; _subtotal_bdt: number }
        Returns: {
          code: string
          discount_bdt: number
          message: string
          ok: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      order_status:
        | "confirmed"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      order_status: [
        "confirmed",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
