// Gerado pelo Supabase (generate_typescript_types) a partir de supabase/migrations.
// Não edite à mão: regenere depois de cada migração.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      citacoes: {
        Row: {
          created_at: string
          fonte_id: string
          id: string
          registro_id: string
          registro_tipo: string
          trecho: string | null
        }
        Insert: {
          created_at?: string
          fonte_id: string
          id?: string
          registro_id: string
          registro_tipo: string
          trecho?: string | null
        }
        Update: {
          created_at?: string
          fonte_id?: string
          id?: string
          registro_id?: string
          registro_tipo?: string
          trecho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citacoes_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes"
            referencedColumns: ["id"]
          },
        ]
      }
      conhecimento_busca: {
        Row: {
          destino_id: string | null
          embedding: string | null
          id: string
          modelo: string | null
          pais_codigo: string | null
          registro_id: string
          registro_tipo: string
          texto: string
          updated_at: string
        }
        Insert: {
          destino_id?: string | null
          embedding?: string | null
          id?: string
          modelo?: string | null
          pais_codigo?: string | null
          registro_id: string
          registro_tipo: string
          texto: string
          updated_at?: string
        }
        Update: {
          destino_id?: string | null
          embedding?: string | null
          id?: string
          modelo?: string | null
          pais_codigo?: string | null
          registro_id?: string
          registro_tipo?: string
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conhecimento_busca_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "destinos"
            referencedColumns: ["id"]
          },
        ]
      }
      destinos: {
        Row: {
          clima_por_mes: Json | null
          created_at: string
          custo_diario: Json | null
          evitar_meses: number[]
          id: string
          lat: number | null
          lng: number | null
          melhor_epoca_meses: number[]
          moeda: string | null
          nome: string
          nome_chave: string
          pai_id: string | null
          pais_codigo: string
          resumo: string | null
          status: string
          tipo: string
          updated_at: string
          visto: string | null
          visto_verificado_em: string | null
        }
        Insert: {
          clima_por_mes?: Json | null
          created_at?: string
          custo_diario?: Json | null
          evitar_meses?: number[]
          id?: string
          lat?: number | null
          lng?: number | null
          melhor_epoca_meses?: number[]
          moeda?: string | null
          nome: string
          nome_chave: string
          pai_id?: string | null
          pais_codigo: string
          resumo?: string | null
          status?: string
          tipo: string
          updated_at?: string
          visto?: string | null
          visto_verificado_em?: string | null
        }
        Update: {
          clima_por_mes?: Json | null
          created_at?: string
          custo_diario?: Json | null
          evitar_meses?: number[]
          id?: string
          lat?: number | null
          lng?: number | null
          melhor_epoca_meses?: number[]
          moeda?: string | null
          nome?: string
          nome_chave?: string
          pai_id?: string | null
          pais_codigo?: string
          resumo?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          visto?: string | null
          visto_verificado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destinos_pai_id_fkey"
            columns: ["pai_id"]
            isOneToOne: false
            referencedRelation: "destinos"
            referencedColumns: ["id"]
          },
        ]
      }
      dicas: {
        Row: {
          ano_ref: number | null
          categoria: string
          created_at: string
          destino_id: string
          id: string
          lugar_id: string | null
          status: string
          texto: string
          updated_at: string
        }
        Insert: {
          ano_ref?: number | null
          categoria: string
          created_at?: string
          destino_id: string
          id?: string
          lugar_id?: string | null
          status?: string
          texto: string
          updated_at?: string
        }
        Update: {
          ano_ref?: number | null
          categoria?: string
          created_at?: string
          destino_id?: string
          id?: string
          lugar_id?: string | null
          status?: string
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dicas_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "destinos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dicas_lugar_id_fkey"
            columns: ["lugar_id"]
            isOneToOne: false
            referencedRelation: "lugares"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string
          destino_id: string
          id: string
          meses: number[]
          nome: string
          nome_chave: string
          regra_data: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destino_id: string
          id?: string
          meses?: number[]
          nome: string
          nome_chave: string
          regra_data: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destino_id?: string
          id?: string
          meses?: number[]
          nome?: string
          nome_chave?: string
          regra_data?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "destinos"
            referencedColumns: ["id"]
          },
        ]
      }
      fontes: {
        Row: {
          arquivo_nome: string | null
          arquivo_path: string | null
          autoria: string
          created_at: string
          criado_por: string | null
          hash: string | null
          id: string
          mime: string | null
          texto: string | null
          tipo: string
          titulo: string
          viagem_mes: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          autoria: string
          created_at?: string
          criado_por?: string | null
          hash?: string | null
          id?: string
          mime?: string | null
          texto?: string | null
          tipo: string
          titulo: string
          viagem_mes?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          autoria?: string
          created_at?: string
          criado_por?: string | null
          hash?: string | null
          id?: string
          mime?: string | null
          texto?: string | null
          tipo?: string
          titulo?: string
          viagem_mes?: string | null
        }
        Relationships: []
      }
      ingestao_itens: {
        Row: {
          avisos: string[]
          created_at: string
          dados: Json
          decisao: string
          id: string
          ingestao_id: string
          ordem: number
          registro_id: string | null
          revisado_em: string | null
          revisado_por: string | null
          tipo: string
        }
        Insert: {
          avisos?: string[]
          created_at?: string
          dados: Json
          decisao?: string
          id?: string
          ingestao_id: string
          ordem: number
          registro_id?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          tipo: string
        }
        Update: {
          avisos?: string[]
          created_at?: string
          dados?: Json
          decisao?: string
          id?: string
          ingestao_id?: string
          ordem?: number
          registro_id?: string | null
          revisado_em?: string | null
          revisado_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestao_itens_ingestao_id_fkey"
            columns: ["ingestao_id"]
            isOneToOne: false
            referencedRelation: "ingestoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestoes: {
        Row: {
          created_at: string
          criado_por: string | null
          erro: string | null
          fonte_id: string
          id: string
          input_tokens: number | null
          modelo: string | null
          output_tokens: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          erro?: string | null
          fonte_id: string
          id?: string
          input_tokens?: number | null
          modelo?: string | null
          output_tokens?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          erro?: string | null
          fonte_id?: string
          id?: string
          input_tokens?: number | null
          modelo?: string | null
          output_tokens?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestoes_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes"
            referencedColumns: ["id"]
          },
        ]
      }
      lugares: {
        Row: {
          created_at: string
          custo: Json | null
          destino_id: string
          id: string
          lat: number | null
          lng: number | null
          melhor_horario: string | null
          mencoes: number
          nome: string
          nome_chave: string
          reservar_antes: boolean | null
          resumo: string
          status: string
          tags: string[]
          tempo_visita_min: number | null
          tipo: string
          updated_at: string
          veredito: string
        }
        Insert: {
          created_at?: string
          custo?: Json | null
          destino_id: string
          id?: string
          lat?: number | null
          lng?: number | null
          melhor_horario?: string | null
          mencoes?: number
          nome: string
          nome_chave: string
          reservar_antes?: boolean | null
          resumo: string
          status?: string
          tags?: string[]
          tempo_visita_min?: number | null
          tipo: string
          updated_at?: string
          veredito?: string
        }
        Update: {
          created_at?: string
          custo?: Json | null
          destino_id?: string
          id?: string
          lat?: number | null
          lng?: number | null
          melhor_horario?: string | null
          mencoes?: number
          nome?: string
          nome_chave?: string
          reservar_antes?: boolean | null
          resumo?: string
          status?: string
          tags?: string[]
          tempo_visita_min?: number | null
          tipo?: string
          updated_at?: string
          veredito?: string
        }
        Relationships: [
          {
            foreignKeyName: "lugares_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "destinos"
            referencedColumns: ["id"]
          },
        ]
      }
      roteiro_base_dias: {
        Row: {
          atividades: string[]
          cidade: string
          deslocamento: Json | null
          destino_id: string | null
          dia: number
          id: string
          obs: string | null
          pernoite: string | null
          roteiro_id: string
        }
        Insert: {
          atividades?: string[]
          cidade: string
          deslocamento?: Json | null
          destino_id?: string | null
          dia: number
          id?: string
          obs?: string | null
          pernoite?: string | null
          roteiro_id: string
        }
        Update: {
          atividades?: string[]
          cidade?: string
          deslocamento?: Json | null
          destino_id?: string | null
          dia?: number
          id?: string
          obs?: string | null
          pernoite?: string | null
          roteiro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roteiro_base_dias_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "destinos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roteiro_base_dias_roteiro_id_fkey"
            columns: ["roteiro_id"]
            isOneToOne: false
            referencedRelation: "roteiros_base"
            referencedColumns: ["id"]
          },
        ]
      }
      roteiros_base: {
        Row: {
          assinado: boolean
          autoria: string
          created_at: string
          duracao_dias: number
          epoca: string | null
          essencia: string[]
          fonte_id: string | null
          id: string
          paises: string[]
          resumo: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          assinado?: boolean
          autoria: string
          created_at?: string
          duracao_dias: number
          epoca?: string | null
          essencia?: string[]
          fonte_id?: string | null
          id?: string
          paises?: string[]
          resumo?: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          assinado?: boolean
          autoria?: string
          created_at?: string
          duracao_dias?: number
          epoca?: string | null
          essencia?: string[]
          fonte_id?: string | null
          id?: string
          paises?: string[]
          resumo?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roteiros_base_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes"
            referencedColumns: ["id"]
          },
        ]
      }
      trechos: {
        Row: {
          created_at: string
          custo: Json | null
          destino_id: string
          duracao_min: number | null
          id: string
          meio: string
          mencoes: number
          obs: string | null
          operador: string | null
          origem_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo?: Json | null
          destino_id: string
          duracao_min?: number | null
          id?: string
          meio: string
          mencoes?: number
          obs?: string | null
          operador?: string | null
          origem_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo?: Json | null
          destino_id?: string
          duracao_min?: number | null
          id?: string
          meio?: string
          mencoes?: number
          obs?: string | null
          operador?: string | null
          origem_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trechos_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "destinos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trechos_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "destinos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          chave: string
          descricao: string | null
          updated_at: string
          valor: Json
        }
        Insert: {
          chave: string
          descricao?: string | null
          updated_at?: string
          valor: Json
        }
        Update: {
          chave?: string
          descricao?: string | null
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      eventos_uso: {
        Row: {
          created_at: string
          custo_brl: number
          custo_usd: number
          id: string
          input_tokens: number
          itinerary_id: string | null
          meta: Json
          modelo: string | null
          output_tokens: number
          produto: string | null
          provedor: string | null
          sucesso: boolean
          tipo: string
          trip_request_id: string | null
          unidades: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          custo_brl?: number
          custo_usd?: number
          id?: string
          input_tokens?: number
          itinerary_id?: string | null
          meta?: Json
          modelo?: string | null
          output_tokens?: number
          produto?: string | null
          provedor?: string | null
          sucesso?: boolean
          tipo: string
          trip_request_id?: string | null
          unidades?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          custo_brl?: number
          custo_usd?: number
          id?: string
          input_tokens?: number
          itinerary_id?: string | null
          meta?: Json
          modelo?: string | null
          output_tokens?: number
          produto?: string | null
          provedor?: string | null
          sucesso?: boolean
          tipo?: string
          trip_request_id?: string | null
          unidades?: number
          user_id?: string | null
        }
        Relationships: []
      }
      organizacao_membros: {
        Row: {
          created_at: string
          organizacao_id: string
          papel: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organizacao_id: string
          papel?: string
          user_id: string
        }
        Update: {
          created_at?: string
          organizacao_id?: string
          papel?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizacao_membros_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          contato: Json
          cor: string
          created_at: string
          criado_por: string | null
          id: string
          logo_path: string | null
          nome: string
          plano: string | null
          plano_ativo_ate: string | null
          updated_at: string
        }
        Insert: {
          contato?: Json
          cor?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          logo_path?: string | null
          nome: string
          plano?: string | null
          plano_ativo_ate?: string | null
          updated_at?: string
        }
        Update: {
          contato?: Json
          cor?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          logo_path?: string | null
          nome?: string
          plano?: string | null
          plano_ativo_ate?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          atual_ate: string | null
          created_at: string
          criado_por: string | null
          id: string
          organizacao_id: string
          plano: string
          provedor: string
          provedor_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          atual_ate?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          organizacao_id: string
          plano: string
          provedor?: string
          provedor_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          atual_ate?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          organizacao_id?: string
          plano?: string
          provedor?: string
          provedor_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      consultorias: {
        Row: {
          briefing: Json | null
          created_at: string
          id: string
          notas: string | null
          pedido_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          briefing?: Json | null
          created_at?: string
          id?: string
          notas?: string | null
          pedido_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          briefing?: Json | null
          created_at?: string
          id?: string
          notas?: string | null
          pedido_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creditos: {
        Row: {
          created_at: string
          id: string
          lote_id: string | null
          motivo: string
          organizacao_id: string | null
          pedido_id: string | null
          quantidade: number
          tipo: string
          trip_request_id: string | null
          user_id: string | null
          valido_ate: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lote_id?: string | null
          motivo: string
          organizacao_id?: string | null
          pedido_id?: string | null
          quantidade: number
          tipo: string
          trip_request_id?: string | null
          user_id?: string | null
          valido_ate?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lote_id?: string | null
          motivo?: string
          organizacao_id?: string | null
          pedido_id?: string | null
          quantidade?: number
          tipo?: string
          trip_request_id?: string | null
          user_id?: string | null
          valido_ate?: string | null
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          created_at: string
          id: string
          metodo: string | null
          organizacao_id: string | null
          pago_em: string | null
          produto: string
          provedor: string
          provedor_id: string | null
          referencia: Json
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          metodo?: string | null
          organizacao_id?: string | null
          pago_em?: string | null
          produto: string
          provedor?: string
          provedor_id?: string | null
          referencia?: Json
          status?: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          id?: string
          metodo?: string | null
          organizacao_id?: string | null
          pago_em?: string | null
          produto?: string
          provedor?: string
          provedor_id?: string | null
          referencia?: Json
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      webhooks_recebidos: {
        Row: {
          chave: string
          created_at: string
        }
        Insert: {
          chave: string
          created_at?: string
        }
        Update: {
          chave?: string
          created_at?: string
        }
        Relationships: []
      }
      chamados: {
        Row: { id: string; user_id: string; assunto: string; categoria: string; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; assunto: string; categoria?: string; status?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; assunto?: string; categoria?: string; status?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      chamado_mensagens: {
        Row: { id: string; chamado_id: string; autor: string; autor_id: string | null; texto: string; created_at: string }
        Insert: { id?: string; chamado_id: string; autor: string; autor_id?: string | null; texto: string; created_at?: string }
        Update: { id?: string; chamado_id?: string; autor?: string; autor_id?: string | null; texto?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: "chamado_mensagens_chamado_id_fkey"; columns: ["chamado_id"]; isOneToOne: false; referencedRelation: "chamados"; referencedColumns: ["id"] },
        ]
      }
      cotacoes: {
        Row: { chave: string; tipo: string; provedor: string; consulta: Json; resultado: Json; cotado_em: string; expira_em: string }
        Insert: { chave: string; tipo: string; provedor: string; consulta: Json; resultado: Json; cotado_em?: string; expira_em: string }
        Update: { chave?: string; tipo?: string; provedor?: string; consulta?: Json; resultado?: Json; cotado_em?: string; expira_em?: string }
        Relationships: []
      }
      estudo_rotas: {
        Row: {
          id: string; rodada: string; rota: number; provedor: string; variante: string; origem: string; destino: string
          ida: string; volta: string | null; encontrou: boolean; ofertas: number; preco_brl: number | null
          latencia_ms: number | null; erro: string | null; detalhe: Json | null; created_at: string
        }
        Insert: {
          id?: string; rodada: string; rota: number; provedor: string; variante: string; origem: string; destino: string
          ida: string; volta?: string | null; encontrou: boolean; ofertas?: number; preco_brl?: number | null
          latencia_ms?: number | null; erro?: string | null; detalhe?: Json | null; created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["estudo_rotas"]["Insert"]>
        Relationships: []
      }
      generated_itineraries: {
        Row: {
          adjustment_request: string | null
          kb_refs: Json
          checklist_state: Json
          extras: Json | null
          created_at: string
          id: string
          input_tokens: number | null
          itinerary: Json
          latency_ms: number | null
          model: string
          output_tokens: number | null
          title: string
          trip_request_id: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          adjustment_request?: string | null
          kb_refs?: Json
          checklist_state?: Json
          extras?: Json | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          itinerary: Json
          latency_ms?: number | null
          model: string
          output_tokens?: number | null
          title: string
          trip_request_id: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          adjustment_request?: string | null
          kb_refs?: Json
          checklist_state?: Json
          extras?: Json | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          itinerary?: Json
          latency_ms?: number | null
          model?: string
          output_tokens?: number | null
          title?: string
          trip_request_id?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_itineraries_trip_request_id_fkey"
            columns: ["trip_request_id"]
            isOneToOne: false
            referencedRelation: "trip_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trip_requests: {
        Row: {
          adults: number
          base_itinerary_id: string | null
          budget_level: string | null
          children: number
          interests: string[]
          product: string
          regions: string[]
          accepts_alternate_airports: boolean
          avoided_places: string[]
          created_at: string
          desired_places: string[]
          end_date: string
          error_message: string | null
          flex_days_outbound: number
          flex_days_return: number
          highlight: string
          id: string
          notes: string
          origin_city: string
          pace: string
          start_date: string
          status: string
          subregion: string | null
          total_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adults?: number
          base_itinerary_id?: string | null
          budget_level?: string | null
          children?: number
          interests?: string[]
          product?: string
          regions?: string[]
          accepts_alternate_airports?: boolean
          avoided_places?: string[]
          created_at?: string
          desired_places?: string[]
          end_date: string
          error_message?: string | null
          flex_days_outbound?: number
          flex_days_return?: number
          highlight: string
          id?: string
          notes?: string
          origin_city: string
          pace: string
          start_date: string
          status?: string
          subregion?: string | null
          total_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          adults?: number
          base_itinerary_id?: string | null
          budget_level?: string | null
          children?: number
          interests?: string[]
          product?: string
          regions?: string[]
          accepts_alternate_airports?: boolean
          avoided_places?: string[]
          created_at?: string
          desired_places?: string[]
          end_date?: string
          error_message?: string | null
          flex_days_outbound?: number
          flex_days_return?: number
          highlight?: string
          id?: string
          notes?: string
          origin_city?: string
          pace?: string
          start_date?: string
          status?: string
          subregion?: string | null
          total_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      creditos_lotes: {
        Row: {
          created_at: string | null
          id: string | null
          organizacao_id: string | null
          restante: number | null
          tipo: string | null
          user_id: string | null
          valido_ate: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      buscar_conhecimento: {
        Args: { p_embedding: string; p_limite?: number; p_paises?: string[] }
        Returns: {
          pais_codigo: string
          registro_id: string
          registro_tipo: string
          similaridade: number
          texto: string
        }[]
      }
      catalogo_roteiros_assinados: {
        Args: never
        Returns: {
          cidades: string[]
          duracao_dias: number
          epoca: string | null
          essencia: string[]
          id: string
          paises: string[]
          resumo: string
          titulo: string
        }[]
      }
      adicionar_membro: { Args: { p_email: string }; Returns: string }
      consumir_credito: {
        Args: { p_motivo: string; p_organizacao_id: string | null; p_tipos: string[]; p_trip_request_id: string | null; p_user_id: string }
        Returns: string | null
      }
      criar_organizacao: { Args: { p_nome: string }; Returns: string }
      generations_last_24h: { Args: { p_user_id: string }; Returns: number }
      minha_organizacao: { Args: never; Returns: string }
      sou_dono_da_organizacao: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
