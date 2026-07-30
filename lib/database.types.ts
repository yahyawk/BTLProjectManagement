/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Regenerate whenever a migration lands:
 *   supabase gen types typescript --project-id mtggcklxmuquimfipzic > lib/database.types.ts
 * (or via the Supabase MCP `generate_typescript_types` tool)
 */
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
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'labels_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          timezone: string
          updated_at: string
          weekly_capacity_hours: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          job_title?: string | null
          timezone?: string
          updated_at?: string
          weekly_capacity_hours?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          timezone?: string
          updated_at?: string
          weekly_capacity_hours?: number
        }
        Relationships: []
      }
      project_members: {
        Row: {
          project_id: string
          role: Database['public']['Enums']['member_role']
          user_id: string
        }
        Insert: {
          project_id: string
          role?: Database['public']['Enums']['member_role']
          user_id: string
        }
        Update: {
          project_id?: string
          role?: Database['public']['Enums']['member_role']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          key: string
          lead_id: string | null
          name: string
          start_date: string | null
          state: Database['public']['Enums']['project_state']
          target_date: string | null
          task_counter: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key: string
          lead_id?: string | null
          name: string
          start_date?: string | null
          state?: Database['public']['Enums']['project_state']
          target_date?: string | null
          task_counter?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key?: string
          lead_id?: string | null
          name?: string
          start_date?: string | null
          state?: Database['public']['Enums']['project_state']
          target_date?: string | null
          task_counter?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      recurrence_templates: {
        Row: {
          bymonthday: number | null
          byweekday: number[] | null
          created_at: string
          created_by: string | null
          default_assignee_id: string | null
          description: string | null
          end_date: string | null
          estimate_hours: number | null
          frequency: Database['public']['Enums']['recurrence_freq']
          id: string
          interval_count: number
          is_active: boolean
          lead_time_days: number
          next_run_at: string
          priority: Database['public']['Enums']['priority_level']
          project_id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          bymonthday?: number | null
          byweekday?: number[] | null
          created_at?: string
          created_by?: string | null
          default_assignee_id?: string | null
          description?: string | null
          end_date?: string | null
          estimate_hours?: number | null
          frequency: Database['public']['Enums']['recurrence_freq']
          id?: string
          interval_count?: number
          is_active?: boolean
          lead_time_days?: number
          next_run_at: string
          priority?: Database['public']['Enums']['priority_level']
          project_id: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          bymonthday?: number | null
          byweekday?: number[] | null
          created_at?: string
          created_by?: string | null
          default_assignee_id?: string | null
          description?: string | null
          end_date?: string | null
          estimate_hours?: number | null
          frequency?: Database['public']['Enums']['recurrence_freq']
          id?: string
          interval_count?: number
          is_active?: boolean
          lead_time_days?: number
          next_run_at?: string
          priority?: Database['public']['Enums']['priority_level']
          project_id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recurrence_templates_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recurrence_templates_default_assignee_id_fkey'
            columns: ['default_assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recurrence_templates_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      task_activity: {
        Row: {
          actor_id: string | null
          created_at: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_activity_actor_id_fkey'
            columns: ['actor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_activity_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_activity_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'v_task_load'
            referencedColumns: ['task_id']
          },
        ]
      }
      task_checklist_items: {
        Row: {
          content: string
          created_at: string
          id: string
          is_done: boolean
          position: number
          task_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_done?: boolean
          position?: number
          task_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_done?: boolean
          position?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_checklist_items_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_checklist_items_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'v_task_load'
            referencedColumns: ['task_id']
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_comments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_comments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'v_task_load'
            referencedColumns: ['task_id']
          },
        ]
      }
      task_labels: {
        Row: {
          label_id: string
          task_id: string
        }
        Insert: {
          label_id: string
          task_id: string
        }
        Update: {
          label_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_labels_label_id_fkey'
            columns: ['label_id']
            isOneToOne: false
            referencedRelation: 'labels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_labels_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_labels_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'v_task_load'
            referencedColumns: ['task_id']
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          estimate_hours: number | null
          id: string
          is_archived: boolean
          parent_task_id: string | null
          position: number
          priority: Database['public']['Enums']['priority_level']
          project_id: string
          recurrence_template_id: string | null
          ref: string
          reporter_id: string | null
          requested_by: string | null
          source_note: string | null
          start_date: string | null
          status_id: string
          story_points: number | null
          title: string
          updated_at: string
          work_type: Database['public']['Enums']['work_type']
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimate_hours?: number | null
          id?: string
          is_archived?: boolean
          parent_task_id?: string | null
          position?: number
          priority?: Database['public']['Enums']['priority_level']
          project_id: string
          recurrence_template_id?: string | null
          ref: string
          reporter_id?: string | null
          requested_by?: string | null
          source_note?: string | null
          start_date?: string | null
          status_id: string
          story_points?: number | null
          title: string
          updated_at?: string
          work_type: Database['public']['Enums']['work_type']
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimate_hours?: number | null
          id?: string
          is_archived?: boolean
          parent_task_id?: string | null
          position?: number
          priority?: Database['public']['Enums']['priority_level']
          project_id?: string
          recurrence_template_id?: string | null
          ref?: string
          reporter_id?: string | null
          requested_by?: string | null
          source_note?: string | null
          start_date?: string | null
          status_id?: string
          story_points?: number | null
          title?: string
          updated_at?: string
          work_type?: Database['public']['Enums']['work_type']
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_parent_task_id_fkey'
            columns: ['parent_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_parent_task_id_fkey'
            columns: ['parent_task_id']
            isOneToOne: false
            referencedRelation: 'v_task_load'
            referencedColumns: ['task_id']
          },
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_recurrence_template_id_fkey'
            columns: ['recurrence_template_id']
            isOneToOne: false
            referencedRelation: 'recurrence_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_status_id_fkey'
            columns: ['status_id']
            isOneToOne: false
            referencedRelation: 'workflow_statuses'
            referencedColumns: ['id']
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          entry_date: string
          hours: number
          id: string
          note: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          hours: number
          id?: string
          note?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          hours?: number
          id?: string
          note?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'time_entries_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'v_task_load'
            referencedColumns: ['task_id']
          },
          {
            foreignKeyName: 'time_entries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      workflow_statuses: {
        Row: {
          category: Database['public']['Enums']['status_category']
          color: string
          created_at: string
          id: string
          name: string
          position: number
          project_id: string
          wip_limit: number | null
        }
        Insert: {
          category: Database['public']['Enums']['status_category']
          color?: string
          created_at?: string
          id?: string
          name: string
          position?: number
          project_id: string
          wip_limit?: number | null
        }
        Update: {
          category?: Database['public']['Enums']['status_category']
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          project_id?: string
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_statuses_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      workspace_members: {
        Row: {
          joined_at: string
          role: Database['public']['Enums']['member_role']
          user_id: string
          workspace_id: string
        }
        Insert: {
          joined_at?: string
          role?: Database['public']['Enums']['member_role']
          user_id: string
          workspace_id: string
        }
        Update: {
          joined_at?: string
          role?: Database['public']['Enums']['member_role']
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspace_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workspaces_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_adhoc_ratio_weekly: {
        Row: {
          adhoc_created: number | null
          adhoc_pct: number | null
          project_id: string | null
          tasks_created: number | null
          week_start: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'projects_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      v_task_load: {
        Row: {
          assignee_id: string | null
          estimate_hours: number | null
          priority: Database['public']['Enums']['priority_level'] | null
          project_id: string | null
          task_id: string | null
          week_start: string | null
          work_type: Database['public']['Enums']['work_type'] | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'projects_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      v_workload_weekly: {
        Row: {
          adhoc_hours: number | null
          adhoc_task_count: number | null
          assignee_id: string | null
          capacity_hours: number | null
          full_name: string | null
          planned_hours: number | null
          recurring_hours: number | null
          task_count: number | null
          utilization_pct: number | null
          week_start: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'projects_workspace_id_fkey'
            columns: ['workspace_id']
            isOneToOne: false
            referencedRelation: 'workspaces'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      can_access_project: { Args: { p_id: string }; Returns: boolean }
      can_access_task: { Args: { t_id: string }; Returns: boolean }
      has_workspace_role: {
        Args: {
          roles: Database['public']['Enums']['member_role'][]
          ws_id: string
        }
        Returns: boolean
      }
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean }
    }
    Enums: {
      member_role: 'owner' | 'admin' | 'member' | 'viewer'
      priority_level: 'urgent' | 'high' | 'medium' | 'low'
      project_state: 'active' | 'on_hold' | 'completed' | 'archived'
      recurrence_freq: 'daily' | 'weekly' | 'monthly' | 'quarterly'
      status_category: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled'
      work_type: 'recurring' | 'adhoc'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      member_role: ['owner', 'admin', 'member', 'viewer'],
      priority_level: ['urgent', 'high', 'medium', 'low'],
      project_state: ['active', 'on_hold', 'completed', 'archived'],
      recurrence_freq: ['daily', 'weekly', 'monthly', 'quarterly'],
      status_category: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'],
      work_type: ['recurring', 'adhoc'],
    },
  },
} as const
